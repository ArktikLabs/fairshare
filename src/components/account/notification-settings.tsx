"use client";

import { useState } from "react";
import { CheckCircle2, Mail, MessageCircle, Phone } from "lucide-react";
import type { NotificationSettings as Settings } from "@/lib/notify/prefs";
import { PHONE_COUNTRIES, prettyPhone, toE164 } from "@/lib/phone-countries";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";

type Status = { tone: "success" | "error" | "info"; text: string } | null;

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-brand-600" : "bg-slate-300"
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function NotificationSettings({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<Status>(null);
  const waUsable = s.whatsappConfigured && s.phoneVerified;

  const patch = async (body: object) => {
    setStatus(null);
    const res = await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setS(j);
      setStatus({ tone: "success", text: "Saved" });
    } else setStatus({ tone: "error", text: j.error || "Could not save" });
  };

  const setEvent = (key: string, channel: "email" | "whatsapp", v: boolean) => {
    setS((cur) => ({ ...cur, events: cur.events.map((e) => (e.key === key ? { ...e, [channel]: v } : e)) }));
    void patch({ events: [{ key, [channel]: v }] });
  };

  return (
    <div className="grid max-w-3xl gap-5 [&>*]:min-w-0">
      <WhatsAppCard settings={s} onChange={(p) => setS((cur) => ({ ...cur, ...p }))} />

      <Card>
        <CardHeader title="What you hear about" description="We never notify you about something you did yourself." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th scope="col" className="px-4 py-2 sm:px-5">Event</th>
                <th scope="col" className="w-16 px-2 py-2 text-center">
                  <Mail className="mx-auto size-4" aria-hidden />
                  <span className="sr-only">Email</span>
                  <span aria-hidden className="block">Email</span>
                </th>
                <th scope="col" className="w-20 px-2 py-2 text-center sm:pr-5">
                  <MessageCircle className="mx-auto size-4" aria-hidden />
                  <span className="sr-only">WhatsApp</span>
                  <span aria-hidden className="block">WhatsApp</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.events.map((e) => (
                <tr key={e.key}>
                  <th scope="row" className="px-4 py-3 text-left font-normal sm:px-5">
                    <span className="block font-medium text-slate-900">{e.label}</span>
                    <span className="block text-xs text-slate-500">{e.description}</span>
                  </th>
                  <td className="px-2 py-3 text-center">
                    {e.channels.includes("email") ? (
                      <Toggle checked={e.email} onChange={(v) => setEvent(e.key, "email", v)} label={`${e.label} by email`} />
                    ) : (
                      <span className="text-xs text-slate-400" title="Invites are always emailed with the join link">Always</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center sm:pr-5">
                    <Toggle
                      checked={waUsable && e.whatsapp}
                      disabled={!waUsable}
                      onChange={(v) => setEvent(e.key, "whatsapp", v)}
                      label={`${e.label} by WhatsApp${waUsable ? "" : " (not available)"}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!waUsable && (
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
            {s.whatsappConfigured ? "Verify a WhatsApp number above to turn on WhatsApp messages." : "WhatsApp messages are not available yet."}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="Weekly summary" description="One email a week: what happened in your groups and where you stand." />
        <CardBody>
          <Field label="Summary email" htmlFor="digest">
            <Select
              id="digest"
              value={s.digest}
              onChange={(e) => {
                const v = e.target.value as "WEEKLY" | "NEVER";
                setS((cur) => ({ ...cur, digest: v }));
                void patch({ digest: v });
              }}
              className="sm:max-w-xs"
            >
              <option value="NEVER">Never</option>
              <option value="WEEKLY">Weekly</option>
            </Select>
          </Field>
        </CardBody>
      </Card>
      <div aria-live="polite" className="min-h-6">
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
      </div>
    </div>
  );
}

function WhatsAppCard({ settings: s, onChange }: { settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  const [dial, setDial] = useState("");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "code">(s.phone && !s.phoneVerified ? "code" : "idle");
  const [editing, setEditing] = useState(!s.phone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Status>(null);
  const e164 = toE164(dial || null, number);

  const send = async (phone: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.sent === false) {
        // WhatsApp is off on this server: number saved, no code sent
        onChange({ phone: j.phone ?? phone, phoneVerified: false });
        setEditing(false);
        setStep("idle");
        setMsg({ tone: "info", text: j.message || "Your number is saved." });
      } else if (res.ok) {
        onChange({ phone: j.phone, phoneVerified: false });
        setStep("code");
        setEditing(false);
        setMsg({ tone: "info", text: `We sent a 6-digit code to ${prettyPhone(j.phone)} on WhatsApp.` });
      } else {
        setMsg({ tone: "error", text: j.error || "Could not send the code" });
      }
    } catch {
      setMsg({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        onChange({ phoneVerified: true });
        setStep("idle");
        setCode("");
        setMsg({ tone: "success", text: "Number verified. Choose below what to get on WhatsApp." });
      } else setMsg({ tone: "error", text: j.error || "Could not verify" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    await fetch("/api/user/phone", { method: "DELETE" }).catch(() => null);
    onChange({ phone: null, phoneVerified: false });
    setEditing(true);
    setStep("idle");
    setMsg(null);
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader
        title="WhatsApp"
        description="Get notifications on WhatsApp. We only message a number you have verified."
        action={!s.whatsappConfigured ? <Badge>Not available yet</Badge> : s.phoneVerified ? <Badge tone="positive">Verified</Badge> : null}
      />
      <CardBody className="space-y-4">
        {s.phone && !editing && (
          <div className="flex flex-wrap items-center gap-3">
            <Phone className="size-4 text-slate-500" aria-hidden />
            <span className="font-medium tabular text-slate-900">{prettyPhone(s.phone)}</span>
            {s.phoneVerified ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 className="size-3.5" aria-hidden /> Verified
              </span>
            ) : (
              <span className="text-xs text-amber-700">Not verified</span>
            )}
            <div className="ml-auto flex gap-2">
              {!s.phoneVerified && s.whatsappConfigured && step !== "code" && (
                <Button size="sm" onClick={() => send(s.phone!)} disabled={busy}>
                  Send code
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                Change
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
                Remove
              </Button>
            </div>
          </div>
        )}

        {editing && (
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              if (e164) void send(e164);
            }}
            className="space-y-3"
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
              <Field label="Country" htmlFor="wa-country">
                <Select id="wa-country" value={dial ? `${dial}` : ""} onChange={(e) => setDial(e.target.value)}>
                  <option value="">Choose country</option>
                  {PHONE_COUNTRIES.map((c) => (
                    <option key={c.iso} value={c.dial}>
                      {c.name} (+{c.dial})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="WhatsApp number"
                htmlFor="wa-number"
                hint={e164 ? `We will use ${prettyPhone(e164)}` : "Pick a country, or type the full number starting with +"}
              >
                <Input
                  id="wa-number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder={dial ? "812 3456 7890" : "+62 812 3456 7890"}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || !e164}>
                {s.whatsappConfigured ? "Send code" : "Save number"}
              </Button>
              {s.phone && (
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}

        {step === "code" && !editing && s.whatsappConfigured && !s.phoneVerified && (
          <form onSubmit={verify} className="flex flex-wrap items-end gap-2" noValidate>
            <Field label="Code from WhatsApp" htmlFor="wa-code" className="w-40">
              <Input
                id="wa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="tabular tracking-widest"
              />
            </Field>
            <Button type="submit" disabled={busy || code.length !== 6}>
              Verify
            </Button>
            <Button variant="ghost" onClick={() => send(s.phone!)} disabled={busy}>
              Send again
            </Button>
          </form>
        )}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </CardBody>
    </Card>
  );
}
