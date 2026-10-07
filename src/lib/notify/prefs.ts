// Per-user notification preferences, stored in UserNotificationSetting
// (templateKey = NotifyEvent key). Missing rows mean the event defaults.

import { prisma } from "../prisma";
import { NOTIFY_EVENTS, type NotifyEvent, type PrefRow } from "./events";
import { isWhatsAppConfigured } from "./whatsapp-waha";

export async function loadPrefRows(userIds: string[]): Promise<Map<string, PrefRow[]>> {
  const rows = await prisma.userNotificationSetting.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, templateKey: true, emailEnabled: true, whatsappEnabled: true },
  });
  const out = new Map<string, PrefRow[]>();
  for (const r of rows) {
    const list = out.get(r.userId) ?? [];
    list.push({ event: r.templateKey, email: r.emailEnabled, whatsapp: r.whatsappEnabled });
    out.set(r.userId, list);
  }
  return out;
}

export interface NotificationSettings {
  whatsappConfigured: boolean;
  phone: string | null;
  phoneVerified: boolean;
  digest: "WEEKLY" | "NEVER";
  events: Array<{
    key: NotifyEvent;
    label: string;
    description: string;
    channels: Array<"email" | "whatsapp">;
    email: boolean;
    whatsapp: boolean;
  }>;
}

export async function loadNotificationSettings(userId: string): Promise<NotificationSettings> {
  const [user, prefs, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { phone: true, phoneVerifiedAt: true } }),
    prisma.userPreferences.findUnique({ where: { userId }, select: { emailDigest: true } }),
    loadPrefRows([userId]),
  ]);
  const mine = rows.get(userId) ?? [];
  return {
    whatsappConfigured: isWhatsAppConfigured(),
    phone: user?.phone ?? null,
    phoneVerified: Boolean(user?.phone && user.phoneVerifiedAt),
    digest: prefs?.emailDigest === "WEEKLY" ? "WEEKLY" : "NEVER",
    events: NOTIFY_EVENTS.map((e) => {
      const r = mine.find((x) => x.event === e.key);
      return {
        key: e.key,
        label: e.label,
        description: e.description,
        channels: e.channels,
        email: e.channels.includes("email") ? (r ? r.email : e.defaults.email) : false,
        whatsapp: r ? r.whatsapp : e.defaults.whatsapp,
      };
    }),
  };
}

export async function setEventPref(userId: string, event: NotifyEvent, patch: { email?: boolean; whatsapp?: boolean }) {
  const info = NOTIFY_EVENTS.find((e) => e.key === event)!;
  const existing = await prisma.userNotificationSetting.findUnique({
    where: { userId_templateKey: { userId, templateKey: event } },
  });
  await prisma.userNotificationSetting.upsert({
    where: { userId_templateKey: { userId, templateKey: event } },
    create: {
      userId,
      templateKey: event,
      emailEnabled: patch.email ?? info.defaults.email,
      whatsappEnabled: patch.whatsapp ?? info.defaults.whatsapp,
    },
    update: {
      emailEnabled: patch.email ?? existing?.emailEnabled,
      whatsappEnabled: patch.whatsapp ?? existing?.whatsappEnabled,
    },
  });
}

export async function setDigest(userId: string, digest: "WEEKLY" | "NEVER") {
  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, emailDigest: digest },
    update: { emailDigest: digest },
  });
}
