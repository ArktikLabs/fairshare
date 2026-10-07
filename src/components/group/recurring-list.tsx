import Link from "next/link";
import { Repeat } from "lucide-react";
import type { RecurringView } from "@/lib/recurring";
import { frequencyLabel } from "@/lib/recurrence";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { RecurringActions } from "@/components/expense/recurring-card";

export function RecurringList({
  items,
  currency,
  currentUserId,
  isAdmin,
}: {
  items: RecurringView[];
  currency: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <Card id="recurring">
      <CardHeader title="Repeating expenses" description="Added automatically on their dates. Set one up with Repeat when adding an expense." />
      {items.length === 0 ? (
        <EmptyState icon={<Repeat />} title="None yet" className="py-6" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((r) => (
            <li key={r.id} className="space-y-2 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-slate-900">
                  {r.sourceExpenseId ? (
                    <Link href={`/expenses/${r.sourceExpenseId}`} className="hover:underline">
                      {r.description}
                    </Link>
                  ) : (
                    r.description
                  )}
                </p>
                <span className="tabular text-sm font-semibold text-slate-900">{formatCurrency(r.amount / 100, currency)}</span>
              </div>
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge tone={r.status === "ACTIVE" ? "positive" : "warning"}>{r.status === "ACTIVE" ? "Active" : "Paused"}</Badge>
                {frequencyLabel(r.frequency)}
                {r.status === "ACTIVE" ? ` · next ${formatDate(r.nextDate)}` : ""}
                {r.endDate ? ` · until ${formatDate(r.endDate)}` : ""} · by {r.ownerId === currentUserId ? "you" : r.ownerName}
              </p>
              {r.lastError && <p className="text-xs text-amber-700">Not added: {r.lastError}</p>}
              {(isAdmin || r.ownerId === currentUserId) && <RecurringActions r={r} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
