"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Share2, ShieldCheck, ShieldOff, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionMenu, type MenuAction } from "@/components/ui/action-menu";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, Avatar, Badge, Card, CardHeader, Money } from "@/components/ui/primitives";

export interface MemberRow {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED";
  inviteLink: string | null;
  name: string;
  email: string;
  /** From the ledger; null for pending invites. */
  balance: number | null;
}

/** Copy to clipboard, falling back to the native share sheet on phones. */
async function copyOrShare(link: string, title: string): Promise<"copied" | "shared" | "failed"> {
  try {
    await navigator.clipboard.writeText(link);
    return "copied";
  } catch {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: link });
        return "shared";
      } catch {
        /* cancelled */
      }
    }
    return "failed";
  }
}

const roleLabel = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" } as const;

export function MembersCard({
  groupId,
  groupName,
  currency,
  members,
  currentUserId,
  isAdmin,
}: {
  groupId: string;
  groupName: string;
  currency: string;
  members: MemberRow[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; link?: string | null } | null>(null);
  const [confirm, setConfirm] = useState<MemberRow | null>(null);

  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email address" : "";
  const admins = members.filter((m) => m.status === "ACTIVE" && (m.role === "ADMIN" || m.role === "OWNER")).length;

  const share = async (link: string, who: string) => {
    const r = await copyOrShare(link, `Join ${groupName} on FairShare`);
    setNotice(
      r === "failed"
        ? { text: `Copy this invite link for ${who}:`, link }
        : { text: r === "copied" ? `Invite link for ${who} copied` : `Invite link for ${who} shared` }
    );
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || emailError) return;
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not invite this person");
        return;
      }
      const link: string | null = body.member?.inviteLink ?? null;
      let copied = false;
      if (link) copied = (await copyOrShare(link, `Join ${groupName} on FairShare`)) !== "failed";
      const what = body.alreadyInvited ? `${addr} was already invited.` : `${addr} invited.`;
      const how = body.emailSent
        ? body.alreadyInvited
          ? " Invitation email resent"
          : " Invitation emailed"
        : "";
      const linkPart = link ? (copied ? `${how ? " and" : ""} link copied.` : how ? "." : "") : how ? "." : "";
      setNotice({
        text: `${what}${how}${linkPart} They can be added to expenses right away.`,
        link: copied ? null : link,
      });
      setEmail("");
      setInviting(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m: MemberRow, role: "ADMIN" | "MEMBER") => {
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "Could not change the role");
      else {
        setNotice({ text: `${m.name} is now ${role === "ADMIN" ? "an admin" : "a member"}` });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: MemberRow) => {
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${m.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "Could not remove this person");
      else {
        setNotice({ text: m.status === "INVITED" ? `Invite for ${m.email} cancelled` : `${m.name} removed` });
        router.refresh();
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const actionsFor = (m: MemberRow): MenuAction[] => {
    const out: MenuAction[] = [];
    if (m.status === "INVITED" && m.inviteLink) {
      out.push({ label: "Copy invite link", icon: <Link2 />, onSelect: () => share(m.inviteLink!, m.email) });
    }
    if (!isAdmin || m.userId === currentUserId || m.role === "OWNER") return out;
    if (m.status === "ACTIVE") {
      out.push(
        m.role === "ADMIN"
          ? {
              label: "Make member",
              icon: <ShieldOff />,
              disabled: admins <= 1,
              onSelect: () => changeRole(m, "MEMBER"),
            }
          : { label: "Make admin", icon: <ShieldCheck />, onSelect: () => changeRole(m, "ADMIN") }
      );
    }
    out.push({
      label: m.status === "INVITED" ? "Cancel invite" : "Remove from group",
      icon: m.status === "INVITED" ? <X /> : <UserMinus />,
      danger: true,
      onSelect: () => setConfirm(m),
    });
    return out;
  };

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const invitedCount = members.length - activeCount;

  return (
    <Card id="members">
      <CardHeader
        title="Members"
        description={`${activeCount} active${invitedCount ? ` · ${invitedCount} invited` : ""}`}
        action={
          isAdmin && !inviting ? (
            <Button size="sm" variant="secondary" onClick={() => setInviting(true)}>
              <UserPlus /> Invite
            </Button>
          ) : null
        }
      />
      <div className="space-y-3 px-4 pt-3 empty:hidden sm:px-5">
        {inviting && (
          <form onSubmit={invite} className="space-y-2" noValidate>
            <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700">
              Invite by email
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoFocus
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                disabled={busy}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy || !email.trim() || !!emailError} className="flex-1 sm:flex-none">
                  {busy ? "Inviting..." : "Send invite"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setInviting(false);
                    setEmail("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {emailError ? (
              <p className="text-xs text-rose-600">{emailError}</p>
            ) : (
              <p className="text-xs text-slate-500">
                We email them a join link and copy it for you. They show up in expenses right away.
              </p>
            )}
          </form>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {notice && (
          <Alert tone="success">
            <p>{notice.text}</p>
            {notice.link && <CopyLinkRow link={notice.link} />}
          </Alert>
        )}
      </div>
      <ul className="mt-1 divide-y divide-slate-100">
        {members.map((m) => {
          const actions = actionsFor(m);
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                  <span className="truncate">{m.name}</span>
                  {m.userId === currentUserId && <Badge tone="brand">You</Badge>}
                  {m.status === "INVITED" && <Badge tone="warning">Invited</Badge>}
                  {m.role !== "MEMBER" && m.status === "ACTIVE" && <Badge>{roleLabel[m.role]}</Badge>}
                </p>
                {m.name !== m.email && <p className="truncate text-xs text-slate-500">{m.email}</p>}
              </div>
              {m.balance !== null ? (
                <Money amount={m.balance} currency={currency} signed className="text-sm font-medium" />
              ) : (
                <span className="text-xs text-slate-400">not joined</span>
              )}
              {actions.length > 0 ? (
                <ActionMenu label={`Actions for ${m.name}`} actions={actions} />
              ) : (
                <span className="w-8" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.status === "INVITED" ? "Cancel this invite?" : `Remove ${confirm?.name}?`}
        description={
          confirm?.status === "INVITED"
            ? `The invite link for ${confirm?.email} stops working.`
            : "They lose access to the group. Their expenses stay on the books."
        }
        confirmLabel={confirm?.status === "INVITED" ? "Cancel invite" : "Remove"}
        danger
        busy={busy}
        onConfirm={() => confirm && remove(confirm)}
      />
    </Card>
  );
}

function CopyLinkRow({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.target.select()}
        aria-label="Invite link"
        className="h-8 min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-2 text-xs text-slate-700"
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          const r = await copyOrShare(link, "FairShare invite");
          setCopied(r !== "failed");
        }}
      >
        {copied ? <Check /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
