import { redirect } from "next/navigation";
import { ChartPie } from "lucide-react";
import { auth } from "@/auth";
import { CATEGORY_COLORS, loadInsights, type CurrencyInsights } from "@/lib/insights";
import { formatCurrency } from "@/lib/utils";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Spending insights · FairShare" };

type SP = Promise<{ groupId?: string; from?: string; to?: string }>;

const compact = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

export default async function InsightsPage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/insights");
  const sp = await searchParams;
  const data = await loadInsights(session.user.id, sp);
  const groupId = sp.groupId && data.groups.some((g) => g.id === sp.groupId) ? sp.groupId : "";

  return (
    <>
      <PageHeader title="Spending insights" description="Your share of expenses, not the group totals. Payments between people are not spending." />
      <Card className="mb-5">
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <Field label="Group" htmlFor="ins-group">
              <Select id="ins-group" name="groupId" defaultValue={groupId}>
                <option value="">All groups and friends</option>
                {data.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From" htmlFor="ins-from">
              <Input id="ins-from" type="date" name="from" defaultValue={data.from} />
            </Field>
            <Field label="To" htmlFor="ins-to">
              <Input id="ins-to" type="date" name="to" defaultValue={data.to} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <ButtonLink href="/insights" variant="ghost">
                Reset
              </ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>

      {data.currencies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChartPie />}
            title="No spending in this range"
            description="Try a longer date range, or add an expense you are part of."
            action={
              <ButtonLink href="/expenses/create" size="sm">
                Add expense
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {data.currencies.map((c) => (
            <CurrencySection key={c.currency} c={c} showHeading={data.currencies.length > 1} />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-slate-500">
        Amounts in different currencies are kept apart. Need the raw data?{" "}
        {/* Plain <a>: next/link would prefetch the CSV route as a page */}
        <a href="/api/expenses/export.csv" download className="text-brand-700 hover:underline">
          Download all your expenses as CSV
        </a>
        .
      </p>
    </>
  );
}

function CurrencySection({ c, showHeading }: { c: CurrencyInsights; showHeading: boolean }) {
  const maxCat = Math.max(...c.byCategory.map((x) => x.cents), 1);
  const maxMonth = Math.max(...c.byMonth.map((x) => x.cents), 1);
  const avg = Math.round(c.totalCents / Math.max(1, c.byMonth.length));
  return (
    <section aria-labelledby={`cur-${c.currency}`} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat className="col-span-2 sm:col-span-1" id={`cur-${c.currency}`} label={showHeading ? `Your share (${c.currency})` : "Your share"} value={formatCurrency(c.totalCents / 100, c.currency)} />
        <Stat label="Per month (avg)" value={formatCurrency(avg / 100, c.currency)} />
        <Stat label="Expenses" value={String(c.expenseCount)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader title="By month" />
          <CardBody>
            <figure>
              <div className="flex h-48 items-end gap-1 sm:gap-2" aria-hidden="true">
                {c.byMonth.map((m) => (
                  <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="hidden text-[10px] tabular-nums text-slate-500 sm:block">{m.cents ? compact(m.cents, c.currency) : ""}</span>
                    <div
                      className="w-full max-w-10 rounded-t bg-brand-500"
                      style={{ height: `${Math.max(m.cents ? 2 : 0, (m.cents / maxMonth) * 100)}%` }}
                      title={`${m.label}: ${formatCurrency(m.cents / 100, c.currency)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-1 border-t border-slate-200 pt-1 sm:gap-2" aria-hidden="true">
                {c.byMonth.map((m, i) => (
                  <span key={m.month} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500 sm:text-xs">
                    {c.byMonth.length > 8 && i % 2 === 1 ? "" : m.label}
                  </span>
                ))}
              </div>
              <figcaption className="sr-only">Your share per month in {c.currency}; the table below has the numbers.</figcaption>
            </figure>
            <DataTable
              caption={`Your share per month (${c.currency})`}
              head={["Month", "Your share"]}
              rows={c.byMonth.map((m) => [m.label, formatCurrency(m.cents / 100, c.currency)])}
            />
          </CardBody>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="By category" />
          <CardBody>
            <ul className="space-y-3">
              {c.byCategory.map((x) => (
                <li key={x.category}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[x.category] ?? "#475569" }} aria-hidden />
                      {x.label}
                    </span>
                    <span className="tabular whitespace-nowrap font-medium text-slate-900">
                      {formatCurrency(x.cents / 100, c.currency)}
                      <span className="ml-1 text-xs font-normal text-slate-500">{Math.round((x.cents / c.totalCents) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden>
                    <div className="h-2 rounded-full" style={{ width: `${(x.cents / maxCat) * 100}%`, background: CATEGORY_COLORS[x.category] ?? "#475569" }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, value, id, className }: { label: string; value: string; id?: string; className?: string }) {
  return (
    <Card className={className}>
      <div className="px-4 py-3">
        <p id={id} className="text-xs text-slate-500">
          {label}
        </p>
        <p className="tabular mt-0.5 truncate text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-brand-700 hover:underline">Show as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i ? "py-1 text-right font-medium" : "py-1 font-medium"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-slate-100">
              {r.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-1 font-normal text-slate-700">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="tabular py-1 text-right text-slate-900">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
