import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { assertPayersMatchTotal, calculateSplit, toCents } from "@/lib/money";
import { createOrGetGhostUser, inviteUserToGroup } from "@/lib/ghost-users";

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

/**
 * Resolve a payer/participant to a userId and make sure they belong to the
 * expense's group. Unknown emails become placeholder (ghost) users invited to
 * the group, so people can be split with before they sign up.
 */
async function resolveUser(
  identifier: { userId?: string; email?: string },
  currentUserId: string,
  groupId?: string
): Promise<string> {
  let userId = identifier.userId;

  if (!userId && identifier.email) {
    const email = identifier.email.trim().toLowerCase();
    if (groupId) {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      const member = existing
        ? await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: existing.id } },
            select: { status: true },
          })
        : null;
      if (member && (member.status === "ACTIVE" || member.status === "INVITED")) {
        return existing!.id;
      }
      const invited = await inviteUserToGroup({ email, groupId, invitedBy: currentUserId });
      return invited.userId;
    }
    const ghost = await createOrGetGhostUser(email, currentUserId);
    userId = ghost.id;
  }

  if (!userId) throw new Error("Either userId or email must be provided");

  if (groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { status: true },
    });
    if (!member || (member.status !== "ACTIVE" && member.status !== "INVITED")) {
      throw new Error("Every payer and participant must be a member of the group");
    }
  } else if (userId !== currentUserId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error(`User with ID ${userId} not found`);
  }

  return userId;
}

async function validateGroupAccess(userId: string, groupId?: string) {
  if (!groupId) return; // Personal expense

  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: "ACTIVE",
      group: { isActive: true },
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
        userId: await resolveUser(payer, session.user.id, validatedData.groupId),
        amountPaid: payer.amountPaid,
        paymentMethod: payer.paymentMethod,
        paymentRef: payer.paymentRef,
      }))
    );

    // Validate payer amounts (to the cent) and that nobody is listed twice
    assertPayersMatchTotal(validatedData.amount, resolvedPayers.map((p) => p.amountPaid));
    if (new Set(resolvedPayers.map((p) => p.userId)).size !== resolvedPayers.length) {
      throw new Error("Each payer can only appear once");
    }
    if (isItemized) {
      const itemized = validatedData as z.infer<typeof ItemizedExpenseSchema>;
      const itemCents = itemized.items.reduce((sum, item) => sum + toCents(item.amount), 0);
      if (itemCents !== toCents(itemized.amount)) {
        throw new Error("Sum of item amounts must equal expense total");
      }
    }

    // Resolve every participant before opening the transaction (resolving can
    // invite placeholder users, which uses the regular client).
    const resolveParticipants = (list: z.infer<typeof ParticipantSchema>[]) =>
      Promise.all(
        list.map(async (participant) => ({
          userId: await resolveUser(participant, session.user.id, validatedData.groupId),
          amount: participant.amount,
          percentage: participant.percentage,
          shares: participant.shares,
        }))
      );
    const resolvedItemParticipants: ParticipantData[][] = isItemized
      ? await Promise.all(
          (validatedData as z.infer<typeof ItemizedExpenseSchema>).items.map((item) =>
            resolveParticipants(item.participants)
          )
        )
      : [];
    const resolvedSimpleParticipants: ParticipantData[] = isItemized
      ? []
      : await resolveParticipants(
          (validatedData as z.infer<typeof SimpleExpenseSchema>).participants
        );

    // Compute all splits up front so validation errors never leave half an expense behind
    const itemSplits = isItemized
      ? (validatedData as z.infer<typeof ItemizedExpenseSchema>).items.map((item, i) =>
          calculateSplit(item.amount, resolvedItemParticipants[i], item.splitMethod)
        )
      : [];
    const simpleSplits = isItemized
      ? []
      : calculateSplit(
          validatedData.amount,
          resolvedSimpleParticipants,
          (validatedData as z.infer<typeof SimpleExpenseSchema>).splitMethod
        );

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
        for (const [itemIndex, item] of itemizedData.items.entries()) {
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

          const calculatedParticipants = itemSplits[itemIndex];

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
        const calculatedParticipants = simpleSplits;

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
      // Group members see every expense of the group, not only their own
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: session.user.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Access denied: Not a member of this group" },
          { status: 403 }
        );
      }
      delete whereClause.OR;
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
          select: { id: true, name: true, currency: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const adminGroups = new Set(
      (
        await prisma.groupMember.findMany({
          where: { userId: session.user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
          select: { groupId: true },
        })
      ).map((m) => m.groupId)
    );

    return NextResponse.json(
      expenses.map((e) => serializeExpense(e, session.user.id, adminGroups))
    );
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type ListedUser = { id: string; name: string | null; email: string };
type ListedExpense = Prisma.ExpenseGetPayload<{
  include: {
    payers: { include: { user: { select: { id: true; name: true; email: true } } } };
    splits: { include: { user: { select: { id: true; name: true; email: true } } } };
    items: {
      include: { splits: { include: { user: { select: { id: true; name: true; email: true } } } } };
    };
    group: { select: { id: true; name: true; currency: true } };
  };
}>;

/**
 * Plain-number view of an expense for the UI. Item splits are folded into
 * `splits` per person, and `my` holds the current user's paid / share / net
 * so pages don't have to repeat the money math.
 */
function serializeExpense(e: ListedExpense, userId: string, adminGroups: Set<string>) {
  const shares = new Map<string, { user: ListedUser; cents: number }>();
  const addShare = (user: ListedUser, amount: Prisma.Decimal) => {
    const cur = shares.get(user.id) ?? { user, cents: 0 };
    cur.cents += toCents(Number(amount));
    shares.set(user.id, cur);
  };
  e.splits.forEach((s) => addShare(s.user, s.amount));
  e.items.forEach((i) => i.splits.forEach((s) => addShare(s.user, s.amount)));

  const paidCents = e.payers
    .filter((p) => p.userId === userId)
    .reduce((sum, p) => sum + toCents(Number(p.amountPaid)), 0);
  const shareCents = shares.get(userId)?.cents ?? 0;
  const isPayer = e.payers.some((p) => p.userId === userId);

  return {
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    category: e.category,
    date: e.date,
    notes: e.notes,
    groupId: e.groupId,
    group: e.group,
    isItemized: e.items.length > 0,
    payers: e.payers.map((p) => ({ userId: p.userId, user: p.user, amount: Number(p.amountPaid) })),
    splits: [...shares.values()].map((s) => ({ userId: s.user.id, user: s.user, amount: s.cents / 100 })),
    items: e.items.map((i) => ({
      id: i.id,
      name: i.name,
      amount: Number(i.amount),
      splits: i.splits.map((s) => ({ userId: s.userId, user: s.user, amount: Number(s.amount) })),
    })),
    my: { paid: paidCents / 100, share: shareCents / 100, net: (paidCents - shareCents) / 100 },
    canEdit: isPayer || (e.groupId ? adminGroups.has(e.groupId) : false),
  };
}
