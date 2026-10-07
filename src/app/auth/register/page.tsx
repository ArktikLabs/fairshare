"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { getCallbackUrl } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { AuthCard } from "@/components/site/auth-card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signinHref, setSigninHref] = useState("/auth/signin");

  useEffect(() => {
    // Prefill from invite links (/auth/register?email=...)
    const params = new URLSearchParams(window.location.search);
    const invited = params.get("email");
    if (invited) setEmail(invited);
    const cb = params.get("callbackUrl");
    if (cb) setSigninHref(`/auth/signin?callbackUrl=${encodeURIComponent(cb)}`);
  }, []);

  const errors = {
    email: !email.trim() ? "Enter your email" : !EMAIL_RE.test(email.trim()) ? "Enter a valid email address" : "",
    password: !password ? "Choose a password" : password.length < 8 ? `At least 8 characters (${password.length}/8)` : "",
  };
  const valid = !errors.email && !errors.password;
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not create the account");
        return;
      }
      // Registration successful: sign straight in and continue
      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.ok && !result.error) {
        router.push(getCallbackUrl());
      } else {
        router.push("/auth/signin?message=Registration successful. Please sign in.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free. Takes a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href={signinHref} className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Name" htmlFor="name" hint="Shown to people in your groups.">
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        <Field label="Email" htmlFor="email" error={show("email")}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={show("email") ? true : undefined}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={show("password")}
          hint={password.length >= 8 ? "Looks good" : "At least 8 characters"}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
            aria-invalid={show("password") ? true : undefined}
          />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-xs text-slate-500">
          By creating an account you agree to the <Link href="/terms" className="underline">terms</Link> and{" "}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
    </AuthCard>
  );
}
