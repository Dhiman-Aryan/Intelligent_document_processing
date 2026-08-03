from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.config import Settings, get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import UserOut
from app.schemas.documents import DocumentOut, StatsOut, TypeCountOut
from app.services import document_stats
from app.services.databricks_client import DatabricksClient, DatabricksError
from app.services.ownership import get_owned_file_ids

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_scoped_documents(settings: Settings, db: Database, current_user: UserOut) -> list[dict]:
    """
    Real data only — no fake fallback. Until Databricks is configured,
    there is genuinely nothing to show yet (no pipeline has run), so
    this returns an empty list rather than sample documents.

    Then scoped by role: admin sees every document on the platform
    (that's the whole point of the admin account — totals across
    everyone); a regular user only ever sees documents they
    personally uploaded, filtered against the ownership records
    written at upload time (see services/ownership.py). Every
    endpoint below is built on top of this one function, so
    /documents and both /documents/stats/* endpoints are
    automatically scoped the same way.
    """
    if not settings.is_databricks_configured:
        return []

    try:
        client = DatabricksClient.from_settings(settings)
        documents = client.list_documents()
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Databricks query failed: {exc}")

    if current_user.role == "admin":
        return documents

    owned_ids = get_owned_file_ids(db, current_user.id)
    return [d for d in documents if d["file_id"] in owned_ids]


@router.get("", response_model=list[DocumentOut])
def list_documents(
    document_type: str | None = None,
    processing_status: str | None = None,
    q: str | None = None,
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    documents = _get_scoped_documents(settings, db, current_user)

    if document_type:
        documents = [d for d in documents if d["document_type"] == document_type]
    if processing_status:
        documents = [d for d in documents if d["processing_status"] == processing_status]
    if q:
        needle = q.lower()
        documents = [d for d in documents if needle in d["file_name"].lower()]

    return documents


@router.get("/stats/summary", response_model=StatsOut)
def get_stats(
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    documents = _get_scoped_documents(settings, db, current_user)
    return document_stats.compute_stats(documents)


@router.get("/stats/by-type", response_model=list[TypeCountOut])
def get_counts_by_type(
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    documents = _get_scoped_documents(settings, db, current_user)
    return document_stats.compute_counts_by_type(documents)


@router.get("/{file_id}", response_model=DocumentOut)
def get_document(
    file_id: str,
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    not_found = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not settings.is_databricks_configured:
        # Nothing has been processed yet — a real document with this
        # id can't exist, so this is a genuine 404, not a mock lookup.
        raise not_found

    if current_user.role != "admin" and file_id not in get_owned_file_ids(db, current_user.id):
        # Same 404 as "doesn't exist" rather than 403 — a regular user
        # shouldn't be able to tell the difference between "not yours"
        # and "doesn't exist" for someone else's document.
        raise not_found

    try:
        client = DatabricksClient.from_settings(settings)
        document = client.get_document(file_id)
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Databricks query failed: {exc}")

    if document is None:
        raise not_found

    return document


@router.post("/trigger-pipeline")
def trigger_pipeline(
    settings: Settings = Depends(get_settings),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Called automatically by the frontend right after every upload —
    but this NEVER actually starts a Databricks run itself anymore.
    It only reports what will happen to the file, based on the
    admin's chosen mode (see /settings/pipeline-schedule):

      - Manual mode (the default): the file just sits in the Volume.
        Nothing runs until an admin explicitly starts it from
        Settings ("Run pipeline now"). Uploading is never allowed to
        trigger a real Databricks run on its own — that's a deliberate
        choice, not a bug: a run costs real compute time/money, and a
        regular user uploading a file shouldn't be able to spend that
        on the admin's behalf just by using the upload page.
      - Scheduled mode: an admin has chosen a fixed interval instead —
        the job will pick this file up on its own on the next tick.

    Both cases return run_id: null with an explanatory message
    instead of an error, since nothing went wrong — the file is still
    genuinely on its way to being processed, just not right now. The
    `status` field ("manual_only" / "scheduled") lets the upload queue
    UI show a plain "waiting" state instead of a spinner claiming a
    run is happening when none is.

    Requires DATABRICKS_JOB_ID to be set (Settings page doesn't
    collect this yet, so set it in the backend's .env for now).
    """
    del current_user  # not used for authorization here, only to require login
    if not settings.is_databricks_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Databricks is not configured yet — set it up in Settings first",
        )

    try:
        client = DatabricksClient.from_settings(settings)
        schedule = client.get_schedule()
    except DatabricksError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if schedule["mode"] == "scheduled":
        return {
            "run_id": None,
            "status": "scheduled",
            "message": (
                f"Pipeline runs automatically every {schedule['interval_minutes']} minutes — "
                "your file will be picked up on the next run."
            ),
        }

    return {
        "run_id": None,
        "status": "manual_only",
        "message": "Saved to your Databricks Volume — an admin will need to run the pipeline from Settings.",
    }
