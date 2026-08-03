"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ConfidenceBar,
  DocumentTypeBadge,
  ProcessingStatusBadge,
  ValidationStatusBadge,
} from "@/components/documents/status";
import { RawTextViewer } from "@/components/documents/detail/raw-text";
import { TypeFields } from "@/components/documents/detail/type-fields";
import { useToast } from "@/components/ui/toast";
import type { Document } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Copy, Download, FileWarning } from "lucide-react";
import { useRouter } from "next/navigation";

export function DocumentDetail({ document }: { document: Document }) {
  const router = useRouter();
  const { toast } = useToast();

  function handleDownload() {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.file_name.replace(/\.[^.]+$/, "")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ variant: "success", title: "Downloaded", description: "JSON file saved." });
  }

  function handleCopyId() {
    navigator.clipboard.writeText(document.file_id);
    toast({ variant: "info", title: "Copied", description: "File ID copied to clipboard." });
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
            {document.file_name}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <DocumentTypeBadge type={document.document_type} />
            <ProcessingStatusBadge status={document.processing_status} />
            <ValidationStatusBadge status={document.validation_status} />
            {document.duplicate_flag && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />
                Possible duplicate
              </span>
            )}
          </div>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleDownload}>
          Download JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Extracted data</CardTitle>
            </CardHeader>
            <CardContent>
              <TypeFields data={document.data} />
            </CardContent>
          </Card>

          <RawTextViewer text={document.raw_text} />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">File ID</span>
                <button
                  onClick={handleCopyId}
                  className="flex cursor-pointer items-start gap-1.5 text-left font-mono text-xs break-all text-foreground hover:text-primary"
                >
                  <span className="break-all">{document.file_id}</span>
                  <Copy className="mt-0.5 h-3 w-3 shrink-0" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <ConfidenceBar score={document.extraction_confidence_score} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">File size</span>
                <span className="text-foreground">{formatBytes(document.file_size)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="text-foreground">{formatDateTime(document.uploaded_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processed</span>
                <span className="text-foreground">
                  {document.processed_at ? formatDateTime(document.processed_at) : "—"}
                </span>
              </div>
              {document.pipeline_run_id && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Pipeline run</span>
                  <span className="break-all font-mono text-xs text-foreground">{document.pipeline_run_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {document.validation_errors && document.validation_errors.length > 0 && (
            <Card className="border-danger/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-danger">
                  <FileWarning className="h-4 w-4" />
                  Validation issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {document.validation_errors.map((err) => (
                    <li
                      key={err}
                      className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
                    >
                      {err}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
