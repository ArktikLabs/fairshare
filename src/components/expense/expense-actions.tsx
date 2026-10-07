"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Card, CardHeader } from "@/components/ui/primitives";
import { receiptFileProblem, uploadReceipt } from "@/components/expense-form/receipt-picker";

/** Delete (soft, restorable) or restore an expense from its detail page. */
export function ExpenseActions({
  expenseId,
  description,
  groupId,
  mode,
}: {
  expenseId: string;
  description: string;
  groupId: string | null;
  mode: "delete" | "restore";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const res =
        mode === "delete"
          ? await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" })
          : await fetch(`/api/expenses/${expenseId}/restore`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Could not ${mode} the expense`);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (mode === "restore") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" variant="secondary" onClick={run} disabled={busy}>
          <RotateCcw /> {busy ? "Restoring..." : "Restore"}
        </Button>
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="text-rose-600 hover:text-rose-700">
        <Trash2 /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${description}"?`}
        description={
          <>
            <p>It stops counting towards balances{groupId ? " in the group" : ""}. You can restore it from this page or the activity feed for 30 days.</p>
            {error && <p className="mt-2 text-rose-600">{error}</p>}
          </>
        }
        confirmLabel="Delete expense"
        danger
        busy={busy}
        onConfirm={run}
      />
    </>
  );
}

/** Receipt thumbnail (tap for full size) with add / replace / remove for people who can edit. */
export function ReceiptCard({ expenseId, hasReceipt, canManage }: { expenseId: string; hasReceipt: boolean; canManage: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [version, setVersion] = useState(0);
  const src = `/api/expenses/${expenseId}/receipt`;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = receiptFileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const err = await uploadReceipt(expenseId, file);
    setBusy(false);
    if (err) setError(err);
    else {
      setVersion((v) => v + 1);
      router.refresh();
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch(src, { method: "DELETE" });
    setBusy(false);
    setConfirm(false);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Could not remove the receipt");
    else router.refresh();
  };

  return (
    <Card>
      <CardHeader title="Receipt" description={hasReceipt ? "Only group members can see it" : undefined} />
      <div className="px-4 py-3 sm:px-5">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-label="Receipt photo" tabIndex={-1} />
        {hasReceipt ? (
          <a href={src} target="_blank" rel="noopener" className="block w-fit" aria-label="Open the full-size receipt">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated image */}
            <img
              src={`${src}?size=thumb&v=${version}`}
              alt="Receipt"
              className="max-h-56 w-auto max-w-full rounded-lg border border-slate-200 object-contain hover:opacity-90"
            />
          </a>
        ) : (
          <p className="text-sm text-slate-500">No receipt yet.</p>
        )}
        {canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
              <ImagePlus /> {busy ? "Uploading..." : hasReceipt ? "Replace" : "Add photo"}
            </Button>
            {hasReceipt && (
              <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} disabled={busy}>
                <X /> Remove
              </Button>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Remove the receipt?"
        description="The photo is deleted for everyone. The expense itself stays."
        confirmLabel="Remove receipt"
        danger
        busy={busy}
        onConfirm={remove}
      />
    </Card>
  );
}
