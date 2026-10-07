import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expenseImpact, summarizeExpense } from "@/lib/expense-compute";
import { HttpError, errorJson, loadExpenseFor } from "@/lib/expense-write";
import { RESTORE_WINDOW_DAYS, withinRestoreWindow } from "@/lib/permissions";
import { recordActivity } from "@/lib/activity";

// POST /api/expenses/[id]/restore - Undo a delete (creator, payer or admin)
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense, canManage, archived } = await loadExpenseFor(id, userId, { includeDeleted: true });
    if (!expense.isDeleted) throw new HttpError(400, "This expense is not deleted");
    if (archived) throw new HttpError(409, "This group is archived. Unarchive it in group settings to make changes.");
    if (!canManage) throw new HttpError(403, "Only the person who added the expense, a payer or a group admin can restore it");
    if (!withinRestoreWindow(expense.deletedAt)) {
      throw new HttpError(410, `Deleted expenses can be restored for ${RESTORE_WINDOW_DAYS} days`);
    }
    const summary = summarizeExpense(expense);
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null, deletedById: null, updatedById: userId },
      });
      await recordActivity(
        {
          type: "EXPENSE_RESTORED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: id,
          payload: { description: summary.description, amount: summary.amount, impact: expenseImpact(summary) },
        },
        tx
      );
    });
    return NextResponse.json({ message: "Expense restored" });
  } catch (error) {
    const { body, status } = errorJson(error);
    return NextResponse.json(body, { status });
  }
}
