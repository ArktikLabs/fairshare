import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { loadFormGroups } from "@/lib/expense-form-data";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { PickGroupExpenseForm } from "@/components/expense-form/pick-group";

export const metadata = { title: "Add expense · FairShare" };

export default async function CreateExpensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/expenses/create");
  const groups = await loadFormGroups(session.user.id);
  return (
    <>
      <PageHeader title="Add expense" />
      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users />}
            title="Create a group first"
            description="Expenses live in a group, so FairShare knows who to split with and can keep the balance."
            action={<ButtonLink href="/groups/create">Create a group</ButtonLink>}
          />
        </Card>
      ) : (
        <PickGroupExpenseForm groups={groups} currentUserId={session.user.id} />
      )}
    </>
  );
}
