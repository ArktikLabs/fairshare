import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { loadFormGroups } from "@/lib/expense-form-data";
import { loadExpenseDetail } from "@/lib/expense-detail";
import { Alert, PageHeader } from "@/components/ui/primitives";
import { ExpenseForm } from "@/components/expense-form/expense-form";

export const metadata = { title: "Edit expense · FairShare" };
export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/expenses/${id}/edit`);
  const userId = session.user.id;
  const d = await loadExpenseDetail(id, userId);
  if (!d || !d.group) notFound();
  const back = (
    <Link href={`/expenses/${id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
      <ChevronLeft className="size-4" aria-hidden /> {d.description}
    </Link>
  );
  if (!d.canManage || d.deleted || d.archived) {
    return (
      <>
        <PageHeader back={back} title="Edit expense" />
        <Alert tone="warning">
          {d.deleted
            ? "This expense is deleted. Restore it before editing."
            : d.archived
              ? "This group is archived, so its expenses are read-only."
              : "Only the person who added this expense, someone who paid for it, or a group admin can edit it."}
        </Alert>
      </>
    );
  }
  const groups = await loadFormGroups(userId, d.group.id);
  if (groups.length === 0) notFound();
  const known = new Set(groups[0].members.map((m) => m.userId));
  const extraPeople = [...d.payers.map((p) => p.person), ...d.shares.map((s) => s.person), ...d.items.flatMap((i) => i.splits.map((s) => s.person))]
    .filter((p, i, all) => !known.has(p.id) && all.findIndex((x) => x.id === p.id) === i)
    .map((p) => ({ userId: p.id, name: p.name, email: p.email, status: "ACTIVE" as const }));

  return (
    <>
      <PageHeader back={back} title="Edit expense" description={`${d.group.name} · changes are recorded in the expense history`} />
      <ExpenseForm
        groups={groups}
        initialGroupId={d.group.id}
        currentUserId={userId}
        allowGroupSwitch={false}
        editing={{ id: d.id, hasReceipt: d.hasReceipt, extraPeople, ...d.stored }}
      />
    </>
  );
}
