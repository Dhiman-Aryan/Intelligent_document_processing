from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

DocumentType = Literal["RESUME", "EMAIL", "INVOICE", "BANK_STATEMENT", "PRESCRIPTION"]
ProcessingStatus = Literal["PROCESSING", "COMPLETED", "FAILED"]
ValidationStatus = Literal["PASS", "FAILED"]


class DocumentOut(BaseModel):
    """
    Shape matches the frontend's `Document` type in
    src/lib/types.ts exactly, so the frontend's mock-data.ts
    functions (getDocuments, getDocumentById, ...) can be replaced
    with calls to this API with no other frontend changes.
    """

    file_id: str
    file_name: str
    document_type: DocumentType
    processing_status: ProcessingStatus
    validation_status: ValidationStatus | None
    extraction_confidence_score: int | None
    duplicate_flag: bool
    file_size: int
    uploaded_at: datetime
    processed_at: datetime | None
    pipeline_run_id: str | None
    raw_text: str
    validation_errors: list[str] | None
    # Type-specific extracted fields (name/email/skills for a resume,
    # invoice_number/total_amount for an invoice, etc.) — left as a
    # free-form dict since its shape depends on document_type.
    data: dict[str, Any]


class StatsOut(BaseModel):
    total: int
    completed: int
    processing: int
    failed: int
    passed: int
    validation_failed: int
    avg_confidence: int


class TypeCountOut(BaseModel):
    type: DocumentType
    count: int
