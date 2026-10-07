import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HttpError, errorJson, loadExpenseFor } from "@/lib/expense-write";

// DELETE /api/expenses/[id]/comments/[commentId] - Authors delete their own comments
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, commentId } = await params;
    await loadExpenseFor(id, session.user.id);
    const comment = await prisma.expenseComment.findFirst({ where: { id: commentId, expenseId: id } });
    if (!comment) throw new HttpError(404, "Comment not found");
    if (comment.authorId !== session.user.id) throw new HttpError(403, "You can only delete your own comments");
    await prisma.expenseComment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    const { body, status } = errorJson(error);
    return NextResponse.json(body, { status });
  }
}
