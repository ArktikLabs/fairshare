import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveCurrency } from "@/lib/currencies";
import { PageHeader } from "@/components/ui/primitives";
import { CreateGroupForm } from "@/components/create-group-form";

export const metadata = { title: "New group · FairShare" };

export default async function CreateGroupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/groups/create");
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { currency: true },
  });
  return (
    <>
      <PageHeader
        back={
          <Link href="/groups" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-4" aria-hidden /> Groups
          </Link>
        }
        title="New group"
        description="You can invite people right after creating it."
      />
      <CreateGroupForm defaultCurrency={resolveCurrency(prefs?.currency)} />
    </>
  );
}
