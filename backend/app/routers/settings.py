from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.dependencies import require_admin
from app.schemas.settings import (
    DatabricksConnectionRequest,
    DatabricksConnectionResult,
    PipelineScheduleInfo,
    PipelineScheduleRequest,
    RunPipelineResult,
)
from app.services.databricks_client import DatabricksClient, DatabricksError

# Admin-only, the whole router — this is shared platform configuration
# (which Databricks workspace/warehouse everyone's requests hit), not
# a per-user setting, so a regular signed-up account shouldn't be able
# to view or change it.
router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_admin)])

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

ENV_KEYS = {
    "workspace_url": "DATABRICKS_HOST",
    "http_path": "DATABRICKS_HTTP_PATH",
    "token": "DATABRICKS_TOKEN",
    "catalog": "DATABRICKS_CATALOG",
}


def _write_env_values(values: dict[str, str]) -> None:
    """
    Upserts key=value lines into the backend's .env file, preserving
    everything else already in it. Config.py reads this file via
    pydantic-settings, so the next get_settings() call (after the
    cache is cleared below) immediately picks up the new values — no
    server restart needed.
    """

    existing_lines: list[str] = []
    if ENV_FILE.exists():
        existing_lines = ENV_FILE.read_text().splitlines()

    remaining_keys = dict(values)
    updated_lines = []
    for line in existing_lines:
        key = line.split("=", 1)[0].strip() if "=" in line else None
        if key in remaining_keys:
            updated_lines.append(f"{key}={remaining_keys.pop(key)}")
        else:
            updated_lines.append(line)

    for key, value in remaining_keys.items():
        updated_lines.append(f"{key}={value}")

    ENV_FILE.write_text("\n".join(updated_lines) + "\n")
    get_settings.cache_clear()


@router.post("/databricks/test", response_model=DatabricksConnectionResult)
def test_databricks_connection(payload: DatabricksConnectionRequest):
    try:
        client = DatabricksClient(
            host=payload.workspace_url,
            token=payload.token,
            http_path=payload.http_path,
            catalog=payload.catalog,
        )
        client.test_connection()
    except DatabricksError as exc:
        return DatabricksConnectionResult(connected=False, message=str(exc))
    except Exception as exc:  # noqa: BLE001 — surface any SDK/network error as a readable message
        return DatabricksConnectionResult(connected=False, message=f"Connection failed: {exc}")

    return DatabricksConnectionResult(connected=True, message="Connected successfully", catalog=payload.catalog)


@router.post("/databricks", response_model=DatabricksConnectionResult, status_code=status.HTTP_200_OK)
def save_databricks_connection(payload: DatabricksConnectionRequest):
    _write_env_values(
        {
            ENV_KEYS["workspace_url"]: payload.workspace_url,
            ENV_KEYS["http_path"]: payload.http_path,
            ENV_KEYS["token"]: payload.token,
            ENV_KEYS["catalog"]: payload.catalog,
        }
    )
    return DatabricksConnectionResult(connected=True, message="Saved — now used by every request", catalog=payload.catalog)


@router.get("/databricks", response_model=dict)
def get_databricks_connection(settings: Settings = Depends(get_settings)):
    token = settings.databricks_token
    masked_token = f"{token[:4]}{'•' * 12}" if token else None

    return {
        "workspace_url": settings.databricks_host,
        "http_path": settings.databricks_http_path,
        "catalog": settings.databricks_catalog,
        "token": masked_token,
        "configured": settings.is_databricks_configured,
    }


@router.get("/pipeline-schedule", response_model=PipelineScheduleInfo)
def get_pipeline_schedule(settings: Settings = Depends(get_settings)):
    if not settings.is_databricks_configured:
        return PipelineScheduleInfo(mode="manual", interval_minutes=None)

    try:
        client = DatabricksClient.from_settings(settings)
        info = client.get_schedule()
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return PipelineScheduleInfo(**info)


@router.post("/pipeline-schedule", response_model=PipelineScheduleInfo)
def save_pipeline_schedule(payload: PipelineScheduleRequest, settings: Settings = Depends(get_settings)):
    if not settings.is_databricks_configured or not settings.databricks_job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Databricks job is not configured yet — set DATABRICKS_JOB_ID in the backend's .env first",
        )

    try:
        client = DatabricksClient.from_settings(settings)
        client.set_schedule(payload.mode, payload.interval_minutes)
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return PipelineScheduleInfo(mode=payload.mode, interval_minutes=payload.interval_minutes)


@router.post("/pipeline-schedule/run-now", response_model=RunPipelineResult)
def run_pipeline_now(settings: Settings = Depends(get_settings)):
    """
    The only way a Databricks run actually starts while in Manual
    mode — deliberately admin-only and deliberately separate from
    /documents/trigger-pipeline, which uploads call automatically but
    which never itself starts a run anymore (see that endpoint's
    docstring). This is the explicit "yes, spend the compute time
    now" action the admin takes when they're ready to process
    whatever's currently sitting in the Volume.
    """

    if not settings.is_databricks_configured or not settings.databricks_job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Databricks job is not configured yet — set DATABRICKS_JOB_ID in the backend's .env first",
        )

    try:
        client = DatabricksClient.from_settings(settings)

        if client.has_active_run():
            return RunPipelineResult(
                run_id=None,
                status="already_running",
                message="A pipeline run is already in progress.",
            )

        run_id = client.trigger_pipeline()
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return RunPipelineResult(run_id=run_id, status="started", message=f"Databricks run {run_id} is now processing your files.")
