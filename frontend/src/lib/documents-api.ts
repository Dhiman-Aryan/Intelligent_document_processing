import { ApiError, api } from "@/lib/api";
import type { Document, DocumentType } from "@/lib/types";

export interface Stats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  passed: number;
  validationFailed: number;
  avgConfidence: number;
}

interface StatsResponse {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  passed: number;
  validation_failed: number;
  avg_confidence: number;
}

export interface TypeCount {
  type: DocumentType;
  count: number;
}

const ALL_TYPES: DocumentType[] = ["RESUME", "EMAIL", "INVOICE", "BANK_STATEMENT", "PRESCRIPTION"];

export async function fetchDocuments(params?: {
  documentType?: DocumentType;
  processingStatus?: string;
  q?: string;
}): Promise<Document[]> {
  const query = new URLSearchParams();
  if (params?.documentType) query.set("document_type", params.documentType);
  if (params?.processingStatus) query.set("processing_status", params.processingStatus);
  if (params?.q) query.set("q", params.q);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return api.get<Document[]>(`/documents${suffix}`);
}

export async function fetchDocument(fileId: string): Promise<Document | null> {
  try {
    return await api.get<Document>(`/documents/${fileId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function fetchStats(): Promise<Stats> {
  const raw = await api.get<StatsResponse>("/documents/stats/summary");
  return {
    total: raw.total,
    completed: raw.completed,
    processing: raw.processing,
    failed: raw.failed,
    passed: raw.passed,
    validationFailed: raw.validation_failed,
    avgConfidence: raw.avg_confidence,
  };
}

export async function fetchCountsByType(): Promise<TypeCount[]> {
  return api.get<TypeCount[]>("/documents/stats/by-type");
}

// --- Derived analytics, computed locally from a real documents list ---
// No dedicated backend endpoints for these yet — since the frontend
// already has the full list in hand for the Analytics page, computing
// them here avoids adding endpoints that would just do the same
// array math server-side. All zero/empty when there are no documents,
// same as everything else — nothing here is sample data.

export function computeConfidenceByType(documents: Document[]) {
  return ALL_TYPES.map((type) => {
    const scored = documents.filter(
      (d) => d.document_type === type && d.extraction_confidence_score !== null
    );
    const avg =
      scored.length > 0
        ? Math.round(scored.reduce((sum, d) => sum + (d.extraction_confidence_score ?? 0), 0) / scored.length)
        : 0;
    return { type, avgConfidence: avg, count: scored.length };
  });
}

export function computeValidationOutcomeByType(documents: Document[]) {
  return ALL_TYPES.map((type) => {
    const docs = documents.filter((d) => d.document_type === type);
    return {
      type,
      pass: docs.filter((d) => d.validation_status === "PASS").length,
      failed: docs.filter((d) => d.validation_status === "FAILED").length,
    };
  });
}

/** Documents uploaded per day over the last 14 days, from real upload timestamps. */
export function computeFourteenDayTrend(documents: Document[]) {
  const days: { date: string; documents: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const key = day.toDateString();

    const count = documents.filter((d) => new Date(d.uploaded_at).toDateString() === key).length;
    days.push({ date: label, documents: count });
  }

  return days;
}

// Called automatically right after every upload — but per the
// backend's current design, this never actually starts a Databricks
// run itself anymore. It only reports what will happen to the file:
// "manual_only" (an admin has to run it from Settings) or "scheduled"
// (it'll be picked up on the next scheduled tick). Actually starting
// a run is an admin-only action — see runPipelineNow() below.
export type TriggerPipelineStatus = "manual_only" | "scheduled";

export interface TriggerPipelineResult {
  run_id: string | null;
  status: TriggerPipelineStatus;
  message: string;
}

export async function triggerPipeline(): Promise<TriggerPipelineResult> {
  return api.post<TriggerPipelineResult>("/documents/trigger-pipeline");
}

/**
 * Client-side equivalents of the backend's document_stats.py — used
 * so a page that already has the full documents list (from one
 * fetchDocuments() call) doesn't also have to hit
 * /documents/stats/summary and /documents/stats/by-type separately.
 * Each of those endpoints internally re-runs the same 5 Databricks
 * queries list_documents() does, so calling all three from one page
 * load (as the Dashboard used to) tripled real Databricks round-trip
 * time for no reason — this computes the exact same numbers from
 * data already in hand, instantly, with zero extra network calls.
 */
export function computeStats(documents: Document[]): Stats {
  const total = documents.length;
  const completed = documents.filter((d) => d.processing_status === "COMPLETED").length;
  const processing = documents.filter((d) => d.processing_status === "PROCESSING").length;
  const failed = documents.filter((d) => d.processing_status === "FAILED").length;
  const passed = documents.filter((d) => d.validation_status === "PASS").length;
  const validationFailed = documents.filter((d) => d.validation_status === "FAILED").length;

  const scored = documents
    .map((d) => d.extraction_confidence_score)
    .filter((score): score is number => score !== null);
  const avgConfidence = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;

  return { total, completed, processing, failed, passed, validationFailed, avgConfidence };
}

export function computeCountsByType(documents: Document[]): TypeCount[] {
  return ALL_TYPES.map((type) => ({
    type,
    count: documents.filter((d) => d.document_type === type).length,
  }));
}
