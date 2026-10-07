import { ArrowRight, Check, ListChecks, Mail, Receipt, Scale, Users } from "lucide-react";
import { auth } from "@/auth";
import { ButtonLink } from "@/components/ui/button";
import { SiteChrome } from "@/components/site/site-chrome";

export const metadata = {
  title: "FairShare · Split shared expenses, settle up with fewer payments",
  description:
    "A free app for splitting trips, flats and dinners. Track who paid, split any way you like, and settle up with the fewest payments.",
};

const features = [
  {
    icon: Users,
    title: "Groups for every set of people",
    text: "One group per trip, flat or club, each in its own currency. Invite by email or link; people can be on expenses before they sign up.",
  },
  {
    icon: Receipt,
    title: "Split it the way it happened",
    text: "Equally, exact amounts, percentages, shares, adjustments, item by item, and bills paid by more than one person.",
  },
  {
    icon: Scale,
    title: "Balances to the cent",
    text: "Amounts are kept in whole cents, so splits always add up exactly to the total. No rounding drift.",
  },
  {
    icon: ListChecks,
    title: "Fewest payments to settle",
    text: "FairShare suggests who pays whom so everyone is square with as few transfers as possible, then records them.",
  },
];

const steps = [
  { title: "Create a group", text: "Name it and pick its currency." },
  { title: "Invite people", text: "By email or a share link." },
  { title: "Add expenses", text: "Who paid, and how to split it." },
  { title: "Settle up", text: "Follow the suggested payments and mark them paid." },
];

/** A static rendering of the real dashboard UI (no fake data claims). */
function Preview() {
  const rows = [
    { who: "Dinner at Warung Made", meta: "Bali trip · You paid", amount: "Rp 840.000", note: "you lent Rp 630.000", tone: "text-emerald-700" },
    { who: "Scooter rental", meta: "Bali trip · Sam paid", amount: "Rp 450.000", note: "you borrowed Rp 112.500", tone: "text-rose-600" },
    { who: "Villa, 3 nights", meta: "Bali trip · Alex paid", amount: "Rp 6.000.000", note: "you borrowed Rp 1.500.000", tone: "text-rose-600" },
  ];
  return (
    <div aria-hidden className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xl shadow-slate-200/60 sm:p-4">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">IDR net</p>
          <p className="mt-1 text-lg font-semibold text-rose-600 tabular">−Rp 982.500</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Settle up</p>
          <p className="mt-1 text-sm text-slate-900">
            You pay <span className="font-medium">Alex</span>
          </p>
          <p className="text-sm font-semibold text-rose-600 tabular">Rp 982.500</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-900">Recent expenses</p>
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.who} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Receipt className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{r.who}</p>
                <p className="truncate text-xs text-slate-500">{r.meta}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-900 tabular">{r.amount}</p>
                <p className={`text-[11px] ${r.tone}`}>{r.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  return (
    <SiteChrome>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            Free to use · No ads
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Split shared expenses without the spreadsheet.
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
            FairShare keeps a running balance for trips, flats and dinners: who paid, who owes, and the fewest payments
            to settle up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {signedIn ? (
              <ButtonLink href="/dashboard" size="lg">
                Open your dashboard <ArrowRight />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/auth/register" size="lg">
                  Create a free account <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/auth/signin" size="lg" variant="secondary">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>
          <ul className="mt-6 space-y-1.5 text-sm text-slate-600">
            {["Any currency, including IDR", "Works on your phone in the browser", "Export your data any time"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <Preview />
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-14 sm:py-20" aria-labelledby="features-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="features-title" className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            What it does
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 py-14 sm:py-20" aria-labelledby="how-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="how-title" className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-slate-200 p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-start gap-4 rounded-xl bg-brand-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Ready for the next trip?</p>
              <p className="text-sm text-brand-100">FairShare is free. Questions: hello@arktik.id</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={signedIn ? "/dashboard" : "/auth/register"}
                className="bg-white text-brand-700 hover:bg-brand-50"
              >
                {signedIn ? "Open dashboard" : "Get started"}
              </ButtonLink>
              <a
                href="mailto:hello@arktik.id"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Mail className="size-4" aria-hidden /> Contact
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
