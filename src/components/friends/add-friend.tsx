"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/primitives";

export function AddFriend() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: "error", text: j.error || "Could not add friend" });
        return;
      }
      router.push(`/friends/${j.id}`);
      router.refresh();
    } catch {
      setMsg({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Add a friend" description="If they are not on FairShare yet, we email them an invite." />
      <CardBody>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label="Email" htmlFor="friend-email">
            <Input id="friend-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
          </Field>
          <Button type="submit" disabled={busy || !valid} className="w-full sm:w-auto">
            <UserPlus /> {busy ? "Adding..." : "Add friend"}
          </Button>
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        </form>
      </CardBody>
    </Card>
  );
}
