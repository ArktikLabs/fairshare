import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateExpenseSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  category: z.enum([
    "FOOD_DRINK",
    "TRANSPORTATION", 
    "ACCOMMODATION",
    "ENTERTAINMENT",
    "SHOPPING",
    "UTILITIES",
    "HEALTHCARE",
    "EDUCATION",
    "TRAVEL",
    "OTHER"
  ]).optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
});

// Helper function to validate group access
async function validateGroupAccess(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      isActive: true,
    },
  });

  if (!member) {
    throw new Error("Access denied: Not a member of this group");
  }

  return member;
}

// GET /api/expenses/[id] - Get expense details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    const expense = await prisma.expense.findUnique({
      where: {
        id: expenseId,
        isDeleted: false,
      },
      include: {
        group: {
          select: { id: true, name: true, currency: true },
        },
        payers: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        items: {
          include: {
            splits: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Validate group access
    if (expense.groupId) {
      await validateGroupAccess(session.user.id, expense.groupId);
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/expenses/[id] - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    // Check if expense exists and user has access
    const expense = await prisma.expense.findUnique({
      where: {
        id: expenseId,
        isDeleted: false,
      },
      include: {
        group: true,
        payers: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Validate group access
    if (expense.groupId) {
      await validateGroupAccess(session.user.id, expense.groupId);
    }

    // Check if user is a payer (only payers can edit)
    const isPayer = expense.payers.some(payer => payer.userId === session.user.id);
    if (!isPayer) {
      return NextResponse.json(
        { error: "Access denied: Only expense payers can edit" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateExpenseSchema.parse(body);

    // If amount is being changed, we need to recalculate splits
    if (validatedData.amount && validatedData.amount !== expense.amount.toNumber()) {
      return NextResponse.json(
        { 
          error: "Amount changes require expense recreation",
          message: "Please delete and create a new expense to change the amount"
        },
        { status: 400 }
      );
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: validatedData.description,
        category: validatedData.category,
        notes: validatedData.notes,
        date: validatedData.date ? new Date(validatedData.date) : undefined,
      },
      include: {
        group: {
          select: { id: true, name: true, currency: true },
        },
        payers: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error("Error updating expense:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    // Check if expense exists and user has access
    const expense = await prisma.expense.findUnique({
      where: {
        id: expenseId,
        isDeleted: false,
      },
      include: {
        payers: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Validate group access
    if (expense.groupId) {
      await validateGroupAccess(session.user.id, expense.groupId);
    }

    // Check if user is a payer (only payers can delete)
    const isPayer = expense.payers.some(payer => payer.userId === session.user.id);
    if (!isPayer) {
      return NextResponse.json(
        { error: "Access denied: Only expense payers can delete" },
        { status: 403 }
      );
    }

    // Soft delete the expense
    await prisma.expense.update({
      where: { id: expenseId },
      data: { 
        isDeleted: true,
      },
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
