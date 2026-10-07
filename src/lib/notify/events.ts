// Which activity becomes which notification, and who receives it. Pure, so
// it is unit-tested; the dispatcher (dispatch.ts) loads the context.

import type { ActivityLike } from "../activity-format";

export type NotifyEvent = "expense_added" | "expense_changed" | "payment" | "comment" | "group_invite" | "member_joined" | "reminder";
export type ChannelKey = "email" | "whatsapp";

export interface EventInfo {
  key: NotifyEvent;
  label: string;
  description: string;
  defaults: Record<ChannelKey, boolean>;
  /** Channels this event can use (invite emails are always sent with the join link) */
  channels: ChannelKey[];
}

export const NOTIFY_EVENTS: ReadonlyArray<EventInfo> = [
  {
    key: "expense_added",
    label: "New expenses",
    description: "Someone adds an expense you are part of",
    defaults: { email: true, whatsapp: true },
    channels: ["email", "whatsapp"],
  },
  {
    key: "expense_changed",
    label: "Edited or deleted expenses",
    description: "An expense you are on changes your share",
    defaults: { email: true, whatsapp: false },
    channels: ["email", "whatsapp"],
  },
  {
    key: "payment",
    label: "Payments",
    description: "A payment to or from you is recorded, edited or deleted",
    defaults: { email: true, whatsapp: true },
    channels: ["email", "whatsapp"],
  },
  {
    key: "reminder",
    label: "Payment reminders",
    description: "Someone reminds you to settle up",
    defaults: { email: true, whatsapp: true },
    channels: ["email", "whatsapp"],
  },
  {
    key: "comment",
    label: "Comments",
    description: "Someone comments on an expense you are on",
    defaults: { email: true, whatsapp: false },
    channels: ["email", "whatsapp"],
  },
  {
    key: "group_invite",
    label: "Invites and friends",
    description: "You are invited to a group or added as a friend",
    defaults: { email: true, whatsapp: true },
    channels: ["whatsapp"],
  },
  {
    key: "member_joined",
    label: "New members",
    description: "Someone joins a group you are in",
    defaults: { email: false, whatsapp: false },
    channels: ["email", "whatsapp"],
  },
];

export const EVENT_KEYS = NOTIFY_EVENTS.map((e) => e.key);

export function isNotifyEvent(s: unknown): s is NotifyEvent {
  return typeof s === "string" && (EVENT_KEYS as string[]).includes(s);
}

export function eventInfo(key: NotifyEvent): EventInfo {
  return NOTIFY_EVENTS.find((e) => e.key === key)!;
}

export function eventForActivity(type: ActivityLike["type"]): NotifyEvent | null {
  switch (type) {
    case "EXPENSE_CREATED":
      return "expense_added";
    case "EXPENSE_UPDATED":
    case "EXPENSE_DELETED":
    case "EXPENSE_RESTORED":
      return "expense_changed";
    case "PAYMENT_RECORDED":
    case "PAYMENT_UPDATED":
    case "PAYMENT_DELETED":
    case "PAYMENT_RESTORED":
      return "payment";
    case "COMMENT_ADDED":
      return "comment";
    case "MEMBER_INVITED":
    case "FRIEND_ADDED":
      return "group_invite";
    case "MEMBER_JOINED":
      return "member_joined";
    case "REMINDER_SENT":
      return "reminder";
    default:
      return null;
  }
}

export interface RecipientContext {
  /** COMMENT_ADDED: everyone on the expense (payers, shares, creator) */
  expensePeople?: string[];
  /** MEMBER_JOINED: active members of the group */
  groupMembers?: string[];
}

/**
 * Who should hear about an activity. Never the actor. For edits only people
 * whose share (net) changed; for deletes everyone who had a non-zero share.
 */
export function recipientsFor(a: ActivityLike, ctx: RecipientContext = {}): string[] {
  const p = a.payload ?? {};
  const out = new Set<string>();
  const impact = p.impact ?? {};
  switch (a.type) {
    case "EXPENSE_CREATED":
    case "EXPENSE_RESTORED":
      Object.keys(impact).forEach((id) => out.add(id));
      break;
    case "EXPENSE_DELETED":
      Object.entries(impact).forEach(([id, c]) => c !== 0 && out.add(id));
      break;
    case "EXPENSE_UPDATED": {
      const before = p.previousImpact ?? {};
      const ids = new Set([...Object.keys(before), ...Object.keys(impact)]);
      ids.forEach((id) => (before[id] ?? 0) !== (impact[id] ?? 0) && out.add(id));
      break;
    }
    case "PAYMENT_RECORDED":
    case "PAYMENT_UPDATED":
    case "PAYMENT_DELETED":
    case "PAYMENT_RESTORED":
      if (p.fromId) out.add(p.fromId);
      if (p.toId) out.add(p.toId);
      break;
    case "COMMENT_ADDED":
      (ctx.expensePeople ?? []).forEach((id) => out.add(id));
      break;
    case "MEMBER_INVITED":
    case "FRIEND_ADDED":
    case "REMINDER_SENT":
      if (a.targetUserId) out.add(a.targetUserId);
      break;
    case "MEMBER_JOINED":
      (ctx.groupMembers ?? []).forEach((id) => out.add(id));
      break;
    default:
      break;
  }
  out.delete(a.actorId);
  return [...out];
}

export type PrefRow = { event: string; email: boolean; whatsapp: boolean };

/** Effective on/off for one user, event and channel (stored row or default). */
export function wants(rows: PrefRow[], event: NotifyEvent, channel: ChannelKey): boolean {
  const info = eventInfo(event);
  if (!info.channels.includes(channel)) return false;
  const row = rows.find((r) => r.event === event);
  return row ? row[channel] : info.defaults[channel];
}
