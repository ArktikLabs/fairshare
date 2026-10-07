import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/primitives";

/** "you owe / you are owed / settled" with the amount, right-aligned. */
export function BalanceLabel({ net, currency, className }: { net: number; currency: string; className?: string }) {
  const c = Math.round(net * 100);
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <p className="text-[11px] leading-4 text-slate-500">{c > 0 ? "you are owed" : c < 0 ? "you owe" : "settled up"}</p>
      {c !== 0 && <Money amount={net} currency={currency} absolute className="text-sm font-semibold" />}
    </div>
  );
}

/**
 * Right-hand column for an expense row: the total plus what it means for me
 * ("you lent 20.00" / "you borrowed 10.00" / "not involved").
 */
export function ExpenseShare({
  expense,
  currency,
  className,
}: {
  expense: { amount: number; my: { paid: number; share: number; net: number } };
  currency: string;
  className?: string;
}) {
  const net = Math.round(expense.my.net * 100);
  const involved = Math.round(expense.my.paid * 100) !== 0 || Math.round(expense.my.share * 100) !== 0;
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <Money amount={expense.amount} currency={currency} className="text-sm font-semibold text-slate-900" />
      <p className="text-[11px] leading-4 [&_.tabular]:block sm:[&_.tabular]:inline">
        {!involved ? (
          <span className="text-slate-400">not involved</span>
        ) : net > 0 ? (
          <span className="text-emerald-700">
            you lent <Money amount={expense.my.net} currency={currency} />
          </span>
        ) : net < 0 ? (
          <span className="text-rose-600">
            you borrowed <Money amount={-expense.my.net} currency={currency} />
          </span>
        ) : (
          <span className="text-slate-500">
            your share <Money amount={expense.my.share} currency={currency} />
          </span>
        )}
      </p>
    </div>
  );
}
