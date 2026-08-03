import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--color-muted)_25%,var(--color-border)_50%,var(--color-muted)_75%)]",
        className
      )}
      {...props}
    />
  );
}
