"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PipelineDelayNote } from "@/components/layout/pipeline-delay-note";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { DocumentsTable } from "@/components/documents/documents-table";
import { DocumentsTableSkeleton } from "@/components/documents/documents-table-skeleton";
import { FiltersBar } from "@/components/documents/filters-bar";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fetchDocuments } from "@/lib/documents-api";
import { loadCachedDocuments, saveCachedDocuments } from "@/lib/documents-cache";
import type { Document, DocumentType, ProcessingStatus } from "@/lib/types";
import { useHasMounted } from "@/lib/use-has-mounted";
import { AlertTriangle, FileSearch, FileStack, UploadCloud } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function DocumentsPageContent() {
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const isAdmin = user?.role === "admin";
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeType, setActiveType] = useState<DocumentType | "ALL">("ALL");
  const [activeStatus, setActiveStatus] = useState<ProcessingStatus | "ALL">("ALL");
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      // Same cache-then-revalidate approach as the dashboard: show
      // whatever was fetched last time immediately (this list is
      // shared across Dashboard/Documents/Analytics, keyed only by
      // user — whichever page fetched most recently benefits the
      // others), then quietly refresh underneath.
      const cached = loadCachedDocuments(user!.id);
      if (cached) {
        // loading defaults to true on every remount, regardless of
        // cache — without explicitly clearing it here, the skeleton
        // stayed up for the whole background fetch anyway, which
        // defeated the entire point of caching.
        setAllDocuments(cached.documents);
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const documents = await fetchDocuments();
        if (cancelled) return;
        setAllDocuments(documents);
        saveCachedDocuments(user!.id, documents);
      } catch (err) {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof ApiError ? err.message : "Something went wrong loading your documents.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    return allDocuments.filter((doc) => {
      const matchesQuery = doc.file_name.toLowerCase().includes(query.toLowerCase());
      const matchesType = activeType === "ALL" || doc.document_type === activeType;
      const matchesStatus = activeStatus === "ALL" || doc.processing_status === activeStatus;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [allDocuments, query, activeType, activeStatus]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description={
          isAdmin
            ? `${allDocuments.length} document${allDocuments.length === 1 ? "" : "s"} across every user`
            : `${allDocuments.length} document${allDocuments.length === 1 ? "" : "s"} you've uploaded`
        }
        action={
          <Button href="/upload" icon={<UploadCloud className="h-4 w-4" />}>
            Upload document
          </Button>
        }
      />

      <PipelineDelayNote />

      <TopProgressBar active={refreshing && !loading} />

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn&apos;t load your documents: {error}
        </div>
      )}

      <div className="mb-5">
        <FiltersBar
          query={query}
          onQueryChange={setQuery}
          activeType={activeType}
          onTypeChange={setActiveType}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />
      </div>

      {loading ? (
        <DocumentsTableSkeleton />
      ) : filtered.length === 0 && allDocuments.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No documents yet"
          description="Upload your first resume, invoice, bank statement, prescription, or email to get started."
          action={
            <Button href="/upload" icon={<UploadCloud className="h-4 w-4" />}>
              Upload document
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No documents found"
          description="Try a different search term or clear your filters."
        />
      ) : (
        <DocumentsTable documents={filtered} />
      )}
    </div>
  );
}
