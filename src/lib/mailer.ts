// Minimal transactional email. Uses the Resend HTTP API when RESEND_API_KEY
// and EMAIL_FROM are set; otherwise the message is printed in development and
// dropped in production (never log tokens in production logs).

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export function appUrl(path = ""): string {
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(msg: MailMessage): Promise<boolean> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) console.error("Email send failed:", res.status);
    return res.ok;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}
