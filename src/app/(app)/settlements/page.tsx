import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/auth";
import { loadUserOverview } from "@/lib/overview";
import { formatCurrency } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Money, PageHeader } from "@/components/ui/primitives";
import { BalanceLabel } from "@/components/money-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settle up · FairShare" };

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settlements");

  const { groups, totals } = await loadUserOverview(session.user.id);
  const open = groups.filter((g) => g.myStatus === "ACTIVE" && g.owes.length + g.owed.length > 0);
  const currencies = Object.keys(totals).filter((c) => Math.round(totals[c].net * 100) !== 0);

  return (
    <>
      <PageHeader title="Settle up" description="What you owe and are owed across all your groups." />
      {currencies.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {currencies.map((c) => (
            <span key={c} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              {c} net <Money amount={totals[c].net} currency={c} signed className="font-semibold" />
            </span>
          ))}
        </div>
      )}

      {open.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Check />}
            title="You are all settled up"
            description="No open balances in any of your groups."
            action={
              <ButtonLink href="/groups" variant="secondary" size="sm">
                Your groups
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {open.map((g) => (
            <Card key={g.id}>
              <CardHeader
                title={
                  <Link href={g.href} className="hover:underline">
                    {g.name}
                  </Link>
                }
                action={<BalanceLabel net={g.net} currency={g.currency} />}
              />
              <ul className="divide-y divide-slate-100">
                {g.owes.map((s) => (
                  <li key={s.toUserId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                    <span className="min-w-0 truncate">
                      You pay <span className="font-medium">{s.toUserName}</span>
                    </span>
                    <span className="tabular font-semibold text-rose-600">{formatCurrency(s.amount, g.currency)}</span>
                  </li>
                ))}
                {g.owed.map((s) => (
                  <li key={s.fromUserId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                    <span className="flex min-w-0 gap-1">
                      <span className="truncate font-medium">{s.fromUserName}</span>
                      <span className="shrink-0">pays you</span>
                    </span>
                    <span className="tabular font-semibold text-emerald-700">{formatCurrency(s.amount, g.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                <Link
                  href={g.kind === "DIRECT" ? g.href : `${g.href}#settle`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  Record a payment <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
