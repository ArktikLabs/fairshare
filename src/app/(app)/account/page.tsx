import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";
import { loadNotificationSettings } from "@/lib/notify/prefs";
import { PageHeader } from "@/components/ui/primitives";
import { AccountSettings } from "@/components/account/account-settings";
import { NotificationSettings } from "@/components/account/notification-settings";

export const metadata = { title: "Account · FairShare" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "profile", label: "Profile & security" },
  { key: "notifications", label: "Notifications" },
] as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/account");
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "notifications" ? "notifications" : "profile";

  const nav = (
    <nav aria-label="Account sections" className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "profile" ? "/account" : `/account?tab=${t.key}`}
          aria-current={tab === t.key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === t.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "notifications") {
    const settings = await loadNotificationSettings(session.user.id);
    return (
      <>
        <PageHeader title="Account" description="Choose how FairShare tells you about changes." />
        {nav}
        <NotificationSettings initial={settings} />
      </>
    );
  }

  const [user, prefs, passkeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true, password: true },
    }),
    prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: { currency: true, timezone: true },
    }),
    prisma.authenticator.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/auth/signin");
  return (
    <>
      <PageHeader title="Account" description="Your profile, preferences and sign-in methods." />
      {nav}
      <AccountSettings
        profile={{ name: user.name ?? "", email: user.email, memberSince: user.createdAt.toISOString() }}
        hasPassword={!!user.password}
        passkeyCount={passkeys}
        preferences={prefs ? { currency: prefs.currency, timezone: prefs.timezone } : null}
      />
    </>
  );
}
