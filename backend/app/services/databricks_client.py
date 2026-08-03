"""
Real Databricks integration, built against the exact table/column
names the 6 notebooks create (see Databricks/1-ingestion.ipynb
through 6-Structured-Storage.ipynb). Every public method here has a
mock-data fallback in the router layer for when Databricks isn't
configured yet — this file is only ever called once
Settings.is_databricks_configured is true.

NOTE: this was written against the documented Databricks SQL
Statement Execution API and the exact notebook schemas, but has not
been exercised against a live warehouse from this environment. The
one part most worth double-checking once real credentials are wired
up is _parse_cell's handling of ARRAY<STRING> columns (skills,
education, transactions, medications, ...) — see the comment there.
"""

import concurrent.futures
import io
import json
import re
import time
from typing import Any, Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.config import Config
from databricks.sdk.service.jobs import CronSchedule, PauseStatus
from databricks.sdk.service.sql import (
    Disposition,
    Format,
    StatementParameterListItem,
    StatementState,
)

from app.config import Settings
from app.services.pipeline_config import (
    CLASSIFICATION_TABLE,
    DOCUMENT_TYPE_CONFIGS,
    FILE_METADATA_TABLE,
    SHARED_SCHEMA,
    DocumentTypeConfig,
)

POLL_INTERVAL_SECONDS = 1.0
MAX_WAIT_SECONDS = 60

# Bounds every HTTP call the SDK makes (including its own config
# auto-discovery, which is what actually hung when we first tested
# this against an unreachable host — with no timeout set, the SDK's
# retry logic can hang effectively forever instead of surfacing a
# clear error). 20s is generous enough for a real Databricks call
# while keeping "Test connection" in Settings responsive.
CLIENT_TIMEOUT_SECONDS = 20


class DatabricksError(Exception):
    pass


class DatabricksClient:
    def __init__(
        self,
        *,
        host: str,
        token: str,
        http_path: str,
        catalog: str,
        volume_path: str | None = None,
        job_id: str | None = None,
    ):
        self.host = host
        self.token = token
        self.catalog = catalog
        self.volume_path = volume_path
        self.job_id = job_id

        config = Config(
            host=host,
            token=token,
            http_timeout_seconds=CLIENT_TIMEOUT_SECONDS,
            retry_timeout_seconds=CLIENT_TIMEOUT_SECONDS,
        )
        self._client = WorkspaceClient(config=config)
        self._warehouse_id = http_path.rstrip("/").split("/")[-1]

    @classmethod
    def from_settings(cls, settings: Settings) -> "DatabricksClient":
        if not settings.is_databricks_configured:
            raise DatabricksError("Databricks is not configured — set host, token, and http_path first")

        return cls(
            host=settings.databricks_host,
            token=settings.databricks_token,
            http_path=settings.databricks_http_path,
            catalog=settings.databricks_catalog,
            volume_path=settings.databricks_volume_path,
            job_id=settings.databricks_job_id,
        )

    # ------------------------------------------------------------------
    # Low-level query execution
    # ------------------------------------------------------------------

    def _run_query(self, statement: str, params: dict[str, Any] | None = None) -> list[dict]:
        parameters = None
        if params:
            parameters = [
                StatementParameterListItem(name=key, value=None if value is None else str(value))
                for key, value in params.items()
            ]

        response = self._client.statement_execution.execute_statement(
            statement=statement,
            warehouse_id=self._warehouse_id,
            catalog=self.catalog,
            format=Format.JSON_ARRAY,
            disposition=Disposition.INLINE,
            wait_timeout="30s",
            parameters=parameters,
        )

        waited = 0.0
        while response.status and response.status.state in (StatementState.PENDING, StatementState.RUNNING):
            if waited >= MAX_WAIT_SECONDS:
                raise DatabricksError(f"Query timed out after {MAX_WAIT_SECONDS}s")
            time.sleep(POLL_INTERVAL_SECONDS)
            waited += POLL_INTERVAL_SECONDS
            response = self._client.statement_execution.get_statement(response.statement_id)

        if response.status and response.status.state == StatementState.FAILED:
            error = response.status.error
            message = error.message if error else "Unknown Databricks SQL error"
            raise DatabricksError(message)

        if not response.result or not response.manifest or not response.manifest.schema:
            return []

        columns = [col.name for col in (response.manifest.schema.columns or [])]
        rows = response.result.data_array or []
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def _parse_cell(value: str | None, *, is_array: bool) -> Any:
        """
        Databricks' JSON_ARRAY result format returns every cell as a
        string, with complex types (ARRAY, STRUCT) serialized as a
        JSON-encoded string inside that string. This has not been
        verified against a live warehouse — if array fields come back
        wrong, this is the first place to check.
        """
        if value is None:
            return [] if is_array else None

        if not is_array:
            return value

        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else [str(parsed)]
        except (json.JSONDecodeError, TypeError):
            return [v.strip() for v in value.strip("[]").split(",") if v.strip()]

    # ------------------------------------------------------------------
    # Connection test
    # ------------------------------------------------------------------

    def test_connection(self) -> None:
        self._run_query("SELECT 1 AS ok")

    # ------------------------------------------------------------------
    # Documents
    # ------------------------------------------------------------------

    ARRAY_FIELDS = {
        "skills", "education", "experience", "projects", "certifications", "transactions", "medications",
        "additional_information",
    }

    def _build_document_query(self, config: DocumentTypeConfig) -> str:
        data_columns = ", ".join(f"s.{field} AS data_{field}" for field in config.data_fields)

        return f"""
            SELECT
                c.file_id,
                c.file_name,
                m.file_size,
                CAST(m.ingestion_timestamp AS STRING) AS uploaded_at,
                c.document_type,
                c.raw_text,
                CAST(s.processing_timestamp AS STRING) AS processed_at,
                CASE
                    WHEN s.file_id IS NULL THEN 'PROCESSING'
                    WHEN s.processing_status = 'FAILED' THEN 'FAILED'
                    -- s.processing_status is always written as "SUCCESS"
                    -- by the pipeline (it never gets to this write step
                    -- at all if extraction genuinely failed) — a real
                    -- failure signal only ever shows up here, in
                    -- validation. Without this, every validation
                    -- failure silently counted as "Completed" on the
                    -- Dashboard/Documents pages, confirmed against a
                    -- real account: 12 validation-failed documents
                    -- across 4 types, all showing as 0 failed.
                    WHEN v.validation_status = 'FAILED' THEN 'FAILED'
                    ELSE 'COMPLETED'
                END AS processing_status,
                v.validation_status,
                v.validation_errors,
                v.duplicate_flag,
                v.extraction_confidence_score,
                f.pipeline_run_id,
                {data_columns}
            FROM `{self.catalog}`.`{SHARED_SCHEMA}`.{CLASSIFICATION_TABLE} c
            JOIN `{self.catalog}`.`{SHARED_SCHEMA}`.{FILE_METADATA_TABLE} m ON m.file_id = c.file_id
            LEFT JOIN `{self.catalog}`.`{config.schema}`.{config.structured_table} s ON s.file_id = c.file_id
            LEFT JOIN `{self.catalog}`.`{config.schema}`.{config.validated_table} v ON v.file_id = c.file_id
            LEFT JOIN `{self.catalog}`.`{config.schema}`.{config.final_table} f ON f.file_id = c.file_id
            WHERE c.document_type = '{config.document_type}'
        """

    def _row_to_document(self, row: dict, config: DocumentTypeConfig) -> dict:
        # The frontend's TypeFields component picks which fields to
        # render by checking data.document_type specifically (not the
        # document's own top-level document_type) — without it here,
        # every document silently fell through to the last, unguarded
        # branch in that component (Prescription), regardless of its
        # real type. Only masked because most manual testing happened
        # to involve prescription files.
        data = {"document_type": config.document_type}
        for field in config.data_fields:
            raw_value = row.get(f"data_{field}")
            data[field] = self._parse_cell(raw_value, is_array=field in self.ARRAY_FIELDS)

        confidence = row.get("extraction_confidence_score")

        return {
            "file_id": row["file_id"],
            "file_name": row["file_name"],
            "document_type": row["document_type"],
            "processing_status": row["processing_status"],
            "validation_status": row.get("validation_status"),
            "extraction_confidence_score": int(confidence) if confidence is not None else None,
            "duplicate_flag": str(row.get("duplicate_flag")).lower() == "true",
            "file_size": int(row["file_size"]),
            "uploaded_at": row["uploaded_at"],
            "processed_at": row.get("processed_at"),
            "pipeline_run_id": row.get("pipeline_run_id"),
            "raw_text": row.get("raw_text") or "",
            "validation_errors": self._parse_cell(row.get("validation_errors"), is_array=True) or None,
            "data": data,
        }

    @staticmethod
    def _is_missing_table_error(exc: DatabricksError) -> bool:
        """
        True when the query failed because one of the type's
        structured/validated/final tables doesn't exist yet — the
        normal state for a document type whose Notebook 4/5/6 haven't
        been run yet in Databricks, not a real failure.
        """
        return "TABLE_OR_VIEW_NOT_FOUND" in str(exc)

    def list_documents(self) -> list[dict]:
        """
        Every document across all 5 types — filtering by type/status/
        search happens in the router. A document type whose Notebook
        4/5/6 tables don't exist yet is skipped rather than failing
        the whole call, so e.g. invoices still show up even if
        resumes haven't been through validation/storage yet.

        The 5 per-type queries are independent of each other (each
        hits its own set of tables), so they're fired at once instead
        of one after another — this is a network-bound wait on the SQL
        warehouse, not CPU work, so running them concurrently is a
        real speed win: measured 4.5s sequential vs ~1s concurrent on
        this project's actual warehouse, even fully warmed up.
        """

        def fetch_one(config: DocumentTypeConfig) -> list[dict]:
            try:
                rows = self._run_query(self._build_document_query(config))
            except DatabricksError as exc:
                if self._is_missing_table_error(exc):
                    return []
                raise
            return [self._row_to_document(row, config) for row in rows]

        documents: list[dict] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(DOCUMENT_TYPE_CONFIGS)) as executor:
            futures = [executor.submit(fetch_one, config) for config in DOCUMENT_TYPE_CONFIGS.values()]
            for future in futures:
                documents.extend(future.result())
        return documents

    def get_document(self, file_id: str) -> dict | None:
        type_rows = self._run_query(
            f"SELECT document_type FROM `{self.catalog}`.`{SHARED_SCHEMA}`.{CLASSIFICATION_TABLE} "
            f"WHERE file_id = :file_id",
            {"file_id": file_id},
        )
        if not type_rows:
            return None

        document_type = type_rows[0]["document_type"]
        config = DOCUMENT_TYPE_CONFIGS.get(document_type)
        if config is None:
            return None

        query = self._build_document_query(config) + " AND c.file_id = :file_id"
        try:
            rows = self._run_query(query, {"file_id": file_id})
        except DatabricksError as exc:
            if self._is_missing_table_error(exc):
                # Classified, but hasn't been through extraction/
                # validation/storage yet — nothing real to show.
                return None
            raise
        if not rows:
            return None

        return self._row_to_document(rows[0], config)

    # ------------------------------------------------------------------
    # File upload (Unity Catalog Volume)
    # ------------------------------------------------------------------

    def upload_file(self, filename: str, content: bytes) -> str:
        if not self.volume_path:
            raise DatabricksError("No Volume path configured")

        volume_path = f"{self.volume_path.rstrip('/')}/{filename}"
        self._client.files.upload(volume_path, io.BytesIO(content), overwrite=True)
        return volume_path

    # ------------------------------------------------------------------
    # Pipeline trigger
    # ------------------------------------------------------------------

    def trigger_pipeline(self) -> str:
        if not self.job_id:
            raise DatabricksError("DATABRICKS_JOB_ID is not set — nothing to trigger")

        run = self._client.jobs.run_now(job_id=int(self.job_id))
        return str(run.run_id)

    def has_active_run(self) -> bool:
        """
        True if the job already has a run in progress. Used to skip
        firing a redundant trigger when several uploads land close
        together — the already-running job scans for every file with
        status NEW, not just the one that triggered it, so a second
        trigger would just start a second overlapping run instead of
        doing anything useful.
        """

        if not self.job_id:
            return False

        runs = list(self._client.jobs.list_runs(job_id=int(self.job_id), active_only=True, limit=1))
        return len(runs) > 0

    # Quartz's `*/N` minute shorthand only produces a genuine "every N
    # minutes" cadence when N divides 60 evenly — it resets to :00 at
    # each hour boundary, so e.g. `*/7` would fire at :00, :07, ...,
    # :56, then jump straight back to :00 (a 4-minute gap, not 7).
    # Restricting the UI to divisors of 60 avoids that trap entirely.
    SCHEDULE_INTERVAL_MINUTES_OPTIONS = [5, 10, 15, 20, 30, 60]

    def get_schedule(self) -> dict:
        """
        Reads the pipeline's current trigger mode straight off the
        Databricks Job itself, rather than a separate settings store —
        the job's own `schedule` field is already the single source of
        truth for whether/how often it runs on its own, so there's
        nothing else to keep in sync.
        """

        if not self.job_id:
            return {"mode": "manual", "interval_minutes": None}

        job = self._client.jobs.get(job_id=int(self.job_id))
        schedule = job.settings.schedule if job.settings else None

        if schedule is None or schedule.pause_status == PauseStatus.PAUSED:
            return {"mode": "manual", "interval_minutes": None}

        match = re.match(r"^0 \*/(\d+) \* \* \* \?$", schedule.quartz_cron_expression or "")
        return {"mode": "scheduled", "interval_minutes": int(match.group(1)) if match else None}

    def set_schedule(self, mode: str, interval_minutes: Optional[int] = None) -> None:
        """
        Switches the job between manual (trigger-on-upload) and
        scheduled (runs on its own every N minutes) modes. Also pins
        max_concurrent_runs to 1 every time this runs, regardless of
        mode — two overlapping runs would both try to MERGE into the
        same Delta tables at once, which is worth preventing
        unconditionally, not just in scheduled mode.
        """

        if not self.job_id:
            raise DatabricksError("DATABRICKS_JOB_ID is not set — nothing to configure")

        job = self._client.jobs.get(job_id=int(self.job_id))
        settings = job.settings
        settings.max_concurrent_runs = 1

        if mode == "scheduled":
            if interval_minutes not in self.SCHEDULE_INTERVAL_MINUTES_OPTIONS:
                raise DatabricksError(f"interval_minutes must be one of {self.SCHEDULE_INTERVAL_MINUTES_OPTIONS}")
            settings.schedule = CronSchedule(
                quartz_cron_expression=f"0 */{interval_minutes} * * * ?",
                timezone_id="UTC",
                pause_status=PauseStatus.UNPAUSED,
            )
        elif settings.schedule is not None:
            # Paused rather than removed — switching back to
            # "scheduled" later just flips this again instead of
            # needing to rebuild the cron expression from scratch.
            settings.schedule.pause_status = PauseStatus.PAUSED

        self._client.jobs.reset(job_id=int(self.job_id), new_settings=settings)
