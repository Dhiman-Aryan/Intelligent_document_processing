import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_META, type DocumentType, type ProcessingStatus, type ValidationStatus } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  if (status === "COMPLETED") return <Badge tone="success" dot>Completed</Badge>;
  if (status === "FAILED") return <Badge tone="danger" dot>Failed</Badge>;
  return (
    <Badge tone="info">
      <Loader2 className="h-3 w-3 animate-spin" />
      Processing
    </Badge>
  );
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus | null }) {
  if (status === "PASS") return <Badge tone="success" dot>Pass</Badge>;
  if (status === "FAILED") return <Badge tone="danger" dot>Failed</Badge>;
  return <Badge tone="neutral">—</Badge>;
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const meta = DOCUMENT_TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

export function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const tone = score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{score}%</span>
    </div>
  );
}
