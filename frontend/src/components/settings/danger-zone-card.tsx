"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

export function DangerZoneCard() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setOpen(false);
      toast({
        variant: "info",
        title: "Not wired up yet",
        description: "Account deletion will be enabled once the backend is connected.",
      });
    }, 800);
  }

  return (
    <>
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with care</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently removes your account and all uploaded documents.
            </p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        description="This will permanently delete your account and every document you've uploaded. This action can't be undone."
        confirmLabel="Delete account"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
