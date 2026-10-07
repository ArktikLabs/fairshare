"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/primitives";

/** For people you only know from groups: start a 1:1 balance with them. */
export function StartDirect({ friendId, name }: { friendId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/friends/${friendId}`, { method: "POST" }).catch(() => null);
    if (res?.ok) {
      router.push(`/friends/${friendId}/expenses/create`);
      router.refresh();
    } else {
      setError("Could not start a 1:1 balance");
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title="Just the two of you" description={`Split something with ${name} outside your groups.`} />
      <CardBody className="space-y-3">
        <Button onClick={start} disabled={busy}>
          <Plus /> Add an expense with {name}
        </Button>
        {error && <Alert tone="error">{error}</Alert>}
      </CardBody>
    </Card>
  );
}
