export type DocumentType =
  | "RESUME"
  | "EMAIL"
  | "INVOICE"
  | "BANK_STATEMENT"
  | "PRESCRIPTION";

export type ProcessingStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type ValidationStatus = "PASS" | "FAILED";

export interface BaseDocument {
  file_id: string;
  file_name: string;
  document_type: DocumentType;
  processing_status: ProcessingStatus;
  validation_status: ValidationStatus | null;
  extraction_confidence_score: number | null;
  duplicate_flag: boolean;
  file_size: number;
  uploaded_at: string;
  processed_at: string | null;
  pipeline_run_id: string | null;
}

// Present on every document type — anything Claude found beyond the
// type's own fixed fields (a website, a reference number, a note,
// etc.), captured instead of silently discarded. See llm_extractor.py.
interface WithAdditionalInformation {
  additional_information: string[];
}

export interface ResumeData extends WithAdditionalInformation {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  summary: string | null;
}

export interface EmailData extends WithAdditionalInformation {
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  sent_date: string | null;
  body: string | null;
}

export interface InvoiceData extends WithAdditionalInformation {
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: string | null;
}

export interface BankStatementData extends WithAdditionalInformation {
  account_number: string | null;
  statement_period: string | null;
  opening_balance: string | null;
  closing_balance: string | null;
  transactions: string[];
}

export interface PrescriptionData extends WithAdditionalInformation {
  patient_name: string | null;
  physician_name: string | null;
  prescription_date: string | null;
  diagnosis: string | null;
  medications: string[];
}

export type DocumentData =
  | ({ document_type: "RESUME" } & ResumeData)
  | ({ document_type: "EMAIL" } & EmailData)
  | ({ document_type: "INVOICE" } & InvoiceData)
  | ({ document_type: "BANK_STATEMENT" } & BankStatementData)
  | ({ document_type: "PRESCRIPTION" } & PrescriptionData);

export interface Document extends BaseDocument {
  data: DocumentData;
  raw_text: string;
  validation_errors: string[] | null;
}

export interface DocumentTypeMeta {
  label: string;
  shortLabel: string;
  color: string;
  soft: string;
}

export const DOCUMENT_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  RESUME: { label: "Resume", shortLabel: "Resume", color: "#4f46e5", soft: "#eef2ff" },
  EMAIL: { label: "Email", shortLabel: "Email", color: "#0284c7", soft: "#f0f9ff" },
  INVOICE: { label: "Invoice", shortLabel: "Invoice", color: "#d97706", soft: "#fffbeb" },
  BANK_STATEMENT: { label: "Bank Statement", shortLabel: "Bank Stmt", color: "#16a34a", soft: "#f0fdf4" },
  PRESCRIPTION: { label: "Prescription", shortLabel: "Prescription", color: "#dc2626", soft: "#fef2f2" },
};
