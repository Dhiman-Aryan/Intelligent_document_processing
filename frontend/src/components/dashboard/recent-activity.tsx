import { DocumentTypeBadge, ProcessingStatusBadge } from "@/components/documents/status";
import type { Document } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { FileIcon } from "lucide-react";
import Link from "next/link";

export function RecentActivity({ documents }: { documents: Document[] }) {
  const recent = [...documents]
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">No documents yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Upload your first document to see activity here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {recent.map((doc) => (
        <Link
          key={doc.file_id}
          href={`/documents/${doc.file_id}`}
          className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/60 -mx-2 px-2 rounded-lg"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(doc.uploaded_at)}</p>
          </div>
          <DocumentTypeBadge type={doc.document_type} />
          <ProcessingStatusBadge status={doc.processing_status} />
        </Link>
      ))}
    </div>
  );
}
