"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Repeat, Square } from "lucide-react";
import type { RecurringView } from "@/lib/recurring";
import { frequencyLabel } from "@/lib/recurrence";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader } from "@/components/ui/primitives";

const STATUS: Record<RecurringView["status"], { label: string; tone: "positive" | "warning" | "neutral" }> = {
  ACTIVE: { label: "Active", tone: "positive" },
  PAUSED: { label: "Paused", tone: "warning" },
  STOPPED: { label: "Stopped", tone: "neutral" },
};

/** Pause / resume / stop a repeating expense (shared by the expense page and group settings). */
export function useRecurringAction(id: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (status: "ACTIVE" | "PAUSED" | "STOPPED") => {
    if (status === "STOPPED" && !confirm("Stop repeating this expense? Expenses already added stay.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "Could not update");
      else router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export function RecurringActions({ r, size = "sm" }: { r: RecurringView; size?: "sm" | "md" }) {
  const { busy, error, run } = useRecurringAction(r.id);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {r.status === "ACTIVE" ? (
          <Button variant="secondary" size={size} onClick={() => run("PAUSED")} disabled={busy}>
            <Pause /> Pause
          </Button>
        ) : r.status === "PAUSED" ? (
          <Button variant="secondary" size={size} onClick={() => run("ACTIVE")} disabled={busy}>
            <Play /> Resume
          </Button>
        ) : null}
        {r.status !== "STOPPED" && (
          <Button variant="ghost" size={size} onClick={() => run("STOPPED")} disabled={busy}>
            <Square /> Stop
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export function RecurringCard({
  recurring: r,
  currency,
  canManage,
  isSource,
}: {
  recurring: RecurringView;
  currency: string;
  canManage: boolean;
  isSource: boolean;
}) {
  const st = STATUS[r.status];
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Repeat className="size-4 text-slate-500" aria-hidden /> Repeats
          </span>
        }
        action={<Badge tone={st.tone}>{st.label}</Badge>}
      />
      <div className="space-y-3 px-4 pb-4 text-sm sm:px-5">
        <p className="text-slate-700">
          {frequencyLabel(r.frequency)}, {formatCurrency(r.amount / 100, currency)}
          {r.endDate ? ` until ${formatDate(r.endDate)}` : ""}.{" "}
          {r.status === "ACTIVE" && <>Next on <span className="font-medium">{formatDate(r.nextDate)}</span>.</>}
        </p>
        <p className="text-xs text-slate-500">
          Added as {r.ownerName}. {r.count} so far.
          {!isSource && " This expense was added automatically."}
          {isSource && canManage && " Edit this expense to change the amount, split or schedule of future ones."}
        </p>
        {r.lastError && <Alert tone="warning">Not added: {r.lastError}</Alert>}
        {canManage && <RecurringActions r={r} />}
      </div>
    </Card>
  );
}
