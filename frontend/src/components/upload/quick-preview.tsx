"use client";

import { TypeFields } from "@/components/documents/detail/type-fields";
import { DocumentTypeBadge } from "@/components/documents/status";
import type { QuickResult } from "@/lib/upload-api";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useState } from "react";

/**
 * Shown right after upload, before the Databricks pipeline has even
 * started — this is the backend's own AI-powered classification +
 * field extraction (a local vision LLM for images, OCR+regex for
 * text-based files), not the pipeline's result. Labeled "AI preview"
 * rather than "instant" — a complex handwritten image can take up to
 * a couple of minutes — so it's never confused with the verified
 * Databricks-processed record shown later on the document detail page.
 */
export function QuickPreview({ result }: { result: QuickResult }) {
  const [expanded, setExpanded] = useState(false);

  if (result.document_type === "UNKNOWN" || !result.data) {
    return (
      <p className="mt-2 text-xs italic text-muted-foreground">
        AI preview couldn&apos;t identify this document — the full Databricks pipeline will still process it.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Zap className="h-3.5 w-3.5 text-warning" />
          AI preview
          <DocumentTypeBadge type={result.document_type} />
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <TypeFields data={result.data} />
        </div>
      )}
    </div>
  );
}
