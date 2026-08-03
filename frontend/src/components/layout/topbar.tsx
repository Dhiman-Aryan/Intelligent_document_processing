"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, logout } from "@/lib/auth";
import { useHasMounted } from "@/lib/use-has-mounted";
import { initials } from "@/lib/utils";
import { LogOut, Menu, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query ? `/documents?q=${encodeURIComponent(query)}` : "/documents");
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenuClick}
        className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="h-9 w-full rounded-xl border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        <div className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {user ? initials(user.name) : <User className="h-4 w-4" />}
          </button>

          {menuOpen && (
            <div className="animate-scale-in absolute right-0 top-11 w-48 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-lg">
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "Signed in"}</p>
                  {user?.role === "admin" && (
                    <Badge tone="primary" className="shrink-0 px-1.5 py-0.5 text-[10px]">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
