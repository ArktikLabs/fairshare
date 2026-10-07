import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { ExpenseList } from "@/components/expense-list";

export default async function GroupExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/groups/${id}/expenses`);
  const group = await prisma.group.findFirst({
    where: { id, isActive: true, members: { some: { userId: session.user.id, status: "ACTIVE" } } },
    select: { id: true, name: true, currency: true },
  });
  if (!group) notFound();
  return (
    <>
      <PageHeader
        back={
          <Link href={`/groups/${group.id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-4" aria-hidden /> {group.name}
          </Link>
        }
        title="Expenses"
        description={`All expenses in ${group.name}`}
        actions={
          <ButtonLink href={`/groups/${group.id}/expenses/create`}>
            <Plus /> Add expense
          </ButtonLink>
        }
      />
      <ExpenseList groups={[group]} fixedGroupId={group.id} currentUserId={session.user.id} />
    </>
  );
}
