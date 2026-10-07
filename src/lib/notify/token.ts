// Signed tokens for one-click unsubscribe links (no login needed). The token
// names one user, one event type (or "digest" / "all") and one channel.

import { createHmac, timingSafeEqual } from "node:crypto";

export interface UnsubscribeClaim {
  u: string;
  e: string;
  c: "email" | "whatsapp";
}

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required for unsubscribe links");
  return s;
}

const b64 = (b: Buffer) => b.toString("base64url");

function sign(body: string, key = secret()) {
  return b64(createHmac("sha256", `unsubscribe:${key}`).update(body).digest());
}

export function makeUnsubscribeToken(claim: UnsubscribeClaim, key?: string): string {
  const body = b64(Buffer.from(JSON.stringify(claim)));
  return `${body}.${sign(body, key)}`;
}

export function readUnsubscribeToken(token: string | null | undefined, key?: string): UnsubscribeClaim | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, key));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof c?.u !== "string" || typeof c?.e !== "string" || (c.c !== "email" && c.c !== "whatsapp")) return null;
    return { u: c.u, e: c.e, c: c.c };
  } catch {
    return null;
  }
}
