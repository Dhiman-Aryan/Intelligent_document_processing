"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { Eye, EyeOff, Plug, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

interface DatabricksConnectionInfo {
  workspace_url: string | null;
  http_path: string | null;
  catalog: string;
  token: string | null; // already masked by the backend
  configured: boolean;
}

interface DatabricksConnectionResult {
  connected: boolean;
  message: string;
  catalog: string | null;
}

export function DatabricksCard() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [httpPath, setHttpPath] = useState("");
  const [catalog, setCatalog] = useState("cdac-project");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const info = await api.get<DatabricksConnectionInfo>("/settings/databricks");
        if (cancelled) return;
        setWorkspaceUrl(info.workspace_url ?? "");
        setHttpPath(info.http_path ?? "");
        setCatalog(info.catalog);
        setConfigured(info.configured);
      } catch (err) {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Couldn't load Databricks settings",
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

  async function handleTestConnection() {
    if (!token || !workspaceUrl || !httpPath) {
      toast({
        variant: "error",
        title: "Missing fields",
        description: "Workspace URL, HTTP path, and token are all required to test.",
      });
      return;
    }

    setTesting(true);
    try {
      const result = await api.post<DatabricksConnectionResult>("/settings/databricks/test", {
        workspace_url: workspaceUrl,
        http_path: httpPath,
        token,
        catalog,
      });
      toast({
        variant: result.connected ? "success" : "error",
        title: result.connected ? "Connection successful" : "Connection failed",
        description: result.message,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Test failed",
        description: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!token || !workspaceUrl || !httpPath) {
      toast({
        variant: "error",
        title: "Missing fields",
        description: "Workspace URL, HTTP path, and token are all required to save.",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post<DatabricksConnectionResult>("/settings/databricks", {
        workspace_url: workspaceUrl,
        http_path: httpPath,
        token,
        catalog,
      });
      setConfigured(true);
      toast({
        variant: "success",
        title: "Saved",
        description: "Every request now uses this connection — no restart needed.",
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Databricks connection</CardTitle>
          <CardDescription>Used by the backend to read your Delta tables</CardDescription>
        </div>
        {configured ? (
          <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Configured
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Not configured
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <Label htmlFor="workspace-url">Workspace URL</Label>
          <Input
            id="workspace-url"
            value={workspaceUrl}
            onChange={(e) => setWorkspaceUrl(e.target.value)}
            placeholder="https://your-workspace.cloud.databricks.com"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="http-path">SQL warehouse HTTP path</Label>
          <Input
            id="http-path"
            value={httpPath}
            onChange={(e) => setHttpPath(e.target.value)}
            placeholder="/sql/1.0/warehouses/xxxxxxxxxxxxxxxx"
            disabled={loading}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            From your SQL warehouse&apos;s Connection details tab in Databricks.
          </p>
        </div>

        <div>
          <Label htmlFor="catalog">Catalog name</Label>
          <Input
            id="catalog"
            value={catalog}
            onChange={(e) => setCatalog(e.target.value)}
            placeholder="cdac-project"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="token">Access token</Label>
          <div className="relative">
            <Input
              id="token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="dapi••••••••••••••••••••••••••••"
              className="pr-10 font-mono text-sm"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Generate this from Databricks → User Settings → Developer → Access tokens. It is only
            used by your backend server, never sent to the browser after saving.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-2.5">
          <Button
            variant="secondary"
            icon={<Plug className="h-4 w-4" />}
            loading={testing}
            disabled={loading}
            onClick={handleTestConnection}
          >
            Test connection
          </Button>
          <Button loading={saving} disabled={loading} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
