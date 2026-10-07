import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HttpError, errorJson, loadExpenseFor } from "@/lib/expense-write";
import { deleteReceiptFiles, readReceipt, saveReceipt } from "@/lib/receipts";
import { recordActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: unknown) => {
  const { body, status } = errorJson(error);
  return NextResponse.json(body, { status });
};

// GET /api/expenses/[id]/receipt[?size=thumb] - The receipt image, members only.
// Never cached publicly: the URL is stable but access is checked every time.
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { expense, canManage } = await loadExpenseFor(id, session.user.id, { includeDeleted: true });
    if (expense.isDeleted && !canManage) throw new HttpError(404, "Expense not found");
    if (!expense.receiptKey) throw new HttpError(404, "No receipt");
    const thumb = new URL(request.url).searchParams.get("size") === "thumb";
    const file = await readReceipt(expense.receiptKey, thumb ? "thumb" : "full");
    if (!file) throw new HttpError(404, "Receipt file missing");
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(file.length),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="receipt-${id}.jpg"`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

async function requireManage(id: string, userId: string) {
  const ctx = await loadExpenseFor(id, userId);
  if (ctx.archived) throw new HttpError(409, "This group is archived. Unarchive it in group settings to make changes.");
  if (!ctx.canManage) {
    throw new HttpError(403, "Only the person who added the expense, a payer or a group admin can change the receipt");
  }
  return ctx;
}

// POST /api/expenses/[id]/receipt - multipart/form-data with `file` (JPEG/PNG/WebP, max 8 MB).
// Replaces any existing receipt.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense } = await requireManage(id, userId);

    const len = Number(request.headers.get("content-length") || 0);
    if (len > 9 * 1024 * 1024) throw new HttpError(413, "Receipts can be up to 8 MB");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") throw new HttpError(400, "Attach an image as `file`");
    const key = await saveReceipt(Buffer.from(await file.arrayBuffer()));

    const had = Boolean(expense.receiptKey);
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({ where: { id }, data: { receiptKey: key, updatedById: userId } });
      await recordActivity(
        {
          type: "EXPENSE_UPDATED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: id,
          payload: {
            description: expense.description,
            amount: Math.round(Number(expense.amount) * 100),
            changes: [{ field: "receipt", to: true }],
          },
        },
        tx
      );
    });
    if (had) await deleteReceiptFiles(expense.receiptKey);
    return NextResponse.json({ receiptUrl: `/api/expenses/${id}/receipt`, replaced: had }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

// DELETE /api/expenses/[id]/receipt
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense } = await requireManage(id, userId);
    if (!expense.receiptKey) throw new HttpError(404, "No receipt");
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({ where: { id }, data: { receiptKey: null, updatedById: userId } });
      await recordActivity(
        {
          type: "EXPENSE_UPDATED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: id,
          payload: {
            description: expense.description,
            amount: Math.round(Number(expense.amount) * 100),
            changes: [{ field: "receipt", to: false }],
          },
        },
        tx
      );
    });
    await deleteReceiptFiles(expense.receiptKey);
    return NextResponse.json({ message: "Receipt removed" });
  } catch (error) {
    return fail(error);
  }
}
