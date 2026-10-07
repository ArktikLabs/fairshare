// WhatsApp number verification: a 6-digit code sent over WhatsApp, valid
// for 10 minutes, 5 tries. Rate limited per user and per number. Until the
// code is entered the number is stored but unverified, and nothing else is
// ever sent to it.

import { createHash, randomInt } from "node:crypto";
import { prisma } from "../prisma";
import { checkWhatsAppNumber, isWhatsAppConfigured, phoneDigits, sendWhatsAppText } from "./whatsapp-waha";

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_TRIES = 5;
/** at most 1 code per minute and 5 per day, per user and per number */
export const RESEND_GAP_MS = 60_000;
export const MAX_PER_DAY = 5;

export class PhoneError extends Error {
  constructor(public status: number, message: string, public retryAt?: Date) {
    super(message);
  }
}

const hash = (userId: string, code: string) =>
  createHash("sha256").update(`${userId}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

/** "+62 812-3456-7890" -> "+6281234567890" (E.164) or null. */
export function normalizePhone(input: string): string | null {
  const d = phoneDigits(input.trim().startsWith("+") ? input : `+${input}`);
  return d ? `+${d}` : null;
}

export async function rateLimitFor(userId: string, phone: string, now = new Date()): Promise<Date | null> {
  const day = new Date(now.getTime() - 24 * 3600_000);
  const recent = await prisma.phoneVerification.findMany({
    where: { OR: [{ userId }, { phone }], createdAt: { gt: day } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < RESEND_GAP_MS) {
    return new Date(recent[0].createdAt.getTime() + RESEND_GAP_MS);
  }
  if (recent.length >= MAX_PER_DAY) return new Date(recent[MAX_PER_DAY - 1].createdAt.getTime() + 24 * 3600_000);
  return null;
}

/**
 * Save the number (unverified) and send a code. In disabled mode (no WAHA
 * env) the number is saved but no code can be sent.
 */
export async function startVerification(userId: string, rawPhone: string): Promise<{ phone: string; sent: boolean; devCode?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new PhoneError(400, "Enter the number with its country code, e.g. +62 812 3456 7890");
  const taken = await prisma.user.findFirst({ where: { phone, phoneVerifiedAt: { not: null }, id: { not: userId } }, select: { id: true } });
  if (taken) throw new PhoneError(409, "This number is already verified on another account");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (user?.phone !== phone) {
    await prisma.user.update({ where: { id: userId }, data: { phone, phoneVerifiedAt: null } });
  }
  if (!isWhatsAppConfigured()) throw new PhoneError(503, "WhatsApp messages are not available yet. Your number is saved; verify it once WhatsApp is turned on.");

  const retryAt = await rateLimitFor(userId, phone);
  if (retryAt) throw new PhoneError(429, "Too many codes. Try again later.", retryAt);

  const exists = await checkWhatsAppNumber(phone);
  if (exists.ok && !exists.exists) throw new PhoneError(400, "This number does not have WhatsApp");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.phoneVerification.create({
    data: { userId, phone, codeHash: hash(userId, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  const sent = await sendWhatsAppText(exists.ok && exists.chatId ? exists.chatId : phone, `Your FairShare code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this message.`);
  if (!sent.ok) throw new PhoneError(502, "Could not send the code over WhatsApp. Try again in a minute.");
  return { phone, sent: true };
}

export async function confirmVerification(userId: string, code: string): Promise<{ phone: string }> {
  if (!/^\d{6}$/.test(code.trim())) throw new PhoneError(400, "Enter the 6-digit code");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) throw new PhoneError(400, "Add a number first");
  const v = await prisma.phoneVerification.findFirst({
    where: { userId, phone: user.phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!v) throw new PhoneError(400, "The code expired. Send a new one.");
  if (v.attempts >= MAX_TRIES) throw new PhoneError(429, "Too many wrong codes. Send a new one.");
  if (v.codeHash !== hash(userId, code.trim())) {
    await prisma.phoneVerification.update({ where: { id: v.id }, data: { attempts: { increment: 1 } } });
    throw new PhoneError(400, "That code is not right");
  }
  await prisma.$transaction([
    prisma.phoneVerification.update({ where: { id: v.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } }),
  ]);
  return { phone: user.phone };
}

export async function removePhone(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { phone: null, phoneVerifiedAt: null } });
}

/** Test hook (smoke tests, non-production only): issue a known code without WhatsApp. */
export async function issueTestCode(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) throw new PhoneError(400, "Add a number first");
  await prisma.phoneVerification.create({
    data: { userId, phone: user.phone, codeHash: hash(userId, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
}
