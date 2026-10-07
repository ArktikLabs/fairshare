"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/primitives";

interface GroupState {
  id: string;
  name: string;
  description: string;
  currency: string;
  simplifyDebts: boolean;
  archived: boolean;
  autoRemindWeekly: boolean;
}

async function send(url: string, method: string, body?: unknown): Promise<string> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return "";
    const b = await res.json().catch(() => ({}));
    return b.error || "Something went wrong";
  } catch {
    return "Network error. Please try again.";
  }
}

export function GroupSettingsForm({
  group,
  isAdmin,
  currencyBlocker,
  deleteBlocker,
  isOwner,
  myMemberId,
  leaveBlocker,
}: {
  group: GroupState;
  isAdmin: boolean;
  currencyBlocker: string | null;
  deleteBlocker: string | null;
  isOwner: boolean;
  myMemberId: string;
  leaveBlocker: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [currency, setCurrency] = useState(group.currency);
  const [simplify, setSimplify] = useState(group.simplifyDebts);
  const [autoRemind, setAutoRemind] = useState(group.autoRemindWeekly);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [dangerError, setDangerError] = useState("");

  const locked = !isAdmin || group.archived;
  const nameError = name.trim() ? "" : "Give the group a name";
  const dirty =
    name.trim() !== group.name ||
    description.trim() !== group.description ||
    currency !== group.currency ||
    simplify !== group.simplifyDebts ||
    autoRemind !== group.autoRemindWeekly;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError || !dirty) return;
    setBusy(true);
    setError("");
    setNotice("");
    const err = await send(`/api/groups/${group.id}`, "PUT", {
      name: name.trim(),
      description: description.trim() || null,
      ...(currency !== group.currency ? { currency } : {}),
      simplifyDebts: simplify,
      autoRemindWeekly: autoRemind,
    });
    setBusy(false);
    if (err) setError(err);
    else {
      setNotice("Settings saved");
      router.refresh();
    }
  };

  const toggleArchive = async () => {
    setBusy(true);
    setDangerError("");
    const err = await send(`/api/groups/${group.id}`, "PUT", { archived: !group.archived });
    setBusy(false);
    setConfirmArchive(false);
    if (err) setDangerError(err);
    else router.refresh();
  };

  const leave = async () => {
    setBusy(true);
    setDangerError("");
    const err = await send(`/api/groups/${group.id}/members/${myMemberId}`, "DELETE");
    setBusy(false);
    setConfirmLeave(false);
    if (err) setDangerError(err);
    else {
      router.push("/groups");
      router.refresh();
    }
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setDangerError("");
    const err = await send(`/api/groups/${group.id}`, "DELETE", { confirmName: typed });
    setBusy(false);
    if (err) setDangerError(err);
    else {
      router.push("/groups");
      router.refresh();
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="General" />
        <CardBody>
          {group.archived && (
            <Alert tone="info" className="mb-4">
              This group is archived and read-only. {isAdmin ? "Unarchive it below to change settings." : ""}
            </Alert>
          )}
          <form onSubmit={save} className="space-y-4">
            <Field label="Name" htmlFor="g-name" error={name !== group.name ? nameError : ""}>
              <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} disabled={locked} />
            </Field>
            <Field label="Description" htmlFor="g-desc" hint="Optional, e.g. dates or what the group is for">
              <Textarea
                id="g-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={locked}
              />
            </Field>
            <Field
              label="Currency"
              htmlFor="g-currency"
              hint={
                currencyBlocker
                  ? currencyBlocker
                  : "Can be changed until the first expense or payment is added."
              }
            >
              <CurrencySelect id="g-currency" value={currency} onChange={setCurrency} disabled={locked || Boolean(currencyBlocker)} />
            </Field>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
              <div className="min-w-0">
                <p id="simplify-label" className="text-sm font-medium text-slate-900">
                  Simplify debts
                </p>
                <p id="simplify-hint" className="mt-0.5 text-xs text-slate-500">
                  {simplify
                    ? "On: settle up with the fewest payments. Someone may pay a person they never shared an expense with."
                    : "Off: everyone pays back the people they actually owe. More payments, but easier to follow."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={simplify}
                aria-labelledby="simplify-label"
                aria-describedby="simplify-hint"
                disabled={locked}
                onClick={() => setSimplify((s) => !s)}
                className={
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 " +
                  (simplify ? "bg-brand-600" : "bg-slate-300")
                }
              >
                <span
                  className={
                    "inline-block size-5 rounded-full bg-white shadow transition-transform " + (simplify ? "translate-x-5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3">
              <div className="min-w-0">
                <p id="remind-label" className="text-sm font-medium text-slate-900">
                  Weekly payment reminders
                </p>
                <p id="remind-hint" className="mt-0.5 text-xs text-slate-500">
                  {autoRemind
                    ? "On: once a week, everyone who owes money gets a reminder through their notification settings."
                    : "Off: people are only reminded when someone presses Remind."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoRemind}
                aria-labelledby="remind-label"
                aria-describedby="remind-hint"
                disabled={locked}
                onClick={() => setAutoRemind((s) => !s)}
                className={
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 " +
                  (autoRemind ? "bg-brand-600" : "bg-slate-300")
                }
              >
                <span
                  className={
                    "inline-block size-5 rounded-full bg-white shadow transition-transform " + (autoRemind ? "translate-x-5" : "translate-x-0.5")
                  }
                />
              </button>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {notice && !dirty && <Alert tone="success">{notice}</Alert>}
            {!locked && (
              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !dirty || Boolean(nameError)}>
                  {busy ? "Saving..." : "Save settings"}
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={isOwner ? "Leave, archive or delete" : isAdmin ? "Leave or archive" : "Leave the group"} />
        <ul className="divide-y divide-slate-100">
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-medium text-slate-900">Leave group</p>
              <p className="text-xs text-slate-500">{leaveBlocker ?? "You stop seeing this group. Past expenses stay for the others."}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(true)} disabled={Boolean(leaveBlocker) || busy}>
              <LogOut /> Leave
            </Button>
          </li>
          {isAdmin && (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-sm font-medium text-slate-900">{group.archived ? "Unarchive group" : "Archive group"}</p>
                <p className="text-xs text-slate-500">
                  {group.archived
                    ? "Make the group editable again."
                    : "For finished trips: the group becomes read-only and moves to the Archived list. You can undo this."}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (group.archived ? toggleArchive() : setConfirmArchive(true))}
                disabled={busy}
              >
                {group.archived ? <ArchiveRestore /> : <Archive />} {group.archived ? "Unarchive" : "Archive"}
              </Button>
            </li>
          )}
          {isOwner && (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-medium text-rose-700">Delete group</p>
              <p className="text-xs text-slate-500">
                {deleteBlocker ?? "Removes the group and its expenses for everyone. This cannot be undone."}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setTyped("");
                setDangerError("");
                setDeleting(true);
              }}
              disabled={Boolean(deleteBlocker) || !isOwner || busy}
            >
              <Trash2 /> Delete
            </Button>
          </li>
          )}
        </ul>
        {dangerError && !deleting && (
          <div className="px-4 pb-3 sm:px-5">
            <Alert tone="error">{dangerError}</Alert>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive ${group.name}?`}
        description="Nobody can add or edit expenses or payments until an admin unarchives it. Balances stay visible."
        confirmLabel="Archive group"
        busy={busy}
        onConfirm={toggleArchive}
      />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Leave ${group.name}?`}
        description="You will need a new invite to rejoin."
        confirmLabel="Leave group"
        danger
        busy={busy}
        onConfirm={leave}
      />
      <Modal open={deleting} onOpenChange={setDeleting} title={`Delete ${group.name}?`}>
        <form onSubmit={remove} className="space-y-4">
          <p className="text-sm text-slate-600">
            The group, its expenses and payments disappear for every member. This cannot be undone. Type{" "}
            <span className="font-semibold text-slate-900">{group.name}</span> to confirm.
          </p>
          <Field label="Group name" htmlFor="confirm-name">
            <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </Field>
          {dangerError && <Alert tone="error">{dangerError}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDeleting(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={busy || typed.trim() !== group.name.trim()}>
              {busy ? "Deleting..." : "Delete group forever"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
