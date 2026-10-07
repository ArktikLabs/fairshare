"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ListPlus, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES, guessCategory, type CategoryValue } from "@/lib/categories";
import {
  buildParticipants,
  centsToNumber,
  evenPayerValues,
  localDateString,
  parseCents,
  previewPayers,
  previewSplit,
  splitStateFromStored,
  centsToInput,
  type ItemSplitMode,
  type StoredExpenseForForm,
  type SplitMode,
} from "@/lib/split-form";
import { currencyDigits, getCurrency, minorUnitCents } from "@/lib/currencies";
import { REPEAT_OPTIONS, type RepeatChoice } from "@/lib/recurrence";
import { describeRate, parseRate } from "@/lib/fx";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert, Card } from "@/components/ui/primitives";
import { CATEGORY_ICONS } from "@/components/ui/category-icon";
import { RemainderLine, SplitEditor, type FormMember } from "./split-editor";
import { ReceiptPicker, uploadReceipt, type ReceiptChoice } from "./receipt-picker";

export const LAST_GROUP_KEY = "fairshare:lastGroupId";

export interface FormGroup {
  id: string;
  name: string;
  currency: string;
  members: FormMember[];
}

interface ItemState {
  key: number;
  name: string;
  amount: string;
  mode: ItemSplitMode;
  selected: string[];
  values: Record<string, string>;
}

const SIMPLE_MODES: SplitMode[] = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES", "ADJUSTMENT"];
const ITEM_MODES: SplitMode[] = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"];

/** Default text in a value box when switching to a mode. */
function seedValues(mode: SplitMode, ids: string[], prev: Record<string, string>): Record<string, string> {
  if (mode !== "SHARES") return prev;
  const next = { ...prev };
  ids.forEach((id) => {
    if (!next[id] || !/^\d+$/.test(next[id])) next[id] = "1";
  });
  return next;
}

function sumCents(values: string[], digits: 0 | 2) {
  let total = 0;
  for (const v of values) {
    const c = parseCents(v, digits);
    if (c === null || c < 0) return null;
    total += c;
  }
  return total;
}

/** An existing expense opened in the form for editing. */
export interface EditingExpense extends StoredExpenseForForm {
  id: string;
  hasReceipt: boolean;
  /** People on the expense who are no longer group members */
  extraPeople?: FormMember[];
}

/** Initial editor state: blank for a new expense, or the stored expense. */
function initialState(members: FormMember[], currentUserId: string, currency: string, editing?: EditingExpense) {
  const allIds = members.map((m) => m.userId);
  const digits = currencyDigits(currency);
  const unit = minorUnitCents(currency);
  if (!editing) {
    return {
      description: "",
      amount: "",
      date: localDateString(),
      category: "OTHER" as CategoryValue,
      notes: "",
      itemized: false,
      mode: "EQUAL" as SplitMode,
      selected: allIds,
      values: {} as Record<string, string>,
      items: [] as ItemState[],
      multiPayer: false,
      payer: currentUserId,
      payers: [] as Array<{ userId: string; value: string }>,
    };
  }
  const simple = splitStateFromStored(editing.splitMethod, editing.amount, editing.splits, allIds, unit);
  const multi = editing.payers.length > 1;
  return {
    description: editing.description,
    amount: centsToInput(editing.amount, digits),
    date: editing.date,
    category: (editing.category ?? "OTHER") as CategoryValue,
    notes: editing.notes ?? "",
    itemized: editing.items.length > 0,
    mode: simple.mode as SplitMode,
    selected: editing.items.length > 0 ? allIds : simple.selected,
    values: simple.values,
    items: editing.items.map((it, i) => {
      const st = splitStateFromStored(it.splitMethod, it.amount, it.splits, allIds, unit);
      return { key: i + 1, name: it.name, amount: centsToInput(it.amount, digits), mode: st.mode, selected: st.selected, values: st.values };
    }),
    multiPayer: multi,
    payer: editing.payers[0]?.userId ?? currentUserId,
    payers: multi ? editing.payers.map((p) => ({ userId: p.userId, value: centsToInput(p.amount, digits) })) : [],
  };
}

export function ExpenseForm({
  groups,
  initialGroupId,
  currentUserId,
  allowGroupSwitch,
  editing,
  doneHref,
}: {
  groups: FormGroup[];
  initialGroupId: string;
  currentUserId: string;
  /** /expenses/create shows a group picker; the group route does not. */
  allowGroupSwitch: boolean;
  /** Edit mode: the stored expense. Saving replaces payers, splits and items. */
  editing?: EditingExpense;
  /** Where to go after saving a new expense (default: the group page) */
  doneHref?: string;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(initialGroupId);
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  // In edit mode, people already on the expense who have since left the group
  // stay selectable so the expense can still be saved as it was.
  const members = useMemo(() => {
    if (!editing) return group.members;
    const known = new Set(group.members.map((m) => m.userId));
    const extra = (editing.extraPeople ?? []).filter((p) => !known.has(p.userId));
    return [...group.members, ...extra];
  }, [editing, group.members]);
  const allIds = useMemo(() => members.map((m) => m.userId), [members]);
  const groupCurrency = group.currency;
  // The expense may be paid in another currency; the ledger stays in the group's
  const [currency, setCurrency] = useState(editing?.currency || groupCurrency);
  const foreign = currency !== groupCurrency;
  const digits = currencyDigits(currency);
  const unit = minorUnitCents(currency);
  const placeholder = digits === 0 ? "0" : "0.00";
  const symbol = getCurrency(currency)?.symbol ?? currency;
  const [init] = useState(() => initialState(members, currentUserId, currency, editing));
  const [rateText, setRateText] = useState(editing?.exchangeRate ? String(editing.exchangeRate) : "");
  const [rateInfo, setRateInfo] = useState<{ state: "idle" | "loading" | "ok" | "failed"; day?: string; source?: string }>({ state: "idle" });
  const [rateEdited, setRateEdited] = useState(Boolean(editing?.exchangeRate));
  const [repeat, setRepeat] = useState<RepeatChoice>(editing?.repeat?.frequency ?? "NONE");
  const [repeatEnd, setRepeatEnd] = useState(editing?.repeat?.endDate ?? "");

  const [description, setDescription] = useState(init.description);
  const [amount, setAmount] = useState(init.amount);
  const [date, setDate] = useState(init.date);
  const [category, setCategory] = useState<CategoryValue>(init.category);
  const [categoryTouched, setCategoryTouched] = useState(Boolean(editing));
  const [notes, setNotes] = useState(init.notes);
  const [moreOpen, setMoreOpen] = useState(Boolean(editing && (init.notes || editing.hasReceipt)));

  const [itemized, setItemized] = useState(init.itemized);
  const [mode, setMode] = useState<SplitMode>(init.mode);
  const [selected, setSelected] = useState<string[]>(init.selected);
  const [values, setValues] = useState<Record<string, string>>(init.values);
  const [items, setItems] = useState<ItemState[]>(init.items);
  const [nextKey, setNextKey] = useState(init.items.length + 1);

  const [multiPayer, setMultiPayer] = useState(init.multiPayer);
  const [payer, setPayer] = useState(init.payer);
  const [payers, setPayers] = useState<Array<{ userId: string; value: string }>>(init.payers);
  const [receipt, setReceipt] = useState<ReceiptChoice>({ kind: editing?.hasReceipt ? "keep" : "none" });

  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Look up the day's rate for a foreign currency (the user can override it)
  useEffect(() => {
    if (!foreign || rateEdited || !date) return;
    let cancelled = false;
    setRateInfo({ state: "loading" });
    fetch(`/api/fx/rate?from=${currency}&to=${groupCurrency}&date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { rate?: number; day?: string; source?: string } | null) => {
        if (cancelled) return;
        if (j?.rate) {
          setRateText(String(Number(j.rate.toPrecision(8))));
          setRateInfo({ state: "ok", day: j.day, source: j.source });
        } else {
          setRateInfo({ state: "failed" });
        }
      })
      .catch(() => !cancelled && setRateInfo({ state: "failed" }));
    return () => {
      cancelled = true;
    };
  }, [foreign, currency, groupCurrency, date, rateEdited]);
  const rate = foreign ? parseRate(rateText) : 1;

  // Remember the group for the next /expenses/create
  useEffect(() => {
    if (editing) return;
    try {
      localStorage.setItem(LAST_GROUP_KEY, group.id);
    } catch {
      /* private mode */
    }
  }, [group.id, editing]);

  // Switching group resets the people-dependent state
  const switchGroup = (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    setGroupId(id);
    setSelected(g.members.map((m) => m.userId));
    setValues({});
    setPayer(g.members.some((m) => m.userId === currentUserId) ? currentUserId : g.members[0]?.userId);
    setPayers([]);
    setMultiPayer(false);
    setItems((xs) => xs.map((it) => ({ ...it, selected: g.members.map((m) => m.userId), values: {} })));
    setCurrency(g.currency);
    setRateText("");
    setRateEdited(false);
  };
  const changeCurrency = (code: string) => {
    setCurrency(code);
    setRateEdited(false);
    setRateText("");
    setRateInfo({ state: "idle" });
  };

  const orderSel = (ids: string[]) => allIds.filter((id) => ids.includes(id));
  const nameOf = (id: string) => (id === currentUserId ? "You" : members.find((m) => m.userId === id)?.name ?? "?");

  // ----- totals -----
  const itemsTotal = useMemo(() => sumCents(items.map((i) => i.amount), digits), [items, digits]);
  const totalCents = itemized ? itemsTotal : parseCents(amount, digits);

  // ----- split previews -----
  const simplePreview = useMemo(
    () => previewSplit(mode, totalCents, selected.map((id) => ({ value: values[id] ?? "" })), unit),
    [mode, totalCents, selected, values, unit]
  );
  const itemPreviews = useMemo(
    () => items.map((it) => previewSplit(it.mode, parseCents(it.amount, digits), it.selected.map((id) => ({ value: it.values[id] ?? "" })), unit)),
    [items, digits, unit]
  );
  const payerRows = multiPayer ? payers : [{ userId: payer, value: "" }];
  const payerPreview = useMemo(
    () => previewPayers(totalCents, payerRows.map((p) => p.value), digits),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalCents, multiPayer, payers, payer, digits]
  );

  // ----- validation -----
  const errors: Record<string, string> = {};
  if (!description.trim()) errors.description = "Add a short description";
  if (!itemized) {
    if (!amount.trim()) errors.amount = "Enter the total";
    else if (totalCents === null || totalCents <= 0)
      errors.amount = digits === 0 ? `Enter a whole amount above 0 (${currency} has no decimals)` : "Enter an amount above 0 with at most 2 decimals";
  } else {
    if (items.length === 0) errors.items = "Add at least one item";
    items.forEach((it, i) => {
      if (!it.name.trim()) errors[`item-${it.key}-name`] = "Name the item";
      const c = parseCents(it.amount, digits);
      if (c === null || c <= 0) errors[`item-${it.key}-amount`] = "Enter a price";
      else if (!itemPreviews[i].balanced) errors[`item-${it.key}-split`] = itemPreviews[i].problem;
    });
  }
  if (!date) errors.date = "Pick a date";
  if (foreign && !rate) errors.rate = rateInfo.state === "loading" ? "Looking up the rate" : `Enter how many ${groupCurrency} one ${currency} is`;
  if (repeat !== "NONE" && repeatEnd && repeatEnd < date) errors.repeatEnd = "The end date is before the first date";
  const splitOk = itemized ? items.length > 0 && itemPreviews.every((p) => p.balanced) : simplePreview.balanced;
  const payersOk = payerPreview.balanced && new Set(payerRows.map((p) => p.userId)).size === payerRows.length;
  const valid = Object.keys(errors).length === 0 && splitOk && payersOk;
  const show = (k: string) => (touched || k.startsWith("item") ? errors[k] : undefined);

  // ----- handlers -----
  const changeMode = (m: SplitMode) => {
    setMode(m);
    setValues((v) => seedValues(m, selected, v));
  };
  const toggle = (id: string) => {
    setSelected((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : orderSel([...s, id]);
      if (mode === "SHARES") setValues((v) => seedValues("SHARES", next, v));
      return next;
    });
  };
  const describe = (text: string) => {
    setDescription(text);
    if (!categoryTouched) setCategory(guessCategory(text));
  };

  const setItem = (key: number, patch: Partial<ItemState>) =>
    setItems((xs) => xs.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = () => {
    setItems((xs) => [...xs, { key: nextKey, name: "", amount: "", mode: "EQUAL", selected: allIds, values: {} }]);
    setNextKey((k) => k + 1);
  };
  const startItemized = () => {
    setItemized(true);
    if (items.length === 0) {
      setItems([{ key: nextKey, name: description.trim() || "", amount: amount, mode: "EQUAL", selected, values: {} }]);
      setNextKey((k) => k + 1);
    }
  };

  const enableMultiPayer = () => {
    const ids = [payer];
    setPayers(ids.map((userId, i) => ({ userId, value: evenPayerValues(totalCents, ids.length, digits)[i] })));
    setMultiPayer(true);
  };
  const addPayer = (userId: string) => {
    if (!userId) return;
    const next = [...payers.map((p) => p.userId), userId];
    const even = evenPayerValues(totalCents, next.length, digits);
    setPayers(next.map((id, i) => ({ userId: id, value: even[i] })));
  };
  const splitPayersEvenly = () => {
    const even = evenPayerValues(totalCents, payers.length, digits);
    setPayers((ps) => ps.map((p, i) => ({ ...p, value: even[i] })));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError("");
    if (!valid || totalCents === null) return;

    const payload: Record<string, unknown> = {
      groupId: group.id,
      description: description.trim(),
      amount: centsToNumber(totalCents),
      date,
      category,
      notes: notes.trim() || undefined,
      payers: payerRows.map((p, i) => ({ userId: p.userId, amountPaid: centsToNumber(payerPreview.cents[i]) })),
    };
    if (itemized) {
      payload.items = items.map((it, i) => {
        const built = buildParticipants(it.mode, it.selected, it.selected.map((id) => ({ value: it.values[id] ?? "" })), itemPreviews[i]);
        return {
          name: it.name.trim(),
          amount: centsToNumber(parseCents(it.amount, digits)!),
          quantity: 1,
          isShared: it.selected.length > 1,
          splitMethod: built.splitMethod,
          participants: built.participants,
        };
      });
    } else {
      const built = buildParticipants(mode, selected, selected.map((id) => ({ value: values[id] ?? "" })), simplePreview);
      payload.splitMethod = built.splitMethod;
      payload.participants = built.participants;
    }

    if (editing) payload.notes = notes.trim() || null;
    payload.currency = currency;
    if (foreign && rate) payload.exchangeRate = rate;
    if (!editing || repeat !== "NONE" || editing.repeat) {
      payload.repeat = { frequency: repeat, endDate: repeat !== "NONE" && repeatEnd ? repeatEnd : null };
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/expenses/${editing.id}` : "/api/expenses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(body.details) ? body.details.map((d: { message?: string }) => d.message).filter(Boolean).join(", ") : "";
        setServerError([body.error || "Could not save the expense", detail].filter(Boolean).join(": "));
        return;
      }
      const expenseId: string = editing ? editing.id : body.id;
      // The expense is saved; a failed receipt upload is reported on the expense page
      let receiptFailed = "";
      if (receipt.kind === "new") {
        receiptFailed = await uploadReceipt(expenseId, receipt.file);
      } else if (receipt.kind === "remove" && editing?.hasReceipt) {
        const r = await fetch(`/api/expenses/${expenseId}/receipt`, { method: "DELETE" });
        if (!r.ok) receiptFailed = "Could not remove the receipt";
      }
      const q = receiptFailed ? `?receiptError=${encodeURIComponent(receiptFailed)}` : "";
      router.push(editing || receipt.kind === "new" || receiptFailed ? `/expenses/${expenseId}${q}` : doneHref ?? `/groups/${group.id}`);
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Why the submit button is disabled, shown next to it
  const blocker = !valid
    ? errors.description && !description
      ? "Add a description"
      : errors.amount
        ? "Enter the total"
        : errors.rate
          ? errors.rate
        : errors.items
          ? errors.items
          : !splitOk
            ? itemized
              ? "Finish splitting each item"
              : "Finish the split"
            : !payersOk
              ? "Fix who paid"
              : "Check the highlighted fields"
    : "";

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
      <div className="min-w-0 space-y-5 lg:col-span-3">
        <Card className="space-y-4 p-4 sm:p-5">
          {allowGroupSwitch && groups.length > 1 && (
            <Field label="Group" htmlFor="exp-group">
              <Select id="exp-group" value={group.id} onChange={(e) => switchGroup(e.target.value)}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.currency})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Description" htmlFor="exp-desc" error={show("description")}>
            <Input
              id="exp-desc"
              autoFocus={!editing}
              value={description}
              onChange={(e) => describe(e.target.value)}
              placeholder="e.g. Dinner at Warung Made"
              maxLength={200}
              aria-invalid={show("description") ? true : undefined}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {itemized ? (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Total</p>
                <p className="flex h-10 items-center text-lg font-semibold tabular text-slate-900">
                  {formatCurrency((itemsTotal ?? 0) / 100, currency)}
                </p>
                <p className="text-xs text-slate-500">Sum of the items</p>
              </div>
            ) : (
              <Field label={`Total (${currency})`} htmlFor="exp-amount" error={show("amount")}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{symbol}</span>
                  <Input
                    id="exp-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={placeholder}
                    className={cn("text-right text-base font-semibold tabular", symbol.length > 2 ? "pl-12" : "pl-8")}
                    aria-invalid={show("amount") ? true : undefined}
                  />
                </div>
              </Field>
            )}
            <Field label="Date" htmlFor="exp-date" error={show("date")}>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency" htmlFor="exp-currency">
              <CurrencySelect id="exp-currency" value={currency} onChange={changeCurrency} />
            </Field>
            <Field label="Repeat" htmlFor="exp-repeat">
              <Select id="exp-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatChoice)}>
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {foreign && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Field
                label={`Rate: ${groupCurrency} per 1 ${currency}`}
                htmlFor="exp-rate"
                error={touched || rateInfo.state === "failed" ? errors.rate : undefined}
                hint={
                  rateInfo.state === "loading"
                    ? "Looking up today's rate..."
                    : rateInfo.state === "ok" && !rateEdited
                      ? `${rateInfo.source === "frankfurter" ? "ECB reference rate" : "Market rate"} for ${rateInfo.day}. You can change it.`
                      : rateInfo.state === "failed" && !rateEdited
                        ? "No rate available for this currency. Enter it yourself."
                        : "Entered by hand"
                }
              >
                <Input
                  id="exp-rate"
                  inputMode="decimal"
                  value={rateText}
                  onChange={(e) => {
                    setRateText(e.target.value);
                    setRateEdited(true);
                  }}
                  className="tabular"
                  aria-invalid={errors.rate && touched ? true : undefined}
                />
              </Field>
              {rate && totalCents ? (
                <p className="mt-2 text-sm text-slate-700">
                  {formatCurrency(totalCents / 100, currency)} ≈{" "}
                  <span className="font-semibold">{formatCurrency(Math.round((totalCents * rate) / minorUnitCents(groupCurrency)) * minorUnitCents(groupCurrency) / 100, groupCurrency)}</span>
                  <span className="text-slate-500"> · {describeRate(currency, groupCurrency, rate)}</span>
                </p>
              ) : null}
            </div>
          )}
          {repeat !== "NONE" && (
            <Field label="Ends (optional)" htmlFor="exp-repeat-end" error={errors.repeatEnd} hint="The next one is added automatically on its date. Leave empty to repeat until you stop it.">
              <Input id="exp-repeat-end" type="date" value={repeatEnd} min={date} onChange={(e) => setRepeatEnd(e.target.value)} />
            </Field>
          )}

          <div>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} aria-hidden />
              More options
              <span className="font-normal text-slate-400">
                · {CATEGORIES.find((c) => c.value === category)?.label}
                {notes.trim() ? " · note" : ""}
                {receipt.kind === "new" || receipt.kind === "keep" ? " · receipt" : ""}
              </span>
            </button>
            {moreOpen && (
              <div className="mt-3 space-y-4">
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-slate-700">Category</legend>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                    {CATEGORIES.map((c) => {
                      const Icon = CATEGORY_ICONS[c.value];
                      return (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={category === c.value}
                          onClick={() => {
                            setCategory(c.value);
                            setCategoryTouched(true);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs",
                            category === c.value
                              ? "border-brand-500 bg-brand-50 text-brand-800"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Icon className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <Field label="Notes" htmlFor="exp-notes">
                  <Textarea id="exp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                </Field>
                <ReceiptPicker
                  value={receipt}
                  onChange={setReceipt}
                  existingUrl={editing?.hasReceipt ? `/api/expenses/${editing.id}/receipt?size=thumb` : null}
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Paid by</h2>
            {!multiPayer ? (
              <button type="button" onClick={enableMultiPayer} className="text-xs font-medium text-brand-700 hover:underline">
                Several people paid
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMultiPayer(false);
                  setPayer(payers[0]?.userId ?? currentUserId);
                }}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                One person paid
              </button>
            )}
          </div>
          {!multiPayer ? (
            <Select aria-label="Who paid" value={payer} onChange={(e) => setPayer(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userId === currentUserId ? "You" : m.name}
                  {m.status === "INVITED" ? " (invited)" : ""}
                </option>
              ))}
            </Select>
          ) : (
            <div className="space-y-2">
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {payers.map((p, i) => (
                  <li key={p.userId} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{nameOf(p.userId)}</span>
                    <input
                      aria-label={`Amount paid by ${nameOf(p.userId)}`}
                      inputMode="decimal"
                      value={p.value}
                      onChange={(e) => setPayers((ps) => ps.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                      placeholder={placeholder}
                      className="h-8 w-28 rounded-md border border-slate-300 px-2 text-right text-sm tabular focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${nameOf(p.userId)} as payer`}
                      disabled={payers.length <= 1}
                      onClick={() => setPayers((ps) => ps.filter((_, j) => j !== i))}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                {members.some((m) => !payers.some((p) => p.userId === m.userId)) && (
                  <Select aria-label="Add a payer" value="" onChange={(e) => addPayer(e.target.value)} className="h-8 w-auto text-xs">
                    <option value="">+ Add payer</option>
                    {members
                      .filter((m) => !payers.some((p) => p.userId === m.userId))
                      .map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.userId === currentUserId ? "You" : m.name}
                        </option>
                      ))}
                  </Select>
                )}
                <Button variant="ghost" size="sm" onClick={splitPayersEvenly} disabled={!totalCents}>
                  Split evenly
                </Button>
              </div>
              <RemainderLine mode="PAYERS" preview={payerPreview} currency={currency} okText="Payments add up to the total" />
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{itemized ? "Items" : "Split"}</h2>
            <button
              type="button"
              onClick={() => (itemized ? setItemized(false) : startItemized())}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              {itemized ? (
                <>
                  <Users className="size-3.5" aria-hidden /> Split the whole bill
                </>
              ) : (
                <>
                  <ListPlus className="size-3.5" aria-hidden /> Split by item
                </>
              )}
            </button>
          </div>

          {!itemized ? (
            <>
              <SplitEditor
                idPrefix="split"
                members={members}
                currentUserId={currentUserId}
                currency={currency}
                modes={SIMPLE_MODES}
                mode={mode}
                onMode={changeMode}
                selected={selected}
                onToggle={toggle}
                onSelectAll={(all) => {
                  const next = all ? allIds : [];
                  setSelected(next);
                  if (mode === "SHARES") setValues((v) => seedValues("SHARES", next, v));
                }}
                values={values}
                onValue={(id, v) => setValues((xs) => ({ ...xs, [id]: v }))}
                preview={simplePreview}
              />
              {(totalCents ?? 0) > 0 || mode !== "EQUAL" ? (
                <RemainderLine mode={mode} preview={simplePreview} currency={currency} okText="Split adds up to the total" />
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              {items.map((it, i) => (
                <div key={it.key} className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 grid-cols-5 gap-2">
                      <div className="col-span-3">
                        <Input
                          aria-label={`Item ${i + 1} name`}
                          value={it.name}
                          onChange={(e) => setItem(it.key, { name: e.target.value })}
                          placeholder="Item"
                          aria-invalid={errors[`item-${it.key}-name`] && it.name !== "" ? true : undefined}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          aria-label={`Item ${i + 1} price`}
                          inputMode="decimal"
                          value={it.amount}
                          onChange={(e) => setItem(it.key, { amount: e.target.value })}
                          placeholder={placeholder}
                          className="text-right tabular"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove item ${i + 1}`}
                      onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}
                      className="mt-1.5 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <SplitEditor
                    idPrefix={`item-${it.key}`}
                    members={members}
                    currentUserId={currentUserId}
                    currency={currency}
                    modes={ITEM_MODES}
                    mode={it.mode}
                    onMode={(m) => setItem(it.key, { mode: m as ItemSplitMode, values: seedValues(m, it.selected, it.values) })}
                    selected={it.selected}
                    onToggle={(id) => {
                      const next = it.selected.includes(id) ? it.selected.filter((x) => x !== id) : orderSel([...it.selected, id]);
                      setItem(it.key, { selected: next, values: it.mode === "SHARES" ? seedValues("SHARES", next, it.values) : it.values });
                    }}
                    onSelectAll={(all) => setItem(it.key, { selected: all ? allIds : [], values: it.mode === "SHARES" ? seedValues("SHARES", allIds, it.values) : it.values })}
                    values={it.values}
                    onValue={(id, v) => setItem(it.key, { values: { ...it.values, [id]: v } })}
                    preview={itemPreviews[i]}
                  />
                  {parseCents(it.amount, digits) ? (
                    <RemainderLine mode={it.mode} preview={itemPreviews[i]} currency={currency} okText="Item split adds up" />
                  ) : null}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addItem}>
                <Plus /> Add item
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="space-y-4 p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Group</dt>
              <dd className="truncate font-medium text-slate-900">{group.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Total</dt>
              <dd className="font-semibold tabular text-slate-900">{formatCurrency((totalCents ?? 0) / 100, currency)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Your share</dt>
              <dd className="tabular text-slate-900">
                {formatCurrency(
                  (itemized
                    ? items.reduce((s, it, i) => {
                        const j = it.selected.indexOf(currentUserId);
                        return s + (j >= 0 ? itemPreviews[i].cents[j] ?? 0 : 0);
                      }, 0)
                    : (() => {
                        const j = selected.indexOf(currentUserId);
                        return j >= 0 ? simplePreview.cents[j] ?? 0 : 0;
                      })()) / 100,
                  currency
                )}
              </dd>
            </div>
          </dl>
          {serverError && <Alert tone="error">{serverError}</Alert>}
          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" disabled={submitting || !valid}>
              {submitting ? "Saving..." : editing ? "Save changes" : "Save expense"}
            </Button>
            {!valid && blocker && <p className="text-center text-xs text-slate-500">{blocker}</p>}
            <Button variant="ghost" className="w-full" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
