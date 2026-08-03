import { Clock } from "lucide-react";

/**
 * Shown on every page that reads from the Databricks pipeline's
 * output (Dashboard, Documents, Analytics) — a freshly uploaded file
 * won't show up here immediately: the pipeline only runs on its
 * schedule (see Settings → Pipeline schedule), and even once it
 * starts, Databricks' serverless compute needs a few minutes to spin
 * up before it does any real work. Without this note, a genuinely
 * still-pending file looks identical to something being lost.
 */
export function PipelineDelayNote() {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm font-semibold text-info">
      <Clock className="h-4 w-4 shrink-0" />
      Results can take 10–15 minutes to appear after a new upload — Databricks compute takes a
      few minutes to start, plus the wait until the next scheduled pipeline run.
    </div>
  );
}
