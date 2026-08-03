import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground/70 italic">Not extracted</span>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}

export function PillList({ items, emptyLabel = "None extracted" }: { items: string[]; emptyLabel?: string }) {
  // Guards against a genuinely undefined/null value reaching here —
  // items is real API data (not a value this component controls),
  // and a stale field is safer shown as "none extracted" than as a
  // crashed page.
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground/70 italic">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// Matches a 4-digit year (e.g. "2024", "Jun 2025 – Aug 2025") — used
// to guess which lines are a new entry's title (project/job title +
// date range) versus a bullet describing that entry, so entries like
// "TechTales - Blog App | Jun 2025 - Aug 2025" can get visually
// separated from the entry before them. Extraction returns a flat
// list of lines with no structural entry boundaries, so this is a
// heuristic, not a guarantee — a title with no year in it won't be
// detected, and a bullet that happens to mention a year will be.
const ENTRY_TITLE_PATTERN = /\b(19|20)\d{2}\b/;

export function LineList({
  items,
  emptyLabel = "None extracted",
  groupEntries = false,
}: {
  items: string[];
  emptyLabel?: string;
  groupEntries?: boolean;
}) {
  // Same defensive guard as PillList above.
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground/70 italic">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isNewEntry = groupEntries && i > 0 && ENTRY_TITLE_PATTERN.test(item);
        return (
          <li
            key={i}
            className={cn(
              "rounded-lg bg-muted px-3 py-2 text-sm text-foreground",
              isNewEntry && "mt-3 border-t border-border pt-4"
            )}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
