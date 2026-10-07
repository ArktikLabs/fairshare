import { prisma } from "../prisma";
import { eventInfo, isNotifyEvent } from "./events";
import { setDigest, setEventPref } from "./prefs";
import type { UnsubscribeClaim } from "./token";

/** Turn off what an unsubscribe token names. Returns a label, or null if invalid. */
export async function applyUnsubscribe(claim: UnsubscribeClaim): Promise<{ label: string } | null> {
  const user = await prisma.user.findUnique({ where: { id: claim.u }, select: { id: true } });
  if (!user) return null;
  if (claim.e === "digest") {
    await setDigest(claim.u, "NEVER");
    return { label: "the weekly summary email" };
  }
  if (!isNotifyEvent(claim.e)) return null;
  await setEventPref(claim.u, claim.e, claim.c === "email" ? { email: false } : { whatsapp: false });
  return { label: `${eventInfo(claim.e).label.toLowerCase()} by ${claim.c === "email" ? "email" : "WhatsApp"}` };
}
