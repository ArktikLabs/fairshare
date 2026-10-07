import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { directKey } from "@/lib/friends";
import { loadFormGroups } from "@/lib/expense-form-data";
import { PageHeader } from "@/components/ui/primitives";
import { ExpenseForm } from "@/components/expense-form/expense-form";

export const metadata = { title: "Add expense · FairShare" };

export default async function FriendCreateExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/friends/${id}/expenses/create`);
  const group = await prisma.group.findUnique({ where: { directKey: directKey(session.user.id, id) }, select: { id: true } });
  if (!group) notFound();
  const groups = await loadFormGroups(session.user.id, group.id, { direct: true });
  if (groups.length === 0) notFound();
  const friend = groups[0].members.find((m) => m.userId !== session.user!.id);
  const name = friend?.name ?? "friend";
  return (
    <>
      <PageHeader
        back={
          <Link href={`/friends/${id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-4" aria-hidden /> {name}
          </Link>
        }
        title={`Add expense with ${name}`}
      />
      <ExpenseForm
        groups={[{ ...groups[0], name: `You and ${name}` }]}
        initialGroupId={group.id}
        currentUserId={session.user.id}
        allowGroupSwitch={false}
        doneHref={`/friends/${id}`}
      />
    </>
  );
}
