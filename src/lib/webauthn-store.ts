// Server-side storage for WebAuthn challenges and one-time passkey login
// tickets. Both reuse the Auth.js VerificationToken table so no extra model
// is needed. Tokens are single use and short lived.

import { randomBytes, createHash } from "node:crypto";
import { prisma } from "./prisma";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TICKET_TTL_MS = 60 * 1000;

const challengeId = (purpose: "register" | "authenticate", key: string) =>
  `webauthn:${purpose}:${key}`;
const ticketId = (userId: string) => `passkey-login:${userId}`;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function storeChallenge(
  purpose: "register" | "authenticate",
  key: string,
  challenge: string
) {
  const identifier = challengeId(purpose, key);
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: challenge, expires: new Date(Date.now() + CHALLENGE_TTL_MS) },
  });
}

/** Return the stored challenge once (it is deleted on read), or null. */
export async function consumeChallenge(
  purpose: "register" | "authenticate",
  key: string
): Promise<string | null> {
  const identifier = challengeId(purpose, key);
  const row = await prisma.verificationToken.findFirst({ where: { identifier } });
  if (!row) return null;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return row.expires > new Date() ? row.token : null;
}

/** Issue a one-time ticket that the credentials provider will exchange for a session. */
export async function issueLoginTicket(userId: string): Promise<string> {
  const ticket = randomBytes(32).toString("base64url");
  const identifier = ticketId(userId);
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: hash(ticket), expires: new Date(Date.now() + TICKET_TTL_MS) },
  });
  return ticket;
}

/** True when the ticket is valid for this user; the ticket is consumed either way. */
export async function consumeLoginTicket(userId: string, ticket: string): Promise<boolean> {
  const identifier = ticketId(userId);
  const row = await prisma.verificationToken.findFirst({ where: { identifier } });
  if (!row) return false;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return row.expires > new Date() && row.token === hash(ticket);
}
