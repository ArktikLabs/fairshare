"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { AuthCard } from "@/components/site/auth-card";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSent(true);
      else setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle={<>If an account exists for {email.trim()}, we sent a reset link. It expires in one hour.</>}>
        <div className="space-y-3">
          <ButtonLink href="/auth/signin" className="w-full">
            Back to sign in
          </ButtonLink>
          <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
      footer={
        <Link href="/auth/signin" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
