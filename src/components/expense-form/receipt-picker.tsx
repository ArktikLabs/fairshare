"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReceiptChoice =
  | { kind: "none" }
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "new"; file: File };

const MAX = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Checks the browser can do before upload; the server checks the bytes again. */
export function receiptFileProblem(file: File): string {
  const name = file.name.toLowerCase();
  if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) {
    return "HEIC photos are not supported yet. Choose a JPEG or PNG (on iPhone: Settings → Camera → Formats → Most Compatible).";
  }
  if (!OK_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
  if (file.size > MAX) return "That image is larger than 8 MB.";
  return "";
}

/** Upload a receipt for a saved expense. Returns an error message, or "" on success. */
export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`/api/expenses/${expenseId}/receipt`, { method: "POST", body: form });
    if (res.ok) return "";
    const body = await res.json().catch(() => ({}));
    return body.error || "The receipt could not be uploaded";
  } catch {
    return "The receipt could not be uploaded (network error)";
  }
}

/** Pick, preview, replace or remove a receipt photo inside the expense form. */
export function ReceiptPicker({
  value,
  onChange,
  existingUrl,
}: {
  value: ReceiptChoice;
  onChange: (v: ReceiptChoice) => void;
  /** Thumbnail of the receipt already stored (edit mode). */
  existingUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value.kind !== "new") {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = receiptFileProblem(file);
    setError(problem);
    if (!problem) onChange({ kind: "new", file });
  };

  const shown = value.kind === "new" ? preview : value.kind === "keep" ? existingUrl : null;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">Receipt</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-label="Receipt photo" tabIndex={-1} />
      {shown ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated image */}
          <img src={shown} alt="Receipt preview" className="size-16 rounded-lg border border-slate-200 object-cover" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
              <ImagePlus /> Replace
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(existingUrl ? { kind: "remove" } : { kind: "none" })}>
              <X /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
            <ImagePlus /> {value.kind === "remove" ? "Add another photo" : "Add photo"}
          </Button>
          {value.kind === "remove" && existingUrl && (
            <Button size="sm" variant="ghost" onClick={() => onChange({ kind: "keep" })}>
              <RotateCcw /> Keep the current receipt
            </Button>
          )}
        </div>
      )}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          {value.kind === "remove" ? "The receipt is removed when you save." : "JPEG, PNG or WebP, up to 8 MB. Only group members can see it."}
        </p>
      )}
    </div>
  );
}
