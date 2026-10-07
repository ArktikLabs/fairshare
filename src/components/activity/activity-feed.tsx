"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  HandCoins,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLine, ActivityTypeName } from "@/lib/activity-format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export interface FeedItem {
  id: string;
  type: ActivityTypeName;
  groupId: string | null;
  expenseId: string | null;
  settlementId: string | null;
  createdAt: string;
  line: ActivityLine;
}

const ICONS: Partial<Record<ActivityTypeName, [LucideIcon, string]>> = {
  EXPENSE_CREATED: [Plus, "bg-brand-50 text-brand-700"],
  EXPENSE_UPDATED: [Pencil, "bg-sky-50 text-sky-700"],
  EXPENSE_DELETED: [Trash2, "bg-rose-50 text-rose-600"],
  EXPENSE_RESTORED: [RotateCcw, "bg-emerald-50 text-emerald-700"],
  PAYMENT_RECORDED: [HandCoins, "bg-emerald-50 text-emerald-700"],
  PAYMENT_UPDATED: [HandCoins, "bg-sky-50 text-sky-700"],
  PAYMENT_DELETED: [Trash2, "bg-rose-50 text-rose-600"],
  PAYMENT_RESTORED: [RotateCcw, "bg-emerald-50 text-emerald-700"],
  MEMBER_INVITED: [UserPlus, "bg-amber-50 text-amber-800"],
  MEMBER_JOINED: [UserPlus, "bg-emerald-50 text-emerald-700"],
  MEMBER_LEFT: [UserMinus, "bg-slate-100 text-slate-600"],
  MEMBER_REMOVED: [UserMinus, "bg-slate-100 text-slate-600"],
  MEMBER_ROLE_CHANGED: [Users, "bg-slate-100 text-slate-600"],
  GROUP_CREATED: [Users, "bg-brand-50 text-brand-700"],
  GROUP_RENAMED: [Settings, "bg-slate-100 text-slate-600"],
  GROUP_SETTINGS_CHANGED: [Settings, "bg-slate-100 text-slate-600"],
  GROUP_ARCHIVED: [Archive, "bg-slate-100 text-slate-600"],
  GROUP_UNARCHIVED: [Archive, "bg-slate-100 text-slate-600"],
  COMMENT_ADDED: [MessageSquare, "bg-sky-50 text-sky-700"],
};

// Relative times depend on "now" and the reader's time zone, so they are only
// rendered in the browser; the server (and hydration) show the plain date.
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 30000);
  return () => clearInterval(t);
};
const nowMinute = () => Math.floor(Date.now() / 60000);
const serverMinute = () => null;

function When({ iso }: { iso: string }) {
  const minute = useSyncExternalStore(subscribeMinute, nowMinute, serverMinute);
  return (
    <time dateTime={iso} title={minute === null ? undefined : new Date(iso).toLocaleString()}>
      {minute === null ? iso.slice(0, 10) : when(iso, minute * 60000)}
    </time>
  );
}

function when(iso: string, now: number) {
  const d = new Date(iso);
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

/** Activity lines with "Load more" paging through /api/activity. */
export function ActivityFeed({
  initial,
  nextCursor: firstCursor,
  groupId,
}: {
  initial: FeedItem[];
  nextCursor: string | null;
  /** Narrow to one group (the group page tab). */
  groupId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(firstCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [undone, setUndone] = useState<Record<string, string>>({});

  // Server refreshes (after an undo) bring new initial items
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setItems(initial);
    setCursor(firstCursor);
  }

  const more = async () => {
    if (!cursor) return;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ cursor, limit: "30", ...(groupId ? { groupId } : {}) });
      const res = await fetch(`/api/activity?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setItems((xs) => [...xs, ...body.items]);
      setCursor(body.nextCursor);
    } catch {
      setError("Could not load more activity");
    } finally {
      setLoading(false);
    }
  };

  const restorePayment = async (a: FeedItem) => {
    const res = await fetch(`/api/groups/${a.groupId}/settlements/${a.settlementId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const body = await res.json().catch(() => ({}));
    setUndone((u) => ({ ...u, [a.id]: res.ok ? "Restored" : body.error || "Could not restore" }));
    if (res.ok) router.refresh();
  };

  // Newest first: anything deleted and later restored/deleted again only offers
  // "Restore" on its most recent delete, and not once it has been restored.
  const latestById = new Map<string, string>();
  for (const a of items) {
    const key = a.expenseId ?? a.settlementId;
    if (key && !latestById.has(key) && /_(DELETED|RESTORED)$/.test(a.type)) latestById.set(key, a.id);
  }
  const undoable = (a: FeedItem) => latestById.get((a.expenseId ?? a.settlementId) || "") === a.id;

  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {items.map((a) => {
          const [Icon, tone] = ICONS[a.type] ?? [Users, "bg-slate-100 text-slate-600"];
          const text = <span className="break-words">{a.line.text}</span>;
          return (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-slate-800">
                  {a.line.href ? (
                    <Link href={a.line.href} className="hover:text-brand-700 hover:underline">
                      {text}
                    </Link>
                  ) : (
                    text
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.line.detail && (
                    <span
                      className={cn(
                        "font-medium",
                        a.line.detail.tone === "positive" ? "text-emerald-700" : a.line.detail.tone === "negative" ? "text-rose-600" : "text-slate-600"
                      )}
                    >
                      {a.line.detail.text} ·{" "}
                    </span>
                  )}
                  <When iso={a.createdAt} />
                </p>
              </div>
              {a.type === "EXPENSE_DELETED" && a.line.href && undoable(a) && (
                <Link href={a.line.href} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
                  Restore
                </Link>
              )}
              {a.type === "PAYMENT_DELETED" && a.groupId && a.settlementId && undoable(a) && (
                undone[a.id] ? (
                  <span className="max-w-32 shrink-0 text-right text-xs text-slate-500">{undone[a.id]}</span>
                ) : (
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => restorePayment(a)}>
                    <RotateCcw /> Undo
                  </Button>
                )
              )}
            </li>
          );
        })}
      </ul>
      {(cursor || error) && (
        <div className="border-t border-slate-100 px-4 py-3 text-center sm:px-5">
          {error && <p className="mb-2 text-xs text-rose-600" role="alert">{error}</p>}
          {cursor && (
            <Button variant="secondary" size="sm" onClick={more} disabled={loading}>
              {loading ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
