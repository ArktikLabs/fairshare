"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, HandCoins, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { GroupSettlements, Settlement } from "@/lib/settlement-utils";
import type { PaymentRecord } from "@/lib/group-ledger";
import { parseCents } from "@/lib/split-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Alert, Avatar, Badge, Card, CardHeader, EmptyState, Money } from "@/components/ui/primitives";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other (e-wallet, etc.)" },
];
const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? "Other";

/**
 * Settle-up card for a group: suggested payments with "Record payment",
 * computed by the same ledger as every other balance in the app.
 */
export function SettleUpCard({
  groupId,
  currency,
  ledger,
  currentUserId,
  isAdmin,
  readOnly = false,
}: {
  groupId: string;
  currency: string;
  ledger: GroupSettlements;
  currentUserId: string;
  isAdmin: boolean;
  /** Archived groups: show balances, hide recording */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [paying, setPaying] = useState<Settlement | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canRecord = (s: Settlement) => !readOnly && (isAdmin || s.fromUserId === currentUserId || s.toUserId === currentUserId);
  const nameOf = (id: string, name: string) => (id === currentUserId ? "You" : name);

  // Mine first, then the rest of the group
  const suggestions = [...ledger.suggestedSettlements].sort((a, b) => {
    const mine = (s: Settlement) => (s.fromUserId === currentUserId || s.toUserId === currentUserId ? 0 : 1);
    return mine(a) - mine(b);
  });

  const open = (s: Settlement) => {
    setPaying(s);
    setAmount(s.amount.toFixed(2));
    setMethod("CASH");
    setError("");
    setNotice("");
  };

  const cents = parseCents(amount);
  const amountError = amount && (cents === null || cents <= 0) ? "Enter an amount greater than 0" : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying || cents === null || cents <= 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: paying.fromUserId,
          toUserId: paying.toUserId,
          amount: cents / 100,
          method,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not record the payment");
        return;
      }
      setNotice(
        `Recorded: ${nameOf(paying.fromUserId, paying.fromUserName)} paid ${
          paying.toUserId === currentUserId ? "you" : paying.toUserName
        } ${formatCurrency(cents / 100, currency)}`
      );
      setPaying(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="settle">
      <CardHeader
        title="Settle up"
        description={
          suggestions.length === 0
            ? "Nobody owes anything"
            : `${suggestions.length} payment${suggestions.length === 1 ? "" : "s"} clear every balance${
                ledger.simplify === false ? " (direct debts, not simplified)" : ""
              }`
        }
      />
      {notice && (
        <div className="px-4 pt-3 sm:px-5">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {suggestions.length === 0 ? (
        <EmptyState icon={<Check />} title="All settled up" className="py-6" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {suggestions.map((s) => {
            const iPay = s.fromUserId === currentUserId;
            const iGet = s.toUserId === currentUserId;
            return (
              <li key={`${s.fromUserId}-${s.toUserId}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-1.5 text-sm">
                  <span className={cn("min-w-0 truncate", iPay ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                    {nameOf(s.fromUserId, s.fromUserName)}
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-slate-400" aria-label="pays" />
                  <span className={cn("min-w-0 truncate", iGet ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                    {iGet ? "you" : s.toUserName}
                  </span>
                </div>
                <span
                  className={cn(
                    "tabular ml-auto text-sm font-semibold",
                    iPay ? "text-rose-600" : iGet ? "text-emerald-700" : "text-slate-900"
                  )}
                >
                  {formatCurrency(s.amount, currency)}
                </span>
                {canRecord(s) && (
                  <Button size="sm" variant={iPay ? "primary" : "secondary"} onClick={() => open(s)}>
                    {iPay ? "Record payment" : iGet ? "Mark received" : "Record"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={paying !== null} onOpenChange={(o) => !o && setPaying(null)} title="Record a payment">
        {paying && (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{nameOf(paying.fromUserId, paying.fromUserName)}</span> paid{" "}
              <span className="font-medium text-slate-900">
                {paying.toUserId === currentUserId ? "you" : paying.toUserName}
              </span>
              . This is recorded only; no money moves through FairShare.
            </p>
            <Field label={`Amount (${currency})`} htmlFor="pay-amount" error={amountError}>
              <Input
                id="pay-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amountError ? true : undefined}
                autoFocus
              />
            </Field>
            <Field label="Method" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setPaying(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || cents === null || cents <= 0}>
                {saving ? "Saving..." : "Record payment"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  );
}

/** Per-member balances from the ledger, with honest "paid / received" wording. */
export function BalancesCard({
  ledger,
  currency,
  currentUserId,
}: {
  ledger: GroupSettlements;
  currency: string;
  currentUserId: string;
}) {
  const fmt = (n: number) => formatCurrency(n, currency);
  const isZero = (n: number) => Math.round(n * 100) === 0;
  const rows = ledger.balances
    .filter(
      (b) =>
        b.userId === currentUserId || !isZero(b.totalPaid) || !isZero(b.totalOwed) || !isZero(b.settledNet) || !isZero(b.netBalance)
    )
    .sort((a, b) =>
    a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : b.netBalance - a.netBalance
  );
  return (
    <Card>
      <CardHeader title="Balances" description="Positive = is owed money, negative = owes" />
      <ul className="divide-y divide-slate-100">
        {rows.map((b) => {
          const settled = Math.round(b.settledNet * 100);
          return (
            <li key={b.userId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar name={b.name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  <span className="truncate">{b.name}</span>
                  {b.userId === currentUserId && <Badge tone="brand">You</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  Paid {fmt(b.totalPaid)} · Share {fmt(b.totalOwed)}
                  {settled > 0 && <> · Sent {fmt(b.settledNet)}</>}
                  {settled < 0 && <> · Received {fmt(-b.settledNet)}</>}
                </p>
              </div>
              <Money amount={b.netBalance} currency={currency} signed className="text-sm font-semibold" />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Recorded payments, with edit and delete (undo) for the payer, the receiver or an admin. */
export function PaymentsCard({
  groupId,
  history,
  currency,
  currentUserId,
}: {
  groupId: string;
  history: PaymentRecord[];
  currency: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PaymentRecord | null>(null);
  const [deleting, setDeleting] = useState<PaymentRecord | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null);
  const [notice, setNotice] = useState("");

  if (history.length === 0 && !undo && !notice) return null;
  const name = (p: { id: string; name: string }) => (p.id === currentUserId ? "You" : p.name);
  const line = (p: PaymentRecord) =>
    `${name(p.from)} paid ${p.to.id === currentUserId ? "you" : p.to.name} ${formatCurrency(p.amount, currency)}`;
  const cents = parseCents(amount);
  const amountError = amount && (cents === null || cents <= 0) ? "Enter an amount greater than 0" : "";

  const call = async (id: string, init: RequestInit) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements/${id}`, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Something went wrong");
        return false;
      }
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || cents === null || cents <= 0) return;
    if (await call(editing.id, { method: "PATCH", body: JSON.stringify({ amount: cents / 100, method }) })) {
      setNotice(`Payment updated to ${formatCurrency(cents / 100, currency)}`);
      setUndo(null);
      setEditing(null);
      router.refresh();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (await call(deleting.id, { method: "DELETE" })) {
      setUndo({ id: deleting.id, text: `Deleted: ${line(deleting)}` });
      setNotice("");
      setDeleting(null);
      router.refresh();
    }
  };

  const restore = async () => {
    if (!undo) return;
    if (await call(undo.id, { method: "POST", body: JSON.stringify({ action: "restore" }) })) {
      setNotice("Payment restored");
      setUndo(null);
      router.refresh();
    }
  };

  return (
    <Card id="payments" className="scroll-mt-20">
      <CardHeader title="Payments" description="Recorded settle-up payments" />
      {(undo || notice || (error && !editing && !deleting)) && (
        <div className="space-y-2 px-4 pt-3 sm:px-5">
          {undo && (
            <Alert tone="warning">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{undo.text}</span>
                <Button size="sm" variant="secondary" onClick={restore} disabled={busy}>
                  <RotateCcw /> Undo
                </Button>
              </div>
            </Alert>
          )}
          {notice && <Alert tone="success">{notice}</Alert>}
          {error && !editing && !deleting && <Alert tone="error">{error}</Alert>}
        </div>
      )}
      {history.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500 sm:px-5">No payments recorded.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {history.slice(0, 10).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <HandCoins className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-900">
                  <span className="font-medium">{name(p.from)}</span> paid{" "}
                  <span className="font-medium">{p.to.id === currentUserId ? "you" : p.to.name}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(p.createdAt)} · {methodLabel(p.method)}
                </p>
              </div>
              <Money amount={p.amount} currency={currency} className="text-sm font-semibold text-slate-900" />
              {p.canManage ? (
                <ActionMenu
                  label={`Actions for payment: ${line(p)}`}
                  actions={[
                    {
                      label: "Edit payment",
                      icon: <Pencil />,
                      onSelect: () => {
                        setEditing(p);
                        setAmount(p.amount.toFixed(2));
                        setMethod(METHODS.some((m) => m.value === p.method) ? p.method : "OTHER");
                        setError("");
                      },
                    },
                    {
                      label: "Delete payment",
                      icon: <Trash2 />,
                      danger: true,
                      onSelect: () => {
                        setDeleting(p);
                        setError("");
                      },
                    },
                  ]}
                />
              ) : (
                <span className="size-8 shrink-0" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Edit payment">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{name(editing.from)}</span> paid{" "}
              <span className="font-medium text-slate-900">{editing.to.id === currentUserId ? "you" : editing.to.name}</span>{" "}
              on {formatDate(editing.createdAt)}.
            </p>
            <Field label={`Amount (${currency})`} htmlFor="edit-pay-amount" error={amountError}>
              <Input
                id="edit-pay-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amountError ? true : undefined}
                autoFocus
              />
            </Field>
            <Field label="Method" htmlFor="edit-pay-method">
              <Select id="edit-pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || cents === null || cents <= 0}>
                {busy ? "Saving..." : "Save payment"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this payment?"
        description={
          deleting && (
            <>
              <p>{line(deleting)}. Balances go back to how they were before it was recorded. You can undo this.</p>
              {error && <p className="mt-2 text-rose-600">{error}</p>}
            </>
          )
        }
        confirmLabel="Delete payment"
        danger
        busy={busy}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
