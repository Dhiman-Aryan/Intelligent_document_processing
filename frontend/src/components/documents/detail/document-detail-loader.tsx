"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DocumentDetail } from "@/components/documents/detail/document-detail";
import { ApiError } from "@/lib/api";
import { fetchDocument } from "@/lib/documents-api";
import type { Document } from "@/lib/types";
import { AlertTriangle, FileQuestion } from "lucide-react";
import { useEffect, useState } from "react";

export function DocumentDetailLoader({ fileId }: { fileId: string }) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const doc = await fetchDocument(fileId);
        if (!cancelled) setDocument(doc);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Something went wrong loading this document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load this document"
        description={error}
        action={<Button href="/documents">Back to documents</Button>}
      />
    );
  }

  if (!document) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Document not found"
        description="This document may have been removed, or the link is incorrect."
        action={<Button href="/documents">Back to documents</Button>}
      />
    );
  }

  return <DocumentDetail document={document} />;
}
