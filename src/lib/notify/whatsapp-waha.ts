// WhatsApp channel through a WAHA server (https://waha.devlike.pro), which
// runs on another host. Configured only by env:
//   WAHA_URL       base URL, e.g. https://waha.example.com
//   WAHA_API_KEY   sent as the X-Api-Key header
//   WAHA_SESSION   WAHA session name (default "default")
// Without WAHA_URL and WAHA_API_KEY the channel is disabled: nothing is sent
// and callers get { ok: false, notConfigured: true }.
//
// API used (WAHA docs, "Send messages" and "Contacts"):
//   POST {WAHA_URL}/api/sendText  { session, chatId: "<digits>@c.us", text }
//   GET  {WAHA_URL}/api/contacts/check-exists?phone=<digits>&session=<s>
//        -> { numberExists: boolean, chatId: "<digits>@c.us" }

export interface WahaConfig {
  url: string;
  apiKey: string;
  session: string;
}

type Env = Record<string, string | undefined>;

export function wahaConfig(env: Env = process.env): WahaConfig | null {
  const url = env.WAHA_URL?.trim().replace(/\/+$/, "");
  const apiKey = env.WAHA_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey, session: env.WAHA_SESSION?.trim() || "default" };
}

export function isWhatsAppConfigured(env: Env = process.env): boolean {
  return wahaConfig(env) !== null;
}

/** "+62 812-3456-7890" -> "6281234567890"; null unless 8-15 digits (E.164). */
export function phoneDigits(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function toChatId(phone: string): string {
  const d = phoneDigits(phone);
  if (!d) throw new Error("Invalid phone number");
  return `${d}@c.us`;
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; notConfigured?: boolean; retryable?: boolean };

interface Opts {
  config?: WahaConfig | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function call(
  cfg: WahaConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.url}${path}`, {
      ...init,
      headers: { Accept: "application/json", "X-Api-Key": cfg.apiKey, ...(init.headers ?? {}) },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* plain text */
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function errorText(status: number, body: unknown): string {
  const msg =
    body && typeof body === "object" && "message" in body
      ? String((body as { message: unknown }).message)
      : typeof body === "string"
        ? body.slice(0, 200)
        : "";
  return `WAHA ${status}${msg ? `: ${msg}` : ""}`;
}

/** Send a text message. Never throws. */
export async function sendWhatsAppText(phoneOrChatId: string, text: string, opts: Opts = {}): Promise<SendResult> {
  const cfg = opts.config === undefined ? wahaConfig() : opts.config;
  if (!cfg) return { ok: false, error: "WhatsApp is not configured", notConfigured: true };
  let chatId: string;
  try {
    chatId = phoneOrChatId.endsWith("@c.us") ? phoneOrChatId : toChatId(phoneOrChatId);
  } catch {
    return { ok: false, error: "Invalid phone number" };
  }
  try {
    const { status, body } = await call(
      cfg,
      "/api/sendText",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: cfg.session, chatId, text }),
      },
      opts.fetchImpl ?? fetch,
      opts.timeoutMs ?? 15000
    );
    if (status >= 200 && status < 300) {
      const b = body as { id?: unknown; key?: { id?: unknown } } | null;
      const id = b && typeof b === "object" ? (typeof b.id === "string" ? b.id : typeof b.key?.id === "string" ? b.key.id : null) : null;
      return { ok: true, id };
    }
    return { ok: false, error: errorText(status, body), retryable: status >= 500 || status === 429 };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, error: aborted ? "WAHA request timed out" : `WAHA request failed: ${e instanceof Error ? e.message : String(e)}`, retryable: true };
  }
}

export type ExistsResult =
  | { ok: true; exists: boolean; chatId: string | null }
  | { ok: false; error: string; notConfigured?: boolean };

/** Ask WAHA whether a number has WhatsApp (and its canonical chat id). Never throws. */
export async function checkWhatsAppNumber(phone: string, opts: Opts = {}): Promise<ExistsResult> {
  const cfg = opts.config === undefined ? wahaConfig() : opts.config;
  if (!cfg) return { ok: false, error: "WhatsApp is not configured", notConfigured: true };
  const digits = phoneDigits(phone);
  if (!digits) return { ok: false, error: "Invalid phone number" };
  try {
    const q = new URLSearchParams({ phone: digits, session: cfg.session });
    const { status, body } = await call(cfg, `/api/contacts/check-exists?${q}`, { method: "GET" }, opts.fetchImpl ?? fetch, opts.timeoutMs ?? 10000);
    if (status < 200 || status >= 300) return { ok: false, error: errorText(status, body) };
    const b = (body ?? {}) as { numberExists?: unknown; chatId?: unknown };
    return {
      ok: true,
      exists: b.numberExists === true,
      chatId: typeof b.chatId === "string" ? b.chatId : null,
    };
  } catch (e) {
    return { ok: false, error: `WAHA request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
