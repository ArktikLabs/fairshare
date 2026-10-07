// Minimal transactional email. Uses the Resend HTTP API when RESEND_API_KEY
// and EMAIL_FROM are set; otherwise the message is printed in development and
// dropped in production (never log tokens in production logs).

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export type MailResult = { ok: true; id: string | null } | { ok: false; error: string; notConfigured?: boolean; retryable?: boolean };

export function appUrl(path = ""): string {
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Send with a detailed result (used by the notification outbox). Never throws. */
export async function deliverMail(msg: MailMessage): Promise<MailResult> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    }
    return { ok: false, error: "Email is not configured", notConfigured: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.headers ? { headers: msg.headers } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Email send failed:", res.status);
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}`, retryable: res.status >= 500 || res.status === 429 };
    }
    const j = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: j?.id ?? null };
  } catch (error) {
    console.error("Email send failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : String(error), retryable: true };
  }
}

export async function sendMail(msg: MailMessage): Promise<boolean> {
  return (await deliverMail(msg)).ok;
}
