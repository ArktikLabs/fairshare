// Turns stored Activity rows into human-readable lines, from the point of
// view of the person reading them ("you"). Pure: the payload carries a
// snapshot of names and amounts taken when the event happened, so lines stay
// right even after people rename or leave.

import { categoryLabel } from "./categories";
import type { ExpenseChange } from "./expense-compute";
import { formatCurrency } from "./utils";

export type ActivityTypeName =
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "EXPENSE_RESTORED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "MEMBER_INVITED"
  | "MEMBER_JOINED"
  | "MEMBER_LEFT"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED"
  | "GROUP_CREATED"
  | "GROUP_RENAMED"
  | "GROUP_SETTINGS_CHANGED"
  | "GROUP_ARCHIVED"
  | "GROUP_UNARCHIVED"
  | "COMMENT_ADDED";

export type SettingChange =
  | { field: "currency"; from: string; to: string }
  | { field: "simplifyDebts"; to: boolean }
  | { field: "description" };

export interface ActivityPayload {
  actorName?: string;
  groupName?: string;
  currency?: string;
  // expenses
  description?: string;
  /** cents */
  amount?: number;
  /** userId -> cents (paid - share); + = lent, - = owes */
  impact?: Record<string, number>;
  changes?: ExpenseChange[];
  // payments
  fromId?: string;
  fromName?: string;
  toId?: string;
  toName?: string;
  /** cents, previous amount on edits */
  previousAmount?: number;
  // members
  targetName?: string;
  role?: string;
  // group
  oldName?: string;
  newName?: string;
  settings?: SettingChange[];
  // comments
  snippet?: string;
}

export interface ActivityLike {
  type: ActivityTypeName;
  actorId: string;
  groupId: string | null;
  expenseId: string | null;
  settlementId: string | null;
  targetUserId: string | null;
  payload: ActivityPayload;
}

export interface ActivityLine {
  text: string;
  /** What it means for the reader, e.g. "you owe $25.00" */
  detail: { text: string; tone: "positive" | "negative" | "neutral" } | null;
  href: string | null;
}

const q = (s: string | undefined) => `"${s ?? "an expense"}"`;

function changeText(ch: ExpenseChange, currency: string): string {
  switch (ch.field) {
    case "description":
      return `renamed to ${q(ch.to)}`;
    case "amount":
      return `amount ${formatCurrency(ch.from / 100, currency)} → ${formatCurrency(ch.to / 100, currency)}`;
    case "date":
      return `date ${ch.from} → ${ch.to}`;
    case "category":
      return `category ${categoryLabel(ch.from)} → ${categoryLabel(ch.to)}`;
    case "notes":
      return "notes";
    case "payers":
      return "who paid";
    case "split":
      return "the split";
    case "items":
      return "the items";
    case "receipt":
      return ch.to ? "added a receipt" : "removed the receipt";
  }
}

function settingText(s: SettingChange): string {
  switch (s.field) {
    case "currency":
      return `currency ${s.from} → ${s.to}`;
    case "simplifyDebts":
      return `simplify debts ${s.to ? "on" : "off"}`;
    case "description":
      return "description";
  }
}

/** Join a list as "a, b and c". */
export function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

export function describeActivity(
  a: ActivityLike,
  viewerId: string,
  opts: { showGroup?: boolean } = {}
): ActivityLine {
  const p = a.payload ?? {};
  const cur = p.currency || "USD";
  const money = (cents: number) => formatCurrency(Math.abs(cents) / 100, cur);
  const actor = a.actorId === viewerId ? "You" : p.actorName || "Someone";
  const who = (id: string | null | undefined, name: string | undefined) => (id && id === viewerId ? "you" : name || "someone");
  const inGroup = opts.showGroup !== false && p.groupName ? ` in ${p.groupName}` : "";
  const expenseHref = a.expenseId ? `/expenses/${a.expenseId}` : null;
  const groupHref = a.groupId ? `/groups/${a.groupId}` : null;

  const impactDetail = (verbPast = false): ActivityLine["detail"] => {
    if (!p.impact) return null;
    const mine = p.impact[viewerId] ?? 0;
    if (mine === 0) return viewerId in p.impact ? { text: "you are even on this", tone: "neutral" } : null;
    if (verbPast) {
      return mine > 0
        ? { text: `you are no longer owed ${money(mine)}`, tone: "neutral" }
        : { text: `you no longer owe ${money(mine)}`, tone: "neutral" };
    }
    return mine > 0 ? { text: `you get back ${money(mine)}`, tone: "positive" } : { text: `you owe ${money(mine)}`, tone: "negative" };
  };

  switch (a.type) {
    case "EXPENSE_CREATED":
      return { text: `${actor} added ${q(p.description)}${inGroup}`, detail: impactDetail(), href: expenseHref };
    case "EXPENSE_UPDATED": {
      const parts = (p.changes ?? []).map((ch) => changeText(ch, cur));
      const what = parts.length ? `: ${joinList(parts)}` : "";
      return { text: `${actor} edited ${q(p.description)}${inGroup}${what}`, detail: impactDetail(), href: expenseHref };
    }
    case "EXPENSE_DELETED":
      return { text: `${actor} deleted ${q(p.description)}${inGroup}`, detail: impactDetail(true), href: expenseHref };
    case "EXPENSE_RESTORED":
      return { text: `${actor} restored ${q(p.description)}${inGroup}`, detail: impactDetail(), href: expenseHref };

    case "PAYMENT_RECORDED":
    case "PAYMENT_UPDATED":
    case "PAYMENT_DELETED":
    case "PAYMENT_RESTORED": {
      const from = who(p.fromId, p.fromName);
      const to = who(p.toId, p.toName);
      const amt = money(p.amount ?? 0);
      const href = a.groupId ? `/groups/${a.groupId}#payments` : null;
      const mine =
        p.fromId === viewerId ? -(p.amount ?? 0) : p.toId === viewerId ? p.amount ?? 0 : 0;
      let text: string;
      if (a.type === "PAYMENT_RECORDED") {
        text =
          a.actorId === p.fromId
            ? `${actor} paid ${to} ${amt}${inGroup}`
            : `${actor} recorded a payment: ${from} paid ${to} ${amt}${inGroup}`;
      } else if (a.type === "PAYMENT_UPDATED") {
        const change =
          p.previousAmount !== undefined && p.previousAmount !== p.amount
            ? `${money(p.previousAmount)} → ${amt}`
            : amt;
        text = `${actor} edited a payment from ${from} to ${to}${inGroup}: ${change}`;
      } else if (a.type === "PAYMENT_DELETED") {
        text = `${actor} deleted a payment of ${amt} from ${from} to ${to}${inGroup}`;
      } else {
        text = `${actor} restored a payment of ${amt} from ${from} to ${to}${inGroup}`;
      }
      // Payments move balances the other way: the payer's debt shrinks
      const detail: ActivityLine["detail"] =
        mine === 0 || a.type === "PAYMENT_DELETED" || a.type === "PAYMENT_UPDATED"
          ? null
          : mine < 0
            ? { text: `you paid ${money(mine)}`, tone: "neutral" }
            : { text: `you received ${money(mine)}`, tone: "neutral" };
      return { text: text.charAt(0).toUpperCase() + text.slice(1), detail, href };
    }

    case "MEMBER_INVITED":
      return { text: `${actor} invited ${who(a.targetUserId, p.targetName)} to ${p.groupName ?? "the group"}`, detail: null, href: groupHref };
    case "MEMBER_JOINED":
      return { text: `${actor} joined ${p.groupName ?? "the group"}`, detail: null, href: groupHref };
    case "MEMBER_LEFT":
      return { text: `${actor} left ${p.groupName ?? "the group"}`, detail: null, href: groupHref };
    case "MEMBER_REMOVED":
      return { text: `${actor} removed ${who(a.targetUserId, p.targetName)} from ${p.groupName ?? "the group"}`, detail: null, href: groupHref };
    case "MEMBER_ROLE_CHANGED":
      return {
        text: `${actor} made ${who(a.targetUserId, p.targetName)} ${p.role === "ADMIN" ? "an admin" : "a member"}${inGroup}`,
        detail: null,
        href: groupHref,
      };

    case "GROUP_CREATED":
      return { text: `${actor} created ${p.groupName ?? "a group"}`, detail: null, href: groupHref };
    case "GROUP_RENAMED":
      return { text: `${actor} renamed ${p.oldName ?? "the group"} to ${p.newName ?? p.groupName ?? "?"}`, detail: null, href: groupHref };
    case "GROUP_SETTINGS_CHANGED": {
      const parts = (p.settings ?? []).map(settingText);
      return {
        text: `${actor} changed ${parts.length ? joinList(parts) : "settings"}${inGroup}`,
        detail: null,
        href: a.groupId ? `/groups/${a.groupId}/settings` : null,
      };
    }
    case "GROUP_ARCHIVED":
      return { text: `${actor} archived ${p.groupName ?? "the group"}`, detail: null, href: groupHref };
    case "GROUP_UNARCHIVED":
      return { text: `${actor} unarchived ${p.groupName ?? "the group"}`, detail: null, href: groupHref };

    case "COMMENT_ADDED":
      return {
        text: `${actor} commented on ${q(p.description)}${inGroup}${p.snippet ? `: “${p.snippet}”` : ""}`,
        detail: null,
        href: expenseHref ? `${expenseHref}#comments` : null,
      };
  }
}

/** Short label for an edit-history row on the expense page. */
export function historyLabel(a: ActivityLike, viewerId: string): string {
  const p = a.payload ?? {};
  const actor = a.actorId === viewerId ? "You" : p.actorName || "Someone";
  const cur = p.currency || "USD";
  switch (a.type) {
    case "EXPENSE_CREATED":
      return `${actor} added this expense (${formatCurrency((p.amount ?? 0) / 100, cur)})`;
    case "EXPENSE_UPDATED": {
      const changes = p.changes ?? [];
      const edits = changes.filter((ch) => ch.field !== "receipt").map((ch) => changeText(ch, cur));
      const receipt = changes.filter((ch) => ch.field === "receipt").map((ch) => changeText(ch, cur));
      const parts = [...(edits.length ? [`changed ${joinList(edits)}`] : []), ...receipt];
      return `${actor} ${parts.length ? joinList(parts) : "saved without changes"}`;
    }
    case "EXPENSE_DELETED":
      return `${actor} deleted this expense`;
    case "EXPENSE_RESTORED":
      return `${actor} restored this expense`;
    default:
      return describeActivity(a, viewerId, { showGroup: false }).text;
  }
}
