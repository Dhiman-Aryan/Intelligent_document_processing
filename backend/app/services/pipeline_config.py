"""
Mirrors the DOCUMENT_TYPE_SCHEMAS / VALIDATION_CONFIG / STORAGE_CONFIG
pattern used in the Databricks notebooks (4, 5, 6): one config entry
per document type, with every table/column name it needs. The SQL
builder in databricks_client.py loops over this instead of writing
five near-identical queries by hand — same reasoning as the notebooks.

Adding a 6th document type later means adding one entry here; nothing
else in this file or in databricks_client.py needs to change.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentTypeConfig:
    document_type: str
    schema: str
    structured_table: str
    validated_table: str
    final_table: str
    # Type-specific columns to pull from the validated_<type>_data table,
    # in the exact order the notebooks write them — this is what ends up
    # under `data` in the API response.
    data_fields: tuple[str, ...]


DOCUMENT_TYPE_CONFIGS: dict[str, DocumentTypeConfig] = {
    "RESUME": DocumentTypeConfig(
        document_type="RESUME",
        schema="resume",
        structured_table="resume_structured_data",
        validated_table="validated_resume_data",
        final_table="resume_final_data",
        data_fields=(
            "name", "email", "phone", "linkedin", "github",
            "skills", "education", "experience", "projects", "certifications", "summary",
            "additional_information",
        ),
    ),
    "EMAIL": DocumentTypeConfig(
        document_type="EMAIL",
        schema="email",
        structured_table="email_structured_data",
        validated_table="validated_email_data",
        final_table="email_final_data",
        data_fields=("sender", "recipient", "subject", "sent_date", "body", "additional_information"),
    ),
    "INVOICE": DocumentTypeConfig(
        document_type="INVOICE",
        schema="invoice",
        structured_table="invoice_structured_data",
        validated_table="validated_invoice_data",
        final_table="invoice_final_data",
        data_fields=("invoice_number", "invoice_date", "due_date", "total_amount", "additional_information"),
    ),
    "BANK_STATEMENT": DocumentTypeConfig(
        document_type="BANK_STATEMENT",
        schema="bank_statement",
        structured_table="bank_statement_structured_data",
        validated_table="validated_bank_statement_data",
        final_table="bank_statement_final_data",
        data_fields=(
            "account_number", "statement_period", "opening_balance", "closing_balance", "transactions",
            "additional_information",
        ),
    ),
    "PRESCRIPTION": DocumentTypeConfig(
        document_type="PRESCRIPTION",
        schema="prescription",
        structured_table="prescription_structured_data",
        validated_table="validated_prescription_data",
        final_table="prescription_final_data",
        data_fields=(
            "patient_name", "physician_name", "prescription_date", "diagnosis", "medications",
            "additional_information",
        ),
    ),
}

SHARED_SCHEMA = "intelligent-main-folder"
CLASSIFICATION_TABLE = "document_classification"
FILE_METADATA_TABLE = "file_metadata"
