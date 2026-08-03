"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { DatabricksCard } from "@/components/settings/databricks-card";
import { PipelineScheduleCard } from "@/components/settings/pipeline-schedule-card";
import { PreferencesCard } from "@/components/settings/preferences-card";
import { ProfileCard } from "@/components/settings/profile-card";
import { getCurrentUser } from "@/lib/auth";
import { useHasMounted } from "@/lib/use-has-mounted";
import { ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const isAdmin = user?.role === "admin";

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, connection, and preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ProfileCard />
          <PreferencesCard />
        </div>

        <div className="flex flex-col gap-6">
          {mounted && (isAdmin ? (
            <>
              <DatabricksCard />
              <PipelineScheduleCard />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Databricks connection</CardTitle>
                <CardDescription>Shared platform configuration — admin only</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3.5">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Only your platform&apos;s admin account can view or change the Databricks
                    connection, since it&apos;s shared by everyone, not per-user.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <DangerZoneCard />
        </div>
      </div>
    </div>
  );
}
