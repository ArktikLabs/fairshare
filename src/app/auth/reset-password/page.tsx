"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { AuthCard } from "@/components/site/auth-card";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  // Read once, then drop the token from the address bar
  const [token] = useState(() => searchParams.get("token"));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // null = checking, then true/false
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    window.history.replaceState(null, "", window.location.pathname);
    let live = true;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j: { valid?: boolean }) => live && setValid(Boolean(j.valid)))
      .catch(() => live && setValid(true)); // network trouble: let the submit report it
    return () => {
      live = false;
    };
  }, [token]);

  const pwErr = password && password.length < 8 ? "At least 8 characters" : "";
  const confirmErr = confirm && confirm !== password ? "Passwords do not match" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setError(password.length < 8 ? "Password must be at least 8 characters" : "Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || valid === false) {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link has expired, was already used, or is incomplete.">
        <ButtonLink href="/auth/forgot-password" className="w-full">
          Request a new link
        </ButtonLink>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="You can sign in with your new password.">
        <ButtonLink href="/auth/signin" className="w-full">
          Sign in
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/auth/signin" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="New password" htmlFor="password" error={pwErr} hint="At least 8 characters">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={pwErr ? true : undefined} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={confirmErr}>
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={confirmErr ? true : undefined} />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Saving..." : "Set new password"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
