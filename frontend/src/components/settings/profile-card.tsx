"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth";
import { useHasMounted } from "@/lib/use-has-mounted";
import { initials } from "@/lib/utils";
import { useState } from "react";

export function ProfileCard() {
  const mounted = useHasMounted();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal account information</CardDescription>
      </CardHeader>
      <CardContent>{mounted ? <ProfileForm /> : <ProfileFormSkeleton />}</CardContent>
    </Card>
  );
}

// Only ever rendered client-side (after the mount gate above), so reading
// the logged-in user from localStorage here — to seed the editable name/
// email fields — can't cause a server/client hydration mismatch.
function ProfileForm() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        variant: "info",
        title: "Not wired up yet",
        description: "Editing your profile needs a backend endpoint that doesn't exist yet — ask me to build it if you want this to actually save.",
      });
    }, 400);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {initials(name)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">Not wired up in this demo yet</p>
        </div>
      </div>

      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

function ProfileFormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}
