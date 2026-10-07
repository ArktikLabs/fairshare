"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Alert, Card } from "@/components/ui/primitives";

export function CreateGroupForm({ defaultCurrency }: { defaultCurrency: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nameError = touched && !name.trim() ? "Give the group a name" : name.length > 100 ? "Keep it under 100 characters" : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || name.length > 100) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, currency }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not create the group");
        return;
      }
      router.push(`/groups/${body.id}#members`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-xl p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Group name" htmlFor="group-name" error={nameError}>
          <Input
            id="group-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bali trip, Flat 4B"
            maxLength={100}
            aria-invalid={nameError ? true : undefined}
          />
        </Field>
        <Field label="Currency" htmlFor="group-currency" hint="All expenses in this group use this currency.">
          <CurrencySelect id="group-currency" value={currency} onChange={setCurrency} />
        </Field>
        <Field label="Description (optional)" htmlFor="group-desc">
          <Textarea
            id="group-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="What is this group for?"
          />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create group"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
