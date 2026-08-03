"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_META, type DocumentType, type ProcessingStatus } from "@/lib/types";
import { Search } from "lucide-react";

const TYPES: DocumentType[] = ["RESUME", "EMAIL", "INVOICE", "BANK_STATEMENT", "PRESCRIPTION"];
const STATUSES: ProcessingStatus[] = ["COMPLETED", "PROCESSING", "FAILED"];

interface FiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeType: DocumentType | "ALL";
  onTypeChange: (value: DocumentType | "ALL") => void;
  activeStatus: ProcessingStatus | "ALL";
  onStatusChange: (value: ProcessingStatus | "ALL") => void;
}

export function FiltersBar({
  query,
  onQueryChange,
  activeType,
  onTypeChange,
  activeStatus,
  onStatusChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by file name..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <select
          value={activeStatus}
          onChange={(e) => onStatusChange(e.target.value as ProcessingStatus | "ALL")}
          className="h-10 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTypeChange("ALL")}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            activeType === "ALL"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          All types
        </button>
        {TYPES.map((type) => {
          const meta = DOCUMENT_TYPE_META[type];
          const active = activeType === type;
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "border-transparent" : "border-border text-muted-foreground hover:bg-muted"
              )}
              style={active ? { backgroundColor: meta.soft, color: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
