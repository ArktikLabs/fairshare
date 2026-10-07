"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Download, KeyRound, LogOut, Trash2 } from "lucide-react";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { LocalDate } from "@/components/ui/local-date";
import { resolveCurrency } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Modal } from "@/components/ui/dialog";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui/primitives";

function timeZones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    const list = intl.supportedValuesOf?.("timeZone");
    if (list && list.length) return list.includes("UTC") ? list : ["UTC", ...list];
  } catch {
    /* old browser */
  }
  return ["UTC"];
}

const noopSubscribe = () => () => {};

type Status = { tone: "success" | "error"; text: string } | null;

export function AccountSettings({
  profile,
  hasPassword,
  passkeyCount,
  preferences,
}: {
  profile: { name: string; email: string; memberSince: string };
  hasPassword: boolean;
  passkeyCount: number;
  preferences: { currency: string; timezone: string } | null;
}) {
  const router = useRouter();

  // ----- profile -----
  const [name, setName] = useState(profile.name);
  const [savingName, setSavingName] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileStatus({ tone: "error", text: "Name cannot be empty" });
      return;
    }
    setSavingName(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      setProfileStatus(res.ok ? { tone: "success", text: "Name saved" } : { tone: "error", text: body.error || "Could not save" });
      if (res.ok) router.refresh();
    } finally {
      setSavingName(false);
    }
  };

  // ----- preferences -----
  // Browser-only values: the server's ICU zone list and zone differ from the
  // browser's, so render them after hydration only (avoids React #418).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const browserTz = useMemo(() => {
    if (!mounted) return "UTC";
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, [mounted]);
  const [currency, setCurrency] = useState(resolveCurrency(preferences?.currency));
  // No stored preference yet (or still the old UTC default): use the browser zone
  const stored = preferences?.timezone && preferences.timezone !== "UTC" ? preferences.timezone : null;
  const [picked, setTimezone] = useState<string | null>(null);
  const timezone = picked ?? stored ?? browserTz;
  const [prefStatus, setPrefStatus] = useState<Status>(null);
  const zones = useMemo(() => {
    const z = mounted ? timeZones() : [];
    return z.includes(timezone) ? z : [timezone, ...z];
  }, [timezone, mounted]);

  const savePref = async (patch: { currency?: string; timezone?: string }) => {
    setPrefStatus(null);
    const res = await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    setPrefStatus(
      res.ok
        ? { tone: "success", text: patch.currency ? `Default currency set to ${patch.currency}` : "Time zone saved" }
        : { tone: "error", text: body.error || "Could not save" }
    );
  };

  // Persist the browser time zone once if nothing better was stored
  useEffect(() => {
    if (!stored && browserTz !== "UTC") void savePref({ timezone: browserTz }).then(() => setPrefStatus(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserTz]);

  // ----- password -----
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [securityStatus, setSecurityStatus] = useState<Status>(null);
  const nextErr = pw.next && pw.next.length < 8 ? "At least 8 characters" : "";
  const confirmErr = pw.confirm && pw.confirm !== pw.next ? "Passwords do not match" : "";
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.current || pw.next.length < 8 || pw.next !== pw.confirm) return;
    setPwBusy(true);
    setPwError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(body.error || "Could not change the password");
        return;
      }
      setPwOpen(false);
      setPw({ current: "", next: "", confirm: "" });
      setSecurityStatus({ tone: "success", text: "Password changed" });
    } finally {
      setPwBusy(false);
    }
  };

  // ----- passkeys -----
  const { registerPasskey, isLoading: passkeyBusy, error: passkeyError } = useWebAuthn();
  const [passkeys, setPasskeys] = useState(passkeyCount);
  const addPasskey = async () => {
    setSecurityStatus(null);
    const r = await registerPasskey();
    if (r.success) {
      setPasskeys((n) => n + 1);
      setSecurityStatus({ tone: "success", text: "Passkey added. You can now sign in with it." });
    }
  };

  // ----- export / delete -----
  const [exporting, setExporting] = useState(false);
  const [dataStatus, setDataStatus] = useState<Status>(null);
  const exportData = async () => {
    setExporting(true);
    setDataStatus(null);
    try {
      const res = await fetch("/api/user/export", { method: "POST" });
      if (!res.ok) {
        setDataStatus({ tone: "error", text: "Export failed. Please try again." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fairshare-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDataStatus({ tone: "success", text: "Export downloaded" });
    } finally {
      setExporting(false);
    }
  };

  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState("");
  const deleteAccount = async () => {
    setDelBusy(true);
    setDelError("");
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationText: delText }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDelError(body.error || "Could not delete the account");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-5 [&>*]:min-w-0">
      <Card>
        <CardHeader title="Profile" description={<>Member since <LocalDate value={profile.memberSince} /></>} />
        <CardBody>
          <form onSubmit={saveName} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="acc-name" hint="Shown to people in your groups.">
                <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </Field>
              <Field label="Email" htmlFor="acc-email" hint="Email cannot be changed.">
                <Input id="acc-email" value={profile.email} disabled />
              </Field>
            </div>
            {profileStatus && <Alert tone={profileStatus.tone}>{profileStatus.text}</Alert>}
            <Button type="submit" size="sm" disabled={savingName || name.trim() === profile.name}>
              {savingName ? "Saving..." : "Save name"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Preferences" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default currency" htmlFor="acc-currency" hint="Used for new groups you create.">
              <CurrencySelect
                id="acc-currency"
                value={currency}
                onChange={(c) => {
                  setCurrency(c);
                  void savePref({ currency: c });
                }}
              />
            </Field>
            <Field label="Time zone" htmlFor="acc-tz" hint={`Your browser says ${browserTz}.`}>
              <Select
                id="acc-tz"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  void savePref({ timezone: e.target.value });
                }}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {prefStatus && <Alert tone={prefStatus.tone}>{prefStatus.text}</Alert>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Sign-in & security" />
        <ul className="divide-y divide-slate-100">
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Password</p>
              <p className="text-xs text-slate-500">{hasPassword ? "Set" : "This account signs in without a password."}</p>
            </div>
            {hasPassword && (
              <Button size="sm" variant="secondary" onClick={() => setPwOpen(true)}>
                Change password
              </Button>
            )}
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Passkeys</p>
              <p className="text-xs text-slate-500">
                {passkeys === 0
                  ? "Sign in with your fingerprint, face or device PIN."
                  : `${passkeys} passkey${passkeys === 1 ? "" : "s"} registered`}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addPasskey} disabled={passkeyBusy}>
              <KeyRound /> {passkeyBusy ? "Waiting for device..." : "Add a passkey"}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Sign out</p>
              <p className="text-xs text-slate-500">Sign out on this device.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut /> Sign out
            </Button>
          </li>
        </ul>
        {(securityStatus || passkeyError) && (
          <div className="px-4 pb-4 sm:px-5">
            {passkeyError ? <Alert tone="error">{passkeyError}</Alert> : securityStatus && <Alert tone={securityStatus.tone}>{securityStatus.text}</Alert>}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Your data" />
        <ul className="divide-y divide-slate-100">
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Export</p>
              <p className="text-xs text-slate-500">Download your profile, groups, expenses and payments as JSON.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={exportData} disabled={exporting}>
              <Download /> {exporting ? "Preparing..." : "Download export"}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-rose-700">Delete account</p>
              <p className="text-xs text-slate-500">
                Removes your personal data. Shared expenses stay for the others, shown as &quot;Deleted user&quot;.
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setDelOpen(true)}>
              <Trash2 /> Delete account
            </Button>
          </li>
        </ul>
        {dataStatus && (
          <div className="px-4 pb-4 sm:px-5">
            <Alert tone={dataStatus.tone}>{dataStatus.text}</Alert>
          </div>
        )}
      </Card>

      <Modal open={pwOpen} onOpenChange={setPwOpen} title="Change password">
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          <Field label="Current password" htmlFor="pw-cur">
            <Input id="pw-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="New password" htmlFor="pw-new" error={nextErr} hint="At least 8 characters">
            <Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} aria-invalid={nextErr ? true : undefined} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" error={confirmErr}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} aria-invalid={confirmErr ? true : undefined} />
          </Field>
          {pwError && <Alert tone="error">{pwError}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setPwOpen(false)} disabled={pwBusy}>
              Cancel
            </Button>
            <Button type="submit" disabled={pwBusy || !pw.current || pw.next.length < 8 || pw.next !== pw.confirm}>
              {pwBusy ? "Saving..." : "Change password"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={delOpen}
        onOpenChange={(o) => {
          setDelOpen(o);
          if (!o) {
            setDelText("");
            setDelError("");
          }
        }}
        title="Delete your account?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This cannot be undone. Settle up in every group first. Type <strong>DELETE MY ACCOUNT</strong> to confirm.
          </p>
          <Input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="DELETE MY ACCOUNT" aria-label="Confirmation" />
          {delError && <Alert tone="error">{delError}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDelOpen(false)} disabled={delBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteAccount} disabled={delBusy || delText !== "DELETE MY ACCOUNT"}>
              {delBusy ? "Deleting..." : "Delete account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
