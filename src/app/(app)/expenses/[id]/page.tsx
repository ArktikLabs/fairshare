import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { loadExpenseDetail } from "@/lib/expense-detail";
import { historyLabel } from "@/lib/activity-format";
import { categoryLabel } from "@/lib/categories";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Avatar, Badge, Card, CardHeader, Money, PageHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExpenseActions, ReceiptCard } from "@/components/expense/expense-actions";
import { CommentsCard } from "@/components/expense/comments";
import { RecurringCard } from "@/components/expense/recurring-card";
import { describeRate } from "@/lib/fx";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  EQUAL: "Split equally",
  EXACT: "Split by amounts",
  PERCENTAGE: "Split by percent",
  SHARES: "Split by shares",
  ITEMIZED: "Split by item",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const d = session?.user?.id ? await loadExpenseDetail(id, session.user.id) : null;
  return { title: d ? `${d.description} · FairShare` : "Expense · FairShare" };
}

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ receiptError?: string }>;
}) {
  const { id } = await params;
  const { receiptError } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/expenses/${id}`);
  const userId = session.user.id;
  const d = await loadExpenseDetail(id, userId);
  if (!d) notFound();

  const cur = d.currency;
  const fmt = (c: number) => formatCurrency(c / 100, cur);
  const you = (p: { id: string; name: string }) => (p.id === userId ? "You" : p.name);
  const myNet = d.my.paid - d.my.share;
  const involved = d.my.paid !== 0 || d.my.share !== 0;
  const back = d.group ? (
    <Link href={`/groups/${d.group.id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
      <ChevronLeft className="size-4" aria-hidden /> {d.group.name}
    </Link>
  ) : (
    <Link href="/expenses" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
      <ChevronLeft className="size-4" aria-hidden /> Expenses
    </Link>
  );

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="flex items-center gap-3">
            <CategoryIcon category={d.category} />
            <span className="min-w-0 break-words">{d.description}</span>
          </span>
        }
        description={
          <>
            {formatDate(d.date)} · {categoryLabel(d.category)}
            {d.group ? <> · {d.group.name}</> : null}
          </>
        }
        actions={
          d.canManage && !d.deleted ? (
            <>
              <ButtonLink href={`/expenses/${d.id}/edit`} variant="secondary">
                <Pencil /> Edit
              </ButtonLink>
              <ExpenseActions expenseId={d.id} description={d.description} groupId={d.group?.id ?? null} mode="delete" />
            </>
          ) : null
        }
      />

      {receiptError && (
        <Alert tone="warning" className="mb-4">
          The expense was saved, but the receipt was not: {receiptError}
        </Alert>
      )}
      {d.deleted && (
        <Alert tone="warning" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Deleted{d.deleted.by ? ` by ${d.deleted.by.id === userId ? "you" : d.deleted.by.name}` : ""}
              {d.deleted.at ? ` on ${formatDateTime(d.deleted.at)}` : ""}. It no longer counts towards balances.
              {!d.deleted.restorable && " It can no longer be restored."}
            </span>
            {d.deleted.restorable && (
              <ExpenseActions expenseId={d.id} description={d.description} groupId={d.group?.id ?? null} mode="restore" />
            )}
          </div>
        </Alert>
      )}
      {d.archived && !d.deleted && (
        <Alert tone="info" className="mb-4">
          This group is archived, so the expense is read-only.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-3xl font-semibold text-slate-900">
                  <Money amount={d.amount / 100} currency={cur} />
                </p>
                {d.fx && (
                  <p className="mt-0.5 text-sm text-slate-600">
                    Paid <span className="font-medium tabular">{formatCurrency(d.fx.originalCents / 100, d.fx.originalCurrency)}</span>
                  </p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">{METHOD_LABEL[d.splitMethod] ?? d.splitMethod}</p>
              </div>
              <div className="text-right">
                {!involved ? (
                  <Badge>You are not on this expense</Badge>
                ) : myNet > 0 ? (
                  <p className="text-sm text-emerald-700">
                    you lent <span className="font-semibold">{fmt(myNet)}</span>
                  </p>
                ) : myNet < 0 ? (
                  <p className="text-sm text-rose-600">
                    you borrowed <span className="font-semibold">{fmt(-myNet)}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    your share <span className="font-semibold">{fmt(d.my.share)}</span>, paid in full
                  </p>
                )}
              </div>
            </div>

            <section aria-labelledby="paid-by" className="px-4 py-3 sm:px-5">
              <h2 id="paid-by" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paid by
              </h2>
              <ul className="space-y-2">
                {d.payers.map((p) => (
                  <li key={p.person.id} className="flex items-center gap-3">
                    <Avatar name={p.person.name} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{you(p.person)}</span>
                    <span className="tabular text-sm font-medium text-slate-900">{fmt(p.cents)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="shares" className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <h2 id="shares" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Each person&apos;s share
              </h2>
              <ul className="space-y-2">
                {d.shares.map((s) => {
                  const paid = d.payers.find((p) => p.person.id === s.person.id)?.cents ?? 0;
                  const net = paid - s.cents;
                  return (
                    <li key={s.person.id} className="flex items-center gap-3">
                      <Avatar name={s.person.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-900">{you(s.person)}</p>
                        <p className="text-xs text-slate-500">
                          {d.splitMethod === "PERCENTAGE" && s.percentage !== null ? `${s.percentage}% · ` : ""}
                          {d.splitMethod === "SHARES" && s.shares !== null ? `${s.shares} ${s.shares === 1 ? "share" : "shares"} · ` : ""}
                          {net > 0 ? (
                            <span className="text-emerald-700">gets back {fmt(net)}</span>
                          ) : net < 0 ? (
                            <span className="text-rose-600">owes {fmt(-net)}</span>
                          ) : (
                            "even"
                          )}
                        </p>
                      </div>
                      <span className="tabular text-sm font-medium text-slate-900">{fmt(s.cents)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Card>

          {d.itemized && (
            <Card>
              <CardHeader title="Items" description={`${d.items.length} ${d.items.length === 1 ? "item" : "items"}`} />
              <ul className="divide-y divide-slate-100">
                {d.items.map((it) => (
                  <li key={it.id} className="px-4 py-3 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 break-words text-sm font-medium text-slate-900">{it.name}</p>
                      <span className="tabular text-sm font-semibold text-slate-900">{fmt(it.cents)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {it.splits.map((s, i) => (
                        <span key={s.person.id}>
                          {i > 0 && " · "}
                          {you(s.person)} <span className="tabular">{fmt(s.cents)}</span>
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <CommentsCard
            expenseId={d.id}
            comments={d.comments.map((c) => ({ ...c, when: formatDateTime(c.createdAt) }))}
            currentUserId={userId}
            canComment={!d.archived && !d.deleted}
          />
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-slate-100 text-sm">
              <Row label="Date">{formatDate(d.date)}</Row>
              <Row label="Category">{categoryLabel(d.category)}</Row>
              {d.fx && (
                <Row label="Exchange rate">
                  {describeRate(d.fx.originalCurrency, cur, d.fx.rate)}
                  <span className="block text-xs text-slate-500">
                    {d.fx.source === "manual" ? "Entered by hand" : d.fx.source === "frankfurter" ? "ECB reference rate" : "Market rate"}
                    {d.fx.rateDate ? `, ${formatDate(d.fx.rateDate)}` : ""}
                  </span>
                </Row>
              )}
              {d.group && (
                <Row label="Group">
                  <Link href={`/groups/${d.group.id}`} className="text-brand-700 hover:underline">
                    {d.group.name}
                  </Link>
                </Row>
              )}
              <Row label="Added">
                {d.createdBy ? `${you(d.createdBy)}, ` : ""}
                {formatDateTime(d.createdAt)}
              </Row>
              {d.updatedBy && d.updatedAt !== d.createdAt && (
                <Row label="Last edited">
                  {you(d.updatedBy)}, {formatDateTime(d.updatedAt)}
                </Row>
              )}
            </dl>
            {d.notes && (
              <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{d.notes}</p>
              </div>
            )}
          </Card>

          {d.recurring && (
            <RecurringCard
              recurring={d.recurring}
              currency={cur}
              canManage={(d.canManage || d.recurring.ownerId === userId) && !d.archived}
              isSource={d.recurring.sourceExpenseId === d.id}
            />
          )}

          {(d.hasReceipt || (d.canManage && !d.deleted && !d.archived)) && (
            <ReceiptCard expenseId={d.id} hasReceipt={d.hasReceipt} canManage={d.canManage && !d.deleted && !d.archived} />
          )}

          <Card>
            <CardHeader title="History" description={d.history.length ? undefined : "Changes are tracked from now on"} />
            {d.history.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500 sm:px-5">
                Added {formatDateTime(d.createdAt)}. No changes recorded yet.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {d.history.map((h) => (
                  <li key={h.id} className="px-4 py-2.5 text-sm sm:px-5">
                    <p className="break-words text-slate-800">{historyLabel(h, userId)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 sm:px-5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-slate-900">{children}</dd>
    </div>
  );
}
