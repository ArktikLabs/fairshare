import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { loadFormGroups } from "@/lib/expense-form-data";
import { PageHeader } from "@/components/ui/primitives";
import { ExpenseForm } from "@/components/expense-form/expense-form";

export const metadata = { title: "Add expense · FairShare" };

export default async function GroupCreateExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/groups/${id}/expenses/create`);
  const groups = await loadFormGroups(session.user.id, id);
  if (groups.length === 0) notFound();
  return (
    <>
      <PageHeader
        back={
          <Link href={`/groups/${id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-4" aria-hidden /> {groups[0].name}
          </Link>
        }
        title="Add expense"
      />
      <ExpenseForm groups={groups} initialGroupId={id} currentUserId={session.user.id} allowGroupSwitch={false} />
    </>
  );
}
