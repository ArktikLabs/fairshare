"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Receipt, Search, Trash2, X } from "lucide-react";
import type { SerializedExpense } from "@/lib/expense-serialize";
import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ActionMenu } from "@/components/ui/action-menu";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExpenseShare } from "@/components/money-bits";

const PAGE = 20;

interface Filters {
  groupId: string;
  category: string;
  from: string;
  to: string;
  q: string;
}

/**
 * Filterable, paginated expense list. With `fixedGroupId` the group filter
 * is hidden (group expenses page); otherwise it lists every group.
 */
export function ExpenseList({
  groups,
  fixedGroupId,
  currentUserId,
}: {
  groups: Array<{ id: string; name: string; currency: string }>;
  fixedGroupId?: string;
  currentUserId: string;
}) {
  const [filters, setFilters] = useState<Filters>({ groupId: fixedGroupId ?? "", category: "", from: "", to: "", q: "" });
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SerializedExpense[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<SerializedExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const req = useRef(0);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q.trim() ? f : { ...f, q: q.trim() })), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(
    async (after: string | null) => {
      const params = new URLSearchParams({ limit: String(PAGE) });
      (Object.keys(filters) as Array<keyof Filters>).forEach((k) => filters[k] && params.set(k, filters[k]));
      if (after) params.set("cursor", after);
      const res = await fetch(`/api/expenses?${params}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not load expenses");
      return body as { items: SerializedExpense[]; nextCursor: string | null };
    },
    [filters]
  );

  useEffect(() => {
    const id = ++req.current;
    setLoading(true);
    setError("");
    fetchPage(null)
      .then((r) => {
        if (id !== req.current) return;
        setItems(r.items);
        setCursor(r.nextCursor);
      })
      .catch((e) => id === req.current && setError(e.message))
      .finally(() => id === req.current && setLoading(false));
  }, [fetchPage]);

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(cursor);
      setItems((xs) => [...xs, ...r.items]);
      setCursor(r.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${toDelete.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not delete the expense");
      } else {
        setItems((xs) => xs.filter((x) => x.id !== toDelete.id));
        setNotice(`Deleted "${toDelete.description}"`);
      }
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  const anyFilter = !!(filters.category || filters.from || filters.to || filters.q || (!fixedGroupId && filters.groupId));
  const clear = () => {
    setQ("");
    setFilters({ groupId: fixedGroupId ?? "", category: "", from: "", to: "", q: "" });
  };
  const currencyOf = (e: SerializedExpense) =>
    e.group?.currency ?? groups.find((g) => g.id === e.groupId)?.currency ?? "USD";
  const addHref = fixedGroupId ? `/groups/${fixedGroupId}/expenses/create` : "/expenses/create";

  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
          <div className="relative col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              type="search"
              placeholder="Search description or notes"
              aria-label="Search expenses"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          {!fixedGroupId && (
            <Select aria-label="Group" value={filters.groupId} onChange={set("groupId")} className="col-span-2 sm:col-span-1">
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label="Category"
            value={filters.category}
            onChange={set("category")}
            className={fixedGroupId ? "col-span-2 sm:col-span-1 lg:col-span-2" : "col-span-2 sm:col-span-1"}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <label className="block">
            <span className="sr-only">From date</span>
            <Input type="date" value={filters.from} onChange={set("from")} max={filters.to || undefined} aria-label="From date" />
          </label>
          <label className="block">
            <span className="sr-only">To date</span>
            <Input type="date" value={filters.to} onChange={set("to")} min={filters.from || undefined} aria-label="To date" />
          </label>
        </div>
        {anyFilter && (
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clear}>
              <X /> Clear filters
            </Button>
          </div>
        )}
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title={anyFilter ? "No expenses match these filters" : "No expenses yet"}
            description={anyFilter ? undefined : "Expenses you add show up here with your share."}
            action={
              anyFilter ? (
                <Button variant="secondary" size="sm" onClick={clear}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink href={addHref} size="sm">
                  <Plus /> Add expense
                </ButtonLink>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((e) => {
              const payer =
                e.payers.length === 1
                  ? e.payers[0].userId === currentUserId
                    ? "You"
                    : e.payers[0].user.name || e.payers[0].user.email
                  : `${e.payers.length} people`;
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <CategoryIcon category={e.category} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-medium text-slate-900 sm:truncate">{e.description}</p>
                    <p className="line-clamp-2 text-xs text-slate-500 sm:truncate">
                      {!fixedGroupId && e.group && (
                        <>
                          <Link href={`/groups/${e.group.id}`} className="hover:underline">
                            {e.group.name}
                          </Link>
                          {" · "}
                        </>
                      )}
                      {payer} paid · {formatDate(e.date)}
                    </p>
                  </div>
                  <ExpenseShare expense={e} currency={currencyOf(e)} />
                  {e.canEdit ? (
                    <ActionMenu
                      label={`Actions for ${e.description}`}
                      actions={[{ label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => setToDelete(e) }]}
                    />
                  ) : (
                    <span className="w-8" aria-hidden />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {cursor && !loading && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="secondary" size="sm" onClick={more} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this expense?"
        description={toDelete ? `"${toDelete.description}" is removed and balances are recalculated.` : undefined}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={remove}
      />
    </div>
  );
}
