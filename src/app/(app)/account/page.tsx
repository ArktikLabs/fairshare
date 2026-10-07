import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/primitives";
import { AccountSettings } from "@/components/account/account-settings";

export const metadata = { title: "Account · FairShare" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/account");
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
      <AccountSettings
        profile={{ name: user.name ?? "", email: user.email, memberSince: user.createdAt.toISOString() }}
        hasPassword={!!user.password}
        passkeyCount={passkeys}
        preferences={prefs ? { currency: prefs.currency, timezone: prefs.timezone } : null}
      />
    </>
  );
}
