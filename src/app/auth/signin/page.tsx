"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock } from "lucide-react";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { getCallbackUrl } from "@/lib/safe-redirect";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { AuthCard } from "@/components/site/auth-card";

type Provider = { id: string; name: string };

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [passkeyMode, setPasskeyMode] = useState(false);
  const [registerHref, setRegisterHref] = useState("/auth/register");
  const { authenticateWithPasskey, isLoading: passkeyLoading, error: passkeyError } = useWebAuthn();

  useEffect(() => {
    getProviders().then((p) => setProviders(Object.values(p ?? {}).filter((x) => x.id !== "credentials")));
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("message");
    if (msg) setMessage(msg);
    const cb = params.get("callbackUrl");
    if (cb) setRegisterHref(`/auth/register?callbackUrl=${encodeURIComponent(cb)}`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) setError("Wrong email or password.");
      else {
        router.push(getCallbackUrl());
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email to use a passkey");
      return;
    }
    setError("");
    const result = await authenticateWithPasskey(email.trim());
    if (result.success) router.push(getCallbackUrl());
    else setError(result.error || "Passkey sign-in failed");
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to FairShare."
      footer={
        <>
          New here?{" "}
          <Link href={registerHref} className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div role="tablist" aria-label="Sign-in method" className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
        {[
          { on: false, label: "Password", icon: Lock },
          { on: true, label: "Passkey", icon: KeyRound },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={passkeyMode === t.on}
            onClick={() => {
              setPasskeyMode(t.on);
              setError("");
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium",
              passkeyMode === t.on ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <t.icon className="size-4" aria-hidden /> {t.label}
          </button>
        ))}
      </div>

      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      {!passkeyMode ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handlePasskey} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="passkey-email" hint="Then confirm with your fingerprint, face or device PIN.">
            <Input id="passkey-email" name="email" type="email" autoComplete="email webauthn" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {(error || passkeyError) && <Alert tone="error">{error || passkeyError}</Alert>}
          <Button type="submit" className="w-full" size="lg" disabled={passkeyLoading}>
            <KeyRound /> {passkeyLoading ? "Waiting for device..." : "Sign in with passkey"}
          </Button>
        </form>
      )}

      {providers.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-5">
          {providers.map((p) => (
            <Button key={p.id} variant="secondary" className="w-full" onClick={() => signIn(p.id, { callbackUrl: getCallbackUrl() })}>
              Continue with {p.name}
            </Button>
          ))}
        </div>
      )}
    </AuthCard>
  );
}
