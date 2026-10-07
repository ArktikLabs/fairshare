"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { getCurrency, searchCurrencies } from "@/lib/currencies";

/**
 * Searchable ISO currency picker. Renders a hidden input with `name` so it
 * also works inside plain forms.
 */
export function CurrencySelect({
  id,
  name,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCurrencies(query), [query]);
  const current = getCurrency(value);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover.Trigger
        id={id}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
      >
        <span className="min-w-0 truncate">
          {current ? (
            <>
              <span className="font-medium">{current.code}</span>
              <span className="text-slate-500"> · {current.name}</span>
            </>
          ) : (
            value || "Choose a currency"
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  pick(results[0].code);
                }
              }}
              placeholder="Search code or name (e.g. IDR, euro)"
              aria-label="Search currencies"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <ul role="listbox" aria-label="Currencies" className="max-h-64 overflow-y-auto p-1">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No currency found</li>}
            {results.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === value}
                  onClick={() => pick(c.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-100",
                    c.code === value && "bg-brand-50"
                  )}
                >
                  <span className="w-10 font-medium text-slate-900">{c.code}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.symbol}</span>
                  {c.code === value && <Check className="size-4 text-brand-600" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
