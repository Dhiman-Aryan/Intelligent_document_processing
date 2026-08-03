"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CalendarClock, MousePointerClick, Play } from "lucide-react";
import { useEffect, useState } from "react";

type ScheduleMode = "manual" | "scheduled";

interface PipelineScheduleInfo {
  mode: ScheduleMode;
  interval_minutes: number | null;
}

interface RunPipelineResult {
  run_id: string | null;
  status: "started" | "already_running";
  message: string;
}

const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60];

export function PipelineScheduleCard() {
  const { toast } = useToast();
  const [mode, setMode] = useState<ScheduleMode>("manual");
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const info = await api.get<PipelineScheduleInfo>("/settings/pipeline-schedule");
        if (cancelled) return;
        setMode(info.mode);
        if (info.interval_minutes) setIntervalMinutes(info.interval_minutes);
      } catch (err) {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Couldn't load pipeline schedule",
            description: err instanceof ApiError ? err.message : "Something went wrong.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.post<PipelineScheduleInfo>("/settings/pipeline-schedule", {
        mode,
        interval_minutes: mode === "scheduled" ? intervalMinutes : null,
      });
      toast({
        variant: "success",
        title: "Saved",
        description:
          mode === "scheduled"
            ? `The pipeline now runs automatically every ${intervalMinutes} minutes.`
            : 'The pipeline no longer runs on its own — use "Run pipeline now" below whenever you want it to process what\'s waiting.',
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Save failed",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunningNow(true);
    try {
      const result = await api.post<RunPipelineResult>("/settings/pipeline-schedule/run-now");
      toast({
        variant: result.status === "started" ? "success" : "info",
        title: result.status === "started" ? "Pipeline started" : "Already running",
        description: result.message,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't start the pipeline",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setRunningNow(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline schedule</CardTitle>
        <CardDescription>
          Controls when the Databricks pipeline runs. Uploading a file never starts a run by
          itself — it only saves to the Volume. Limited to one run at a time either way, so two
          runs never compete over the same tables.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <Label>Trigger mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("manual")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-50",
                mode === "manual" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Manual</span>
              <span className="text-xs text-muted-foreground">
                Never runs on its own — files just wait in the Volume until you run it below.
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("scheduled")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-50",
                mode === "scheduled" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Scheduled</span>
              <span className="text-xs text-muted-foreground">
                Runs on a fixed interval — uploads no longer trigger it directly.
              </span>
            </button>
          </div>
        </div>

        {mode === "scheduled" && (
          <div>
            <Label htmlFor="interval-minutes">Run every</Label>
            <select
              id="interval-minutes"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20"
            >
              {INTERVAL_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Only intervals that divide evenly into an hour are offered, so the schedule stays
              genuinely evenly spaced (no gap at the top of the hour).
            </p>
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2.5">
          <Button loading={saving} disabled={loading} onClick={handleSave}>
            Save changes
          </Button>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2.5 text-xs text-muted-foreground">
            Starts a run right now, regardless of the mode above — the only way to actually
            process pending files while in Manual mode.
          </p>
          <Button
            variant="secondary"
            icon={<Play className="h-4 w-4" />}
            loading={runningNow}
            disabled={loading}
            onClick={handleRunNow}
          >
            Run pipeline now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
