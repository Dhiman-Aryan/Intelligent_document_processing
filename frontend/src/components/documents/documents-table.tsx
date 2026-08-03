"use client";

import {
  ConfidenceBar,
  DocumentTypeBadge,
  ProcessingStatusBadge,
  ValidationStatusBadge,
} from "@/components/documents/status";
import type { Document } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { AlertTriangle, FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function DocumentsTable({ documents }: { documents: Document[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Validation</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium">Size</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.file_id}
              onClick={() => router.push(`/documents/${doc.file_id}`)}
              className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[220px] truncate font-medium text-foreground">
                      {doc.file_name}
                    </p>
                    {doc.duplicate_flag && (
                      <p className="flex items-center gap-1 text-[11px] text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Possible duplicate
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <DocumentTypeBadge type={doc.document_type} />
              </td>
              <td className="px-4 py-3">
                <ProcessingStatusBadge status={doc.processing_status} />
              </td>
              <td className="px-4 py-3">
                <ValidationStatusBadge status={doc.validation_status} />
              </td>
              <td className="px-4 py-3">
                <ConfidenceBar score={doc.extraction_confidence_score} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatDate(doc.uploaded_at)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatBytes(doc.file_size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
