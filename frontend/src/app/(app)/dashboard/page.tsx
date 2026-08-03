"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocTypeChart } from "@/components/dashboard/doc-type-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineDelayNote } from "@/components/layout/pipeline-delay-note";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { computeCountsByType, computeStats, fetchDocuments } from "@/lib/documents-api";
import { loadCachedDocuments, saveCachedDocuments } from "@/lib/documents-cache";
import type { Document } from "@/lib/types";
import { useHasMounted } from "@/lib/use-has-mounted";
import { AlertTriangle, CheckCircle2, Gauge, Loader2, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage() {
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const isAdmin = user?.role === "admin";
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      // Coming back to this page after visiting another section used
      // to always show the full "please wait" skeleton again, even
      // though the last fetch's results were sitting right there a
      // second ago. Showing the cached list immediately (while a
      // fresh fetch still runs quietly underneath) fixes that —
      // real data appears instantly, and gets swapped for the
      // up-to-date version once the background fetch lands.
      const cached = loadCachedDocuments(user!.id);
      if (cached) {
        // loading defaults to true on every remount, regardless of
        // cache — without explicitly clearing it here, the skeleton
        // stayed up for the whole background fetch anyway, which
        // defeated the entire point of caching.
        setDocuments(cached.documents);
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        // One fetch instead of three — stats and type counts are
        // derived from this same list below, instead of each hitting
        // its own endpoint (which used to each re-run all 5
        // Databricks queries independently — 3x the real network
        // time for numbers that come from the exact same data).
        const documentsData = await fetchDocuments();
        if (cancelled) return;
        setDocuments(documentsData);
        saveCachedDocuments(user!.id, documentsData);
      } catch (err) {
        if (cancelled) return;
        // A failed background refresh shouldn't wipe out the
        // still-valid cached data already on screen — only surface
        // the error banner when there was nothing cached to fall
        // back on.
        if (!cached) setError(err instanceof ApiError ? err.message : "Something went wrong loading your dashboard.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stats = computeStats(documents);
  const countsByType = computeCountsByType(documents);

  const weeklyTrend = last7Days(documents);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          isAdmin
            ? "Admin view — totals across every user on the platform."
            : "An overview of documents you've uploaded."
        }
        action={
          <Button href="/upload" icon={<UploadCloud className="h-4 w-4" />}>
            Upload document
          </Button>
        }
      />

      <PipelineDelayNote />

      <TopProgressBar active={refreshing && !loading} />

      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn&apos;t load your dashboard: {error}
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={UploadCloud} label="Total documents" value={stats.total} tone="primary" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} tone="success" />
            <StatCard icon={Loader2} label="Processing" value={stats.processing} tone="info" />
            <StatCard icon={XCircle} label="Failed" value={stats.failed} tone="danger" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Documents processed this week</CardTitle>
                  <CardDescription>Across all document types</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <TrendChart data={weeklyTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document types</CardTitle>
                <CardDescription>Distribution of everything uploaded</CardDescription>
              </CardHeader>
              <CardContent>
                <DocTypeChart data={countsByType} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest files moving through the pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity documents={documents} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality snapshot</CardTitle>
                <CardDescription>Validation results across the board</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-foreground">{stats.avgConfidence}%</p>
                    <p className="text-xs text-muted-foreground">Average confidence score</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Passed validation</span>
                  <span className="font-medium text-success">{stats.passed}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${percentage(stats.passed, stats.total)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Failed validation</span>
                  <span className="font-medium text-danger">{stats.validationFailed}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-danger"
                    style={{ width: `${percentage(stats.validationFailed, stats.total)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function percentage(part: number, total: number) {
  if (!part || !total) return 0;
  return Math.round((part / total) * 100);
}

function last7Days(documents: Document[]) {
  const days: { date: Date; day: string; documents: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push({ date, day: WEEKDAY_LABELS[date.getDay()], documents: 0 });
  }

  for (const doc of documents) {
    const uploaded = new Date(doc.uploaded_at);
    const match = days.find((d) => d.date.toDateString() === uploaded.toDateString());
    if (match) match.documents += 1;
  }

  return days.map(({ day, documents }) => ({ day, documents }));
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
