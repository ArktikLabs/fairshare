import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

// Validation schemas based on RFC
const PayerSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    amountPaid: z.number().positive(),
    paymentMethod: z.string().optional(),
    paymentRef: z.string().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email must be provided",
  });

const ParticipantSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    amount: z.number().nonnegative().optional(),
    percentage: z.number().min(0).max(100).optional(),
    shares: z.number().positive().int().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email must be provided",
  });

const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  quantity: z.number().positive().int().default(1),
  unitPrice: z.number().positive().optional(),
  category: z.string().optional(),
  isShared: z.boolean(),
  splitMethod: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
  participants: z.array(ParticipantSchema).min(1),
});

const SimpleExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  category: z
    .enum([
      "FOOD_DRINK",
      "TRANSPORTATION",
      "ACCOMMODATION",
      "ENTERTAINMENT",
      "SHOPPING",
      "UTILITIES",
      "HEALTHCARE",
      "EDUCATION",
      "TRAVEL",
      "OTHER",
    ])
    .optional(),
  groupId: z.string().optional(),
  splitMethod: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
  payers: z.array(PayerSchema).min(1),
  participants: z.array(ParticipantSchema).min(1),
  notes: z.string().optional(),
});

const ItemizedExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  category: z
    .enum([
      "FOOD_DRINK",
      "TRANSPORTATION",
      "ACCOMMODATION",
      "ENTERTAINMENT",
      "SHOPPING",
      "UTILITIES",
      "HEALTHCARE",
      "EDUCATION",
      "TRAVEL",
      "OTHER",
    ])
    .optional(),
  groupId: z.string().optional(),
  payers: z.array(PayerSchema).min(1),
  items: z.array(ItemSchema).min(1),
  notes: z.string().optional(),
});

// Type definitions for business logic
interface PayerData {
  userId: string;
  amountPaid: number;
  paymentMethod?: string;
  paymentRef?: string;
}

interface ParticipantData {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CalculatedParticipant extends ParticipantData {
  amount: number;
}

// Helper function to resolve user by email or userId
async function resolveUser(
  identifier: { userId?: string; email?: string },
  groupId?: string
): Promise<string> {
  if (identifier.userId) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: identifier.userId },
      select: { id: true },
    });
    if (!user) {
      throw new Error(`User with ID ${identifier.userId} not found`);
    }
    return identifier.userId;
  }

  if (identifier.email) {
    // Try to find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: identifier.email },
      select: { id: true },
    });

    if (!user) {
      // Create placeholder user for invited email
      user = await prisma.user.create({
        data: {
          email: identifier.email,
          name: identifier.email, // Use full email as name for clarity
          // Note: This user won't be able to login until they complete registration
        },
        select: { id: true },
      });

      // If this is for a group expense, add the user to the group
      if (groupId) {
        // Check if user is already a member or has an active invitation
        const existingMember = await prisma.groupMember.findFirst({
          where: {
            groupId,
            user: {
              email: identifier.email,
            },
            status: { in: ["INVITED", "ACTIVE"] },
          },
          include: {
            user: true,
          },
        });

        // Add user to group if not already a member
        if (!existingMember) {
          await prisma.groupMember.create({
            data: {
              groupId,
              userId: user.id,
              role: "MEMBER",
              status: "ACTIVE", // Auto-accept for expense-based additions
            },
          });
        }
      }
    }

    return user.id;
  }

  throw new Error("Either userId or email must be provided");
}

// Business logic functions
function validatePayerAmounts(amount: number, payers: PayerData[]) {
  const totalPaid = payers.reduce((sum, payer) => sum + payer.amountPaid, 0);
  if (Math.abs(totalPaid - amount) > 0.01) {
    throw new Error("Sum of payer amounts must equal expense total");
  }
}

function validateSplitAmounts(
  amount: number,
  participants: ParticipantData[],
  splitMethod: string
) {
  if (splitMethod === "EXACT") {
    const totalSplit = participants.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    if (Math.abs(totalSplit - amount) > 0.01) {
      throw new Error(
        "Sum of split amounts must equal expense total for EXACT splits"
      );
    }
  } else if (splitMethod === "PERCENTAGE") {
    const totalPercentage = participants.reduce(
      (sum, p) => sum + (p.percentage || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error("Sum of percentages must equal 100%");
    }
  }
}

function calculateSplitAmounts(
  amount: number,
  participants: ParticipantData[],
  splitMethod: string
): CalculatedParticipant[] {
  switch (splitMethod) {
    case "EQUAL":
      const equalAmount = amount / participants.length;
      return participants.map((p) => ({ ...p, amount: equalAmount }));

    case "EXACT":
      return participants.map((p) => ({ ...p, amount: p.amount || 0 }));

    case "PERCENTAGE":
      return participants.map((p) => ({
        ...p,
        amount: (amount * (p.percentage || 0)) / 100,
      }));

    case "SHARES":
      const totalShares = participants.reduce(
        (sum, p) => sum + (p.shares || 1),
        0
      );
      return participants.map((p) => ({
        ...p,
        amount: (amount * (p.shares || 1)) / totalShares,
      }));

    default:
      throw new Error("Invalid split method");
  }
}

async function validateGroupAccess(userId: string, groupId?: string) {
  if (!groupId) return; // Personal expense

  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: "ACTIVE",
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this group");
  }
}

// POST /api/expenses - Create expense (simple or itemized)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Determine if this is a simple or itemized expense
    const isItemized = "items" in body;

    let validatedData:
      | z.infer<typeof SimpleExpenseSchema>
      | z.infer<typeof ItemizedExpenseSchema>;
    if (isItemized) {
      validatedData = ItemizedExpenseSchema.parse(body);
    } else {
      validatedData = SimpleExpenseSchema.parse(body);
    }

    // Validate group access
    if (validatedData.groupId) {
      await validateGroupAccess(session.user.id, validatedData.groupId);
    }

    // Resolve all users (convert emails to userIds, create placeholder users if needed)
    const resolvedPayers: PayerData[] = await Promise.all(
      validatedData.payers.map(async (payer) => ({
        userId: await resolveUser(payer, validatedData.groupId),
        amountPaid: payer.amountPaid,
        paymentMethod: payer.paymentMethod,
        paymentRef: payer.paymentRef,
      }))
    );

    // Validate payer amounts
    validatePayerAmounts(validatedData.amount, resolvedPayers);

    // Create expense in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expense.create({
        data: {
          amount: new Decimal(validatedData.amount),
          description: validatedData.description,
          date: validatedData.date ? new Date(validatedData.date) : new Date(),
          category: validatedData.category,
          groupId: validatedData.groupId,
          splitMethod: isItemized
            ? "EQUAL"
            : (validatedData as z.infer<typeof SimpleExpenseSchema>)
                .splitMethod,
          notes: validatedData.notes,
        },
      });

      // Create expense payers
      for (const payer of resolvedPayers) {
        await tx.expensePayer.create({
          data: {
            expenseId: expense.id,
            userId: payer.userId,
            amountPaid: new Decimal(payer.amountPaid),
            paymentMethod: payer.paymentMethod,
            paymentRef: payer.paymentRef,
          },
        });
      }

      if (isItemized) {
        const itemizedData = validatedData as z.infer<
          typeof ItemizedExpenseSchema
        >;
        // Create expense items and item splits
        for (const item of itemizedData.items) {
          const expenseItem = await tx.expenseItem.create({
            data: {
              expenseId: expense.id,
              name: item.name,
              description: item.description,
              amount: new Decimal(item.amount),
              quantity: item.quantity,
              unitPrice: item.unitPrice ? new Decimal(item.unitPrice) : null,
              category: item.category,
              isShared: item.isShared,
              splitMethod: item.splitMethod,
            },
          });

          // Resolve participants for this item
          const resolvedParticipants: ParticipantData[] = await Promise.all(
            item.participants.map(async (participant) => ({
              userId: await resolveUser(participant, validatedData.groupId),
              amount: participant.amount,
              percentage: participant.percentage,
              shares: participant.shares,
            }))
          );

          // Calculate split amounts for this item
          const calculatedParticipants = calculateSplitAmounts(
            item.amount,
            resolvedParticipants,
            item.splitMethod
          );

          // Create item splits
          for (const participant of calculatedParticipants) {
            await tx.expenseItemSplit.create({
              data: {
                itemId: expenseItem.id,
                userId: participant.userId,
                amount: new Decimal(participant.amount),
                percentage: participant.percentage
                  ? new Decimal(participant.percentage)
                  : null,
                shares: participant.shares,
              },
            });
          }
        }
      } else {
        const simpleData = validatedData as z.infer<typeof SimpleExpenseSchema>;

        // Resolve participants for simple expense
        const resolvedParticipants: ParticipantData[] = await Promise.all(
          simpleData.participants.map(async (participant) => ({
            userId: await resolveUser(participant, validatedData.groupId),
            amount: participant.amount,
            percentage: participant.percentage,
            shares: participant.shares,
          }))
        );

        // Create simple expense splits
        validateSplitAmounts(
          simpleData.amount,
          resolvedParticipants,
          simpleData.splitMethod
        );

        const calculatedParticipants = calculateSplitAmounts(
          simpleData.amount,
          resolvedParticipants,
          simpleData.splitMethod
        );

        for (const participant of calculatedParticipants) {
          await tx.expenseSplit.create({
            data: {
              expenseId: expense.id,
              userId: participant.userId,
              amount: new Decimal(participant.amount),
              percentage: participant.percentage
                ? new Decimal(participant.percentage)
                : null,
              shares: participant.shares,
            },
          });
        }
      }

      return expense;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);

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

// GET /api/expenses - Get expenses with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId");
    const category = url.searchParams.get("category");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Build where clause based on user access
    const whereClause: Prisma.ExpenseWhereInput = {
      isDeleted: false,
      OR: [
        // User is a payer
        {
          payers: {
            some: {
              userId: session.user.id,
            },
          },
        },
        // User is in expense splits
        {
          splits: {
            some: {
              userId: session.user.id,
            },
          },
        },
        // User is in item splits
        {
          items: {
            some: {
              splits: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          },
        },
      ],
    };

    // Add filters
    if (groupId) {
      whereClause.groupId = groupId;
    }
    
    if (category) {
      whereClause.category = category as "FOOD_DRINK" | "TRANSPORTATION" | "ACCOMMODATION" | "ENTERTAINMENT" | "SHOPPING" | "UTILITIES" | "HEALTHCARE" | "EDUCATION" | "TRAVEL" | "OTHER";
    }
    
    if (from || to) {
      whereClause.date = {};
      if (from) whereClause.date.gte = new Date(from);
      if (to) whereClause.date.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
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
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        group: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
