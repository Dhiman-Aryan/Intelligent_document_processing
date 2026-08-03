import logging
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from pymongo.database import Database

from app.config import Settings, get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import UserOut
from app.services.databricks_client import DatabricksClient, DatabricksError
from app.services.llm_extractor import process_document_fast
from app.services.ownership import compute_file_id, record_ownership

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png", "eml", "msg"}
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB — matches the frontend's Dropzone limit

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


class QuickResult(BaseModel):
    document_type: str
    classification_confidence: float
    data: Optional[dict[str, Any]] = None
    raw_text: str


class UploadResult(BaseModel):
    file_id: str
    file_name: str
    stored_at: str
    destination: str  # "databricks_volume" | "local_fallback"
    quick_result: Optional[QuickResult] = None
    quick_result_error: Optional[str] = None


@router.post("", response_model=UploadResult, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    extension = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f'".{extension}" is not a supported file type',
        )

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is larger than the 20 MB limit",
        )
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    # Computed the same way regardless of destination — this is the
    # path the file WILL have once the pipeline ingests it from the
    # Volume, which is what file_id needs to match (see
    # services/ownership.py). Using it even for the local fallback
    # keeps ownership records consistent once Databricks gets
    # connected for real later.
    intended_volume_path = f"{settings.databricks_volume_path.rstrip('/')}/{file.filename}"
    file_id = compute_file_id(intended_volume_path, len(content))

    if settings.is_databricks_configured:
        try:
            client = DatabricksClient.from_settings(settings)
            stored_at = client.upload_file(file.filename, content)
        except DatabricksError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Upload to Databricks failed: {exc}")
        destination = "databricks_volume"
    else:
        LOCAL_UPLOAD_DIR.mkdir(exist_ok=True)
        local_path = LOCAL_UPLOAD_DIR / file.filename
        local_path.write_bytes(content)
        stored_at = str(local_path)
        destination = "local_fallback"

    record_ownership(db, file_id=file_id, user_id=current_user.id, file_name=file.filename)

    # Instant local preview — runs OCR/classification/extraction right
    # here, synchronously, so the UI has something to show within a
    # few seconds instead of waiting for the full Databricks Job run.
    # Never blocks the upload response on failure: this is a nice-to
    # -have preview, not the source of truth (the Databricks pipeline
    # still processes the same file independently for the real record).
    quick_result = None
    quick_result_error = None
    try:
        fast_result = process_document_fast(content, file.filename, anthropic_api_key=settings.anthropic_api_key)
        if "error" not in fast_result:
            quick_result = QuickResult(**fast_result)
        else:
            quick_result_error = fast_result["error"]
            logger.warning("Quick preview failed for %s: %s", file.filename, quick_result_error)
    except Exception:
        quick_result_error = "AI preview crashed unexpectedly — the Databricks pipeline will still process this file."
        logger.exception("Quick preview crashed for %s", file.filename)

    return UploadResult(
        file_id=file_id,
        file_name=file.filename,
        stored_at=stored_at,
        destination=destination,
        quick_result=quick_result,
        quick_result_error=quick_result_error,
    )
