import { redirect } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { ExpenseList } from "@/components/expense-list";

export const metadata = { title: "Expenses · FairShare" };

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/expenses");
  const groups = await prisma.group.findMany({
    where: { isActive: true, kind: "STANDARD", members: { some: { userId: session.user.id, status: "ACTIVE" } } },
    select: { id: true, name: true, currency: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every expense in your groups, with what it means for you."
        actions={
          <>
            <a href="/api/expenses/export.csv" download className={buttonClass("secondary", "md")}>
              <Download /> Export CSV
            </a>
            <ButtonLink href="/expenses/create">
              <Plus /> Add expense
            </ButtonLink>
          </>
        }
      />
      <ExpenseList groups={groups} currentUserId={session.user.id} />
    </>
  );
}
