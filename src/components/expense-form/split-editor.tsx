"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils";
import { percentToString, type SplitMode, type SplitPreview } from "@/lib/split-form";
import { Badge } from "@/components/ui/primitives";

export interface FormMember {
  userId: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INVITED";
}

export const MODE_LABELS: Record<SplitMode, string> = {
  EQUAL: "Equally",
  EXACT: "Amounts",
  PERCENTAGE: "Percent",
  SHARES: "Shares",
  ADJUSTMENT: "Adjust",
};

const MODE_HINTS: Record<SplitMode, string> = {
  EQUAL: "Everyone ticked pays the same.",
  EXACT: "Type what each person owes. It has to add up to the total.",
  PERCENTAGE: "Type a percentage per person. It has to add up to 100%.",
  SHARES: "Whole-number shares, e.g. 2 for someone who had twice as much.",
  ADJUSTMENT: "Split equally, then add (or subtract) an amount for someone.",
};

/** One-line status under a split / payer editor: remainder or "balanced". */
export function RemainderLine({
  mode,
  preview,
  currency,
  okText = "Balanced",
}: {
  mode: SplitMode | "PAYERS";
  preview: Pick<SplitPreview, "balanced" | "remaining" | "problem">;
  currency: string;
  okText?: string;
}) {
  if (preview.balanced) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700" role="status">
        <Check className="size-3.5" aria-hidden /> {okText}
      </p>
    );
  }
  let text = preview.problem;
  if (preview.remaining !== 0 && (preview.problem === "left to assign" || preview.problem.startsWith("over"))) {
    const amount =
      mode === "PERCENTAGE"
        ? `${percentToString(Math.abs(preview.remaining))}%`
        : formatCurrency(Math.abs(preview.remaining) / 100, currency);
    text = preview.remaining > 0 ? `${amount} left to assign` : `${amount} over the ${mode === "PERCENTAGE" ? "100%" : "total"}`;
  }
  return (
    <p className="text-xs font-medium text-rose-600" role="status">
      {text}
    </p>
  );
}

/**
 * Who shares the cost and how: mode tabs, a tickable list of people, a value
 * input per ticked person (for non-equal modes) and their computed share.
 */
export function SplitEditor({
  idPrefix,
  members,
  currentUserId,
  currency,
  modes,
  mode,
  onMode,
  selected,
  onToggle,
  onSelectAll,
  values,
  onValue,
  preview,
}: {
  idPrefix: string;
  members: FormMember[];
  currentUserId: string;
  currency: string;
  modes: SplitMode[];
  mode: SplitMode;
  onMode: (m: SplitMode) => void;
  selected: string[];
  onToggle: (userId: string) => void;
  onSelectAll: (all: boolean) => void;
  values: Record<string, string>;
  onValue: (userId: string, value: string) => void;
  preview: SplitPreview;
}) {
  const allTicked = selected.length === members.length;
  const indexOf = (id: string) => selected.indexOf(id);

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Split method" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onMode(m)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap sm:text-sm",
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{MODE_HINTS[mode]}</p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {selected.length} of {members.length} people
        </span>
        <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => onSelectAll(!allTicked)}>
          {allTicked ? "Clear all" : "Select all"}
        </button>
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {members.map((m) => {
          const i = indexOf(m.userId);
          const ticked = i >= 0;
          const cents = ticked ? (preview.cents[i] ?? 0) : 0;
          const inputId = `${idPrefix}-${m.userId}`;
          return (
            <li key={m.userId} className="flex items-center gap-2 px-3 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={() => onToggle(m.userId)}
                  className="size-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600"
                />
                <span className="min-w-0 truncate text-sm text-slate-900">
                  {m.userId === currentUserId ? "You" : m.name}
                </span>
                {m.status === "INVITED" && <Badge tone="warning" className="hidden sm:inline-flex">Invited</Badge>}
              </label>
              {ticked && mode !== "EQUAL" && (
                <div className="relative w-24 shrink-0 sm:w-28">
                  <input
                    id={inputId}
                    aria-label={`${MODE_LABELS[mode]} for ${m.userId === currentUserId ? "you" : m.name}`}
                    inputMode={mode === "SHARES" ? "numeric" : "decimal"}
                    value={values[m.userId] ?? ""}
                    onChange={(e) => onValue(m.userId, e.target.value)}
                    placeholder={mode === "SHARES" ? "1" : mode === "ADJUSTMENT" ? "+0.00" : "0"}
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 pr-6 text-right text-sm tabular focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {mode === "PERCENTAGE" ? "%" : mode === "SHARES" ? "×" : ""}
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "w-20 shrink-0 text-right text-sm tabular sm:w-24",
                  ticked ? "text-slate-700" : "text-slate-300"
                )}
              >
                {ticked ? formatCurrency(cents / 100, currency) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
