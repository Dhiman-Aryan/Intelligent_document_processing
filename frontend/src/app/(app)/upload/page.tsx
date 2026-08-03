"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/dropzone";
import { UploadQueueItem, type UploadQueueEntry } from "@/components/upload/queue-item";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { fetchDocuments, triggerPipeline } from "@/lib/documents-api";
import { DOCUMENT_TYPE_META } from "@/lib/types";
import { uploadDocument } from "@/lib/upload-api";
import { UPLOAD_QUEUE_KEY } from "@/lib/auth-storage";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatBytes } from "@/lib/utils";
import { File as FileIcon, FileStack, Mail, Receipt, Landmark, Pill, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TYPE_CARDS = [
  { type: "RESUME" as const, icon: FileStack },
  { type: "INVOICE" as const, icon: Receipt },
  { type: "BANK_STATEMENT" as const, icon: Landmark },
  { type: "PRESCRIPTION" as const, icon: Pill },
  { type: "EMAIL" as const, icon: Mail },
];

const POLL_INTERVAL_MS = 5000;

// The queue only ever held the raw File object before, which can't
// survive a page reload (or be written to localStorage at all) — so
// refreshing mid-upload made the list vanish even though the file had
// already safely reached the Databricks Volume. Persisting the
// (serializable) queue here fixes that: reload the page and your
// recent uploads — and their real status — are still there.
//
// STORAGE_KEY itself lives in auth-storage.ts (as UPLOAD_QUEUE_KEY),
// not here — clearSession() needs to wipe it on logout, otherwise
// the previous session's upload queue kept showing up for whoever
// logged in next on the same browser.
const STORAGE_KEY = UPLOAD_QUEUE_KEY;
const MAX_PERSISTED_ENTRIES = 20;

function loadPersistedQueue(): UploadQueueEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as UploadQueueEntry[];

    // An entry still "uploading" in a stale snapshot means the page
    // was closed/refreshed mid-upload — the actual File object is
    // gone, so there's no way to know whether that upload finished.
    // Mark it failed rather than showing a progress bar that can
    // never move again.
    return parsed.map((entry) =>
      entry.status === "uploading"
        ? { ...entry, status: "failed" as const, errorMessage: "Interrupted by a page refresh" }
        : entry
    );
  } catch {
    return [];
  }
}

// Reading localStorage has to happen client-side only, and setting
// state synchronously inside an effect is flagged by
// react-hooks/set-state-in-effect — so this whole interactive page is
// gated behind useHasMounted() and only ever rendered client-side
// (see use-has-mounted.ts), letting the queue load via a plain lazy
// useState initializer instead of an effect.
export default function UploadPage() {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return (
      <div>
        <PageHeader
          title="Upload documents"
          description="Select files, then upload them as a batch — you'll see the AI preview for each once it's uploaded."
        />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40" />
      </div>
    );
  }

  return <UploadPageClient />;
}

function UploadPageClient() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<UploadQueueEntry[]>(() => loadPersistedQueue());
  const queueRef = useRef(queue);
  // Files the user has selected but not yet committed to uploading —
  // deliberately kept separate from `queue` (and not persisted to
  // localStorage): a File object can't survive being written to
  // localStorage, and losing an unsubmitted selection on refresh is
  // expected browser behavior anyway, unlike an in-flight upload.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    queueRef.current = queue;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_PERSISTED_ENTRIES)));
  }, [queue]);

  // One persistent poller for the page's lifetime — checks every 5s
  // whether any queued file has finished processing, and only calls
  // the backend at all when something is actually still "processing".
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentQueue = queueRef.current;
      const hasProcessing = currentQueue.some((entry) => entry.status === "processing");
      if (!hasProcessing) return;

      let documents;
      try {
        documents = await fetchDocuments();
      } catch {
        return; // transient network hiccup — just try again next tick
      }

      // Figured out entirely from a plain read of currentQueue/documents
      // first — setQueue's updater below stays a pure function with no
      // side effects, and the toasts fire afterward from this
      // already-computed list. Calling toast() (another component's
      // setState) from inside the updater itself is what triggered a
      // real "Cannot update a component while rendering a different
      // component" error — React can invoke an updater function more
      // than once for a single update, so anything with a side effect
      // doesn't belong inside one.
      const updates = new Map<string, { status: "completed" | "failed"; errorMessage?: string }>();
      const pendingToasts: { variant: "success" | "error"; title: string; description: string }[] = [];

      for (const entry of currentQueue) {
        if (entry.status !== "processing" || !entry.fileId) continue;

        const match = documents.find((d) => d.file_id === entry.fileId);
        if (!match || match.processing_status === "PROCESSING") continue;

        if (match.processing_status === "COMPLETED") {
          updates.set(entry.id, { status: "completed" });
          pendingToasts.push({
            variant: "success",
            title: "Processing complete",
            description: `${entry.fileName} has been processed — result is ready.`,
          });
        } else {
          updates.set(entry.id, { status: "failed", errorMessage: "Pipeline processing failed" });
          pendingToasts.push({
            variant: "error",
            title: "Processing failed",
            description: `${entry.fileName} could not be processed by the pipeline.`,
          });
        }
      }

      if (updates.size > 0) {
        setQueue((current) =>
          current.map((entry) => {
            const update = updates.get(entry.id);
            return update ? { ...entry, ...update } : entry;
          })
        );
      }

      pendingToasts.forEach((t) => toast(t));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesAccepted(files: File[]) {
    // Staged only — nothing is uploaded until "Upload now" is
    // clicked below, so a drag-and-drop or multi-select doesn't
    // commit to an upload by itself.
    setPendingFiles((current) => [...current, ...files]);
  }

  function handleRemovePending(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  function handleUploadNow() {
    if (pendingFiles.length === 0) return;

    const files = pendingFiles;
    setPendingFiles([]);

    const newEntries: UploadQueueEntry[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: "uploading",
    }));

    setQueue((current) => [...newEntries, ...current]);

    const uploads = files.map((file, i) => performUpload(newEntries[i].id, file));

    // Fire the pipeline once for the whole batch, not once per file —
    // uploading 5 files shouldn't start 5 separate Databricks job runs.
    Promise.allSettled(uploads).then((results) => {
      const succeededIds = newEntries.filter((_, i) => results[i].status === "fulfilled").map((e) => e.id);
      if (succeededIds.length > 0) runPipeline(succeededIds);
    });
  }

  async function performUpload(id: string, file: File) {
    try {
      const result = await uploadDocument(file, (percent) => {
        setQueue((current) => current.map((entry) => (entry.id === id ? { ...entry, progress: percent } : entry)));
      });
      setQueue((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                progress: 100,
                status: "processing",
                fileId: result.file_id,
                quickResult: result.quick_result,
                quickResultError: result.quick_result_error,
              }
            : entry
        )
      );

      if (result.quick_result_error) {
        toast({
          variant: "error",
          title: "AI preview unavailable",
          description: result.quick_result_error,
        });
      } else {
        toast({
          variant: "success",
          title: result.quick_result && result.quick_result.document_type !== "UNKNOWN" ? "AI preview ready" : "Upload complete",
          description:
            result.quick_result && result.quick_result.document_type !== "UNKNOWN"
              ? `${file.name} looks like a ${result.quick_result.document_type.replace("_", " ").toLowerCase()} — see the AI preview below.`
              : `${file.name} reached your Databricks Volume.`,
        });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setQueue((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, status: "failed" as const, errorMessage: message } : entry
        )
      );
      toast({ variant: "error", title: `Couldn't upload ${file.name}`, description: message });
      throw err;
    }
  }

  async function runPipeline(entryIds: string[]) {
    try {
      const result = await triggerPipeline();
      // Carries the real status onto each affected queue item so it
      // can show the truth — a spinner only when a run is genuinely
      // happening now, or a plain "waiting for the next scheduled
      // run" line when it isn't (see queue-item.tsx).
      setQueue((current) =>
        current.map((entry) =>
          entryIds.includes(entry.id)
            ? { ...entry, pipelineStatus: result.status, pipelineMessage: result.message }
            : entry
        )
      );
      toast({
        variant: "success",
        title: result.run_id ? "Pipeline started" : "Upload queued",
        description: `${result.message} This page will update automatically.`,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      toast({ variant: "error", title: "Uploaded, but couldn't start the pipeline", description: message });
    }
  }

  function handleRejected(file: File, reason: string) {
    toast({ variant: "error", title: `Couldn't upload ${file.name}`, description: reason });
  }

  function handleRemove(id: string) {
    setQueue((current) => current.filter((entry) => entry.id !== id));
  }

  // "processing" here only ever means "uploaded, sitting in the
  // Volume" — uploading a file never starts a real pipeline run (see
  // /documents/trigger-pipeline), so there's no "actively running"
  // bucket to show; that used to default to showing anyway during
  // the brief gap before the pipeline-status response landed, which
  // read as a false claim that something was running.
  const uploadingCount = queue.filter((e) => e.status === "uploading").length;
  const waitingCount = queue.filter((e) => e.status === "processing").length;
  const statusSummary = [
    uploadingCount > 0 && `${uploadingCount} uploading`,
    // Leads with the success ("uploaded"), not just the wait — the
    // upload genuinely did succeed; the pipeline just hasn't run on
    // it yet. Saying only "waiting for pipeline" undersold that and
    // read like something had gone wrong.
    waitingCount > 0 && `${waitingCount} uploaded — waiting for pipeline`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader
        title="Upload documents"
        description="Select files, then upload them as a batch — you'll see the AI preview for each once it's uploaded."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Supported types:</span>
        {TYPE_CARDS.map(({ type, icon: Icon }) => {
          const meta = DOCUMENT_TYPE_META[type];
          return (
            <span
              key={type}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: meta.soft, color: meta.color }}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
          );
        })}
      </div>

      <Dropzone onFilesAccepted={handleFilesAccepted} onFileRejected={handleRejected} />

      {pendingFiles.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Selected files ({pendingFiles.length})
            </h3>
            <Button size="sm" icon={<Upload className="h-4 w-4" />} onClick={handleUploadNow}>
              Upload {pendingFiles.length === 1 ? "file" : `${pendingFiles.length} files`}
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileIcon className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={() => handleRemovePending(index)}
                  className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Upload queue ({queue.length})
            </h3>
            {statusSummary && (
              <span className="text-xs text-muted-foreground">{statusSummary}</span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            {queue.map((entry) => (
              <UploadQueueItem key={entry.id} entry={entry} onRemove={handleRemove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
