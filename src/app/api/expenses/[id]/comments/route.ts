import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HttpError, errorJson, loadExpenseFor } from "@/lib/expense-write";
import { recordActivity } from "@/lib/activity";
import { listComments } from "@/lib/comments";

type Ctx = { params: Promise<{ id: string }> };

const CommentSchema = z.object({ body: z.string().trim().min(1, "Write something first").max(2000) });

// GET /api/expenses/[id]/comments - Members of the expense's group only
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await loadExpenseFor(id, session.user.id);
    return NextResponse.json(await listComments(id));
  } catch (error) {
    const { body, status } = errorJson(error);
    return NextResponse.json(body, { status });
  }
}

// POST /api/expenses/[id]/comments { body }
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense, archived } = await loadExpenseFor(id, userId);
    if (archived) throw new HttpError(409, "This group is archived, so comments are closed.");
    const { body } = CommentSchema.parse(await request.json());
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.expenseComment.create({ data: { expenseId: id, authorId: userId, body } });
      await recordActivity(
        {
          type: "COMMENT_ADDED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: id,
          commentId: c.id,
          payload: { description: expense.description, snippet: body.length > 80 ? body.slice(0, 77) + "..." : body },
        },
        tx
      );
      return c;
    });
    return NextResponse.json({ id: comment.id, body: comment.body, createdAt: comment.createdAt }, { status: 201 });
  } catch (error) {
    const { body, status } = errorJson(error);
    return NextResponse.json(body, { status });
  }
}
