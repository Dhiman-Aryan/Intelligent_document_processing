"use client";

import { AppShell } from "@/components/layout/app-shell";
import { isAuthenticated } from "@/lib/auth";
import { useHasMounted } from "@/lib/use-has-mounted";
import { Loader2, Scan } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Scan className="h-5 w-5" />
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useHasMounted();
  const authed = mounted && isAuthenticated();

  useEffect(() => {
    if (mounted && !authed) {
      router.replace("/login");
    }
  }, [mounted, authed, router]);

  if (!authed) {
    return <LoadingScreen />;
  }

  return <AppShell>{children}</AppShell>;
}
