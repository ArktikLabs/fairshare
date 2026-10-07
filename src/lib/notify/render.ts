// Message templates: one subject + plain text + small HTML email per event,
// plus a short WhatsApp text. Pure (string building only).

import { describeActivity, type ActivityLike } from "../activity-format";
import { formatCurrency } from "../utils";

export interface Rendered {
  subject: string;
  text: string;
  html: string;
  whatsapp: string;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Wrap a message in the shared email layout. */
export function emailLayout(opts: {
  heading: string;
  lines: string[];
  cta?: { label: string; url: string };
  footer: { manageUrl: string; unsubscribeUrl?: string; reason: string };
}): { text: string; html: string } {
  const text = [
    opts.heading,
    "",
    ...opts.lines,
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    "",
    "--",
    opts.footer.reason,
    ...(opts.footer.unsubscribeUrl ? [`Stop these emails: ${opts.footer.unsubscribeUrl}`] : []),
    `Manage notifications: ${opts.footer.manageUrl}`,
  ].join("\n");
  const p = (s: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#1e293b">${escapeHtml(s)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:20px 24px 4px;font-size:13px;font-weight:600;color:#4f46e5">FairShare</td></tr>
<tr><td style="padding:8px 24px 8px"><h1 style="margin:0 0 12px;font-size:18px;line-height:26px;color:#0f172a">${escapeHtml(opts.heading)}</h1>
${opts.lines.map(p).join("\n")}
${opts.cta ? `<p style="margin:16px 0 8px"><a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600">${escapeHtml(opts.cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:12px 24px 20px;border-top:1px solid #f1f5f9;font-size:12px;line-height:18px;color:#64748b">
${escapeHtml(opts.footer.reason)}<br>
${opts.footer.unsubscribeUrl ? `<a href="${escapeHtml(opts.footer.unsubscribeUrl)}" style="color:#64748b">Stop these emails</a> · ` : ""}<a href="${escapeHtml(opts.footer.manageUrl)}" style="color:#64748b">Manage notifications</a>
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

const SUBJECT_MAX = 110;
const clip = (s: string, n = SUBJECT_MAX) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Render an activity for one recipient. */
export function renderActivity(
  a: ActivityLike,
  recipientId: string,
  urls: { open: string | null; manageUrl: string; unsubscribeUrl: string },
  reason: string
): Rendered {
  const line = describeActivity(a, recipientId);
  const p = a.payload ?? {};
  const lines: string[] = [];
  if (line.detail) lines.push(capital(line.detail.text) + ".");
  if (p.originalCurrency && p.originalAmount !== undefined && p.originalCurrency !== p.currency) {
    lines.push(`Paid in ${p.originalCurrency}: ${formatCurrency(p.originalAmount / 100, p.originalCurrency)}.`);
  }
  if (a.type === "REMINDER_SENT") lines.push("Open FairShare to record the payment once you have paid.");
  const { text, html } = emailLayout({
    heading: line.text,
    lines,
    cta: urls.open ? { label: a.type === "REMINDER_SENT" ? "Settle up" : "Open in FairShare", url: urls.open } : undefined,
    footer: { manageUrl: urls.manageUrl, unsubscribeUrl: urls.unsubscribeUrl, reason },
  });
  const wa = [`*FairShare*: ${line.text}`, line.detail ? capital(line.detail.text) + "." : "", urls.open ?? ""]
    .filter(Boolean)
    .join("\n");
  return { subject: clip(line.text), text, html, whatsapp: wa };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
