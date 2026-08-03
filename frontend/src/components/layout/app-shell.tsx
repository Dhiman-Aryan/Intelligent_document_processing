"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useState, type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="md:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
