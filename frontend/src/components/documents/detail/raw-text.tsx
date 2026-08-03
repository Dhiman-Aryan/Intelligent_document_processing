"use client";

import { ChevronDown, ScrollText } from "lucide-react";
import { useState } from "react";

export function RawTextViewer({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2.5 px-5 py-4 text-left"
      >
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold text-foreground">Raw extracted text</span>
        <span className="text-xs text-muted-foreground">For manual verification</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="animate-slide-up border-t border-border px-5 py-4">
          {text ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
              {text}
            </pre>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">
              No text extracted yet — this document is still processing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
