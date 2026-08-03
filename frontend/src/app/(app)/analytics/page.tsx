"use client";

import { ConfidenceBarChart } from "@/components/analytics/confidence-bar-chart";
import { TrendLineChart } from "@/components/analytics/trend-line-chart";
import { ValidationChart } from "@/components/analytics/validation-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineDelayNote } from "@/components/layout/pipeline-delay-note";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  computeConfidenceByType,
  computeFourteenDayTrend,
  computeStats,
  computeValidationOutcomeByType,
  fetchDocuments,
} from "@/lib/documents-api";
import { loadCachedDocuments, saveCachedDocuments } from "@/lib/documents-cache";
import type { Document } from "@/lib/types";
import { useHasMounted } from "@/lib/use-has-mounted";
import { AlertTriangle, CheckCircle2, Gauge, TrendingUp, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      // Same cache-then-revalidate approach as Dashboard/Documents —
      // this list is shared across all three, keyed only by user, so
      // whichever page fetched most recently benefits the others too.
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
        // One fetch — stats and every chart on this page are derived
        // from this same list below (see documents-api.ts), instead
        // of a separate /documents/stats/summary call that would
        // re-run the same 5 Databricks queries a second time.
        const documentsData = await fetchDocuments();
        if (cancelled) return;
        setDocuments(documentsData);
        saveCachedDocuments(user!.id, documentsData);
      } catch (err) {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof ApiError ? err.message : "Something went wrong loading your analytics.");
        }
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
  const trend = computeFourteenDayTrend(documents);
  const confidenceByType = computeConfidenceByType(documents);
  const validationByType = computeValidationOutcomeByType(documents);
  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
  const processedInWindow = trend.reduce((sum, d) => sum + d.documents, 0);

  return (
    <div>
      <PageHeader title="Analytics" description="How well the pipeline is performing, end to end." />

      <PipelineDelayNote />

      <TopProgressBar active={refreshing && !loading} />

      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn&apos;t load your analytics: {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Gauge} label="Avg. confidence score" value={`${stats.avgConfidence}%`} tone="primary" />
            <StatCard icon={CheckCircle2} label="Validation pass rate" value={`${passRate}%`} tone="success" />
            <StatCard icon={XCircle} label="Validation failures" value={stats.validationFailed} tone="danger" />
            <StatCard icon={TrendingUp} label="Processed (14 days)" value={processedInWindow} tone="info" />
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents processed — last 14 days</CardTitle>
                <CardDescription>Volume moving through the full pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendLineChart data={trend} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average confidence by type</CardTitle>
                <CardDescription>How complete extraction is per document type</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfidenceBarChart data={confidenceByType} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validation outcomes by type</CardTitle>
                <CardDescription>Pass vs. fail counts per document type</CardDescription>
              </CardHeader>
              <CardContent>
                <ValidationChart data={validationByType} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
