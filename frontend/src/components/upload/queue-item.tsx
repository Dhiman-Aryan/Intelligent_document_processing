"use client";

import { QuickPreview } from "@/components/upload/quick-preview";
import type { QuickResult } from "@/lib/upload-api";
import type { TriggerPipelineStatus } from "@/lib/documents-api";
import { formatBytes } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, File, Loader2, X } from "lucide-react";
import Link from "next/link";

export type UploadQueueStatus = "uploading" | "processing" | "completed" | "failed";

// Deliberately holds fileName/fileSize instead of the raw File object —
// a File can't be saved to localStorage (or survive a page reload) but
// these plain fields can, which is what lets the queue persist across
// a refresh instead of silently disappearing (see upload/page.tsx).
export interface UploadQueueEntry {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadQueueStatus;
  fileId?: string;
  errorMessage?: string;
  quickResult?: QuickResult | null;
  quickResultError?: string | null;
  // Set once /documents/trigger-pipeline responds. That endpoint can
  // only ever come back "manual_only" or "scheduled" — uploading a
  // file never starts a real run (see the backend), so there is no
  // status value here that ever means "actively running right now".
  // Undefined only for the brief moment between upload finishing and
  // that response landing, and is treated the same as either of
  // those — waiting, not running (see the fallback text below).
  pipelineStatus?: TriggerPipelineStatus;
  pipelineMessage?: string;
}

export function UploadQueueItem({
  entry,
  onRemove,
}: {
  entry: UploadQueueEntry;
  onRemove: (id: string) => void;
}) {
  const {
    fileName,
    fileSize,
    progress,
    status,
    fileId,
    errorMessage,
    quickResult,
    quickResultError,
    pipelineMessage,
  } = entry;

  return (
    <div className="animate-slide-up flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <File className="h-4.5 w-4.5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(fileSize)}</span>
        </div>

        {status === "uploading" && progress < 100 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {status === "uploading" && progress === 100 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-info">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing document with AI...
          </p>
        )}

        {status === "processing" && (
          <>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {pipelineMessage ?? "Saved — checking how it will be processed..."}
            </p>
            {quickResult && <QuickPreview result={quickResult} />}
            {!quickResult && quickResultError && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {quickResultError}
              </p>
            )}
          </>
        )}

        {status === "completed" && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Processed
            {fileId && (
              <Link href={`/documents/${fileId}`} className="ml-1 underline hover:no-underline">
                View result
              </Link>
            )}
          </p>
        )}

        {status === "failed" && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {errorMessage ?? "Processing failed"}
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(entry.id)}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
