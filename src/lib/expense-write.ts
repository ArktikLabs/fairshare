// Server-side helpers shared by expense create and edit: request schemas,
// resolving people to group members, writing the payer / split / item rows,
// and the access check for one expense.

import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createOrGetGhostUser, inviteUserToGroup } from "./ghost-users";
import { CATEGORY_VALUES } from "./categories";
import type { ComputedRows, ResolvedExpenseInput } from "./expense-compute";
import { canManageExpense, type Role } from "./permissions";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const PayerSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    amountPaid: z.number().positive(),
    paymentMethod: z.string().optional(),
    paymentRef: z.string().optional(),
  })
  .refine((data) => data.userId || data.email, { message: "Either userId or email must be provided" });

const ParticipantSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    amount: z.number().nonnegative().optional(),
    percentage: z.number().min(0).max(100).optional(),
    shares: z.number().positive().int().optional(),
  })
  .refine((data) => data.userId || data.email, { message: "Either userId or email must be provided" });

const SPLIT = z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]);

const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  amount: z.number().positive(),
  quantity: z.number().positive().int().default(1),
  unitPrice: z.number().positive().optional(),
  category: z.string().optional(),
  isShared: z.boolean(),
  splitMethod: SPLIT,
  participants: z.array(ParticipantSchema).min(1),
});

const Base = {
  amount: z.number().positive(),
  description: z.string().trim().min(1).max(255),
  date: z.string().optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  groupId: z.string().optional(),
  payers: z.array(PayerSchema).min(1),
  notes: z.string().max(1000).optional().nullable(),
};

export const SimpleExpenseSchema = z.object({
  ...Base,
  splitMethod: SPLIT,
  participants: z.array(ParticipantSchema).min(1),
});

export const ItemizedExpenseSchema = z.object({
  ...Base,
  items: z.array(ItemSchema).min(1),
});

export type ExpenseBody = z.infer<typeof SimpleExpenseSchema> | z.infer<typeof ItemizedExpenseSchema>;

export function parseExpenseBody(body: unknown): { data: ExpenseBody; itemized: boolean } {
  const itemized = typeof body === "object" && body !== null && "items" in body;
  return { data: itemized ? ItemizedExpenseSchema.parse(body) : SimpleExpenseSchema.parse(body), itemized };
}

/** Expense dates are stored as UTC midnight of the chosen calendar day. */
export function parseExpenseDate(date: string | undefined): Date {
  if (!date) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(`${date}T00:00:00.000Z`);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

/**
 * Resolve a payer/participant to a userId and make sure they belong to the
 * expense's group. Unknown emails become placeholder (ghost) users invited to
 * the group. `alreadyOn` are people on the expense before an edit: they stay
 * allowed even if they have since left the group.
 */
export async function resolveUser(
  identifier: { userId?: string; email?: string },
  currentUserId: string,
  groupId: string | null | undefined,
  alreadyOn: Set<string> = new Set()
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
      if (existing && member && (member.status === "ACTIVE" || member.status === "INVITED")) return existing.id;
      const invited = await inviteUserToGroup({ email, groupId, invitedBy: currentUserId });
      return invited.userId;
    }
    const ghost = await createOrGetGhostUser(email, currentUserId);
    userId = ghost.id;
  }

  if (!userId) throw new HttpError(400, "Either userId or email must be provided");
  if (alreadyOn.has(userId)) return userId;

  if (groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { status: true },
    });
    if (!member || (member.status !== "ACTIVE" && member.status !== "INVITED")) {
      throw new HttpError(400, "Every payer and participant must be a member of the group");
    }
  } else if (userId !== currentUserId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new HttpError(400, `User with ID ${userId} not found`);
  }
  return userId;
}

/** Resolve every person in a validated body into the pure compute input. */
export async function resolveExpenseInput(
  data: ExpenseBody,
  itemized: boolean,
  currentUserId: string,
  groupId: string | null | undefined,
  alreadyOn: Set<string> = new Set()
): Promise<ResolvedExpenseInput> {
  const r = (x: { userId?: string; email?: string }) => resolveUser(x, currentUserId, groupId, alreadyOn);
  const payers = await Promise.all(
    data.payers.map(async (p) => ({
      userId: await r(p),
      amountPaid: p.amountPaid,
      paymentMethod: p.paymentMethod,
      paymentRef: p.paymentRef,
    }))
  );
  const people = (list: z.infer<typeof ParticipantSchema>[]) =>
    Promise.all(
      list.map(async (p) => ({ userId: await r(p), amount: p.amount, percentage: p.percentage, shares: p.shares }))
    );
  if (itemized) {
    const d = data as z.infer<typeof ItemizedExpenseSchema>;
    return {
      amount: d.amount,
      payers,
      items: await Promise.all(
        d.items.map(async (it) => ({
          name: it.name,
          description: it.description,
          amount: it.amount,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          category: it.category,
          isShared: it.isShared,
          splitMethod: it.splitMethod,
          participants: await people(it.participants),
        }))
      ),
    };
  }
  const d = data as z.infer<typeof SimpleExpenseSchema>;
  return { amount: d.amount, payers, splitMethod: d.splitMethod, participants: await people(d.participants) };
}

/** Write payers, splits and items for an expense (after old rows are cleared on edit). */
export async function writeExpenseRows(tx: Prisma.TransactionClient, expenseId: string, rows: ComputedRows) {
  await tx.expensePayer.createMany({
    data: rows.payers.map((p) => ({
      expenseId,
      userId: p.userId,
      amountPaid: new Decimal(p.amountPaid),
      paymentMethod: p.paymentMethod,
      paymentRef: p.paymentRef,
    })),
  });
  if (rows.splits.length) {
    await tx.expenseSplit.createMany({
      data: rows.splits.map((s) => ({
        expenseId,
        userId: s.userId,
        amount: new Decimal(s.amount),
        percentage: s.percentage ? new Decimal(s.percentage) : null,
        shares: s.shares,
      })),
    });
  }
  for (const item of rows.items) {
    const created = await tx.expenseItem.create({
      data: {
        expenseId,
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
    await tx.expenseItemSplit.createMany({
      data: item.splits.map((s) => ({
        itemId: created.id,
        userId: s.userId,
        amount: new Decimal(s.amount),
        percentage: s.percentage ? new Decimal(s.percentage) : null,
        shares: s.shares,
      })),
    });
  }
}

/** Remove payers, splits and items so an edit can write fresh ones. */
export async function clearExpenseRows(tx: Prisma.TransactionClient, expenseId: string) {
  // Old settle-up rows may point at a split; keep the payment, drop the link
  await tx.settlement.updateMany({ where: { split: { expenseId } }, data: { splitId: null } });
  await tx.expensePayer.deleteMany({ where: { expenseId } });
  await tx.expenseSplit.deleteMany({ where: { expenseId } });
  await tx.expenseItem.deleteMany({ where: { expenseId } }); // item splits cascade
}

export const expenseFullInclude = {
  payers: true,
  splits: true,
  items: { include: { splits: true } },
  group: { select: { id: true, name: true, currency: true, archivedAt: true, isActive: true, kind: true } },
} satisfies Prisma.ExpenseInclude;

export type FullExpense = Prisma.ExpenseGetPayload<{ include: typeof expenseFullInclude }>;

/**
 * Load an expense the user may see. Group expenses need active membership
 * (archived groups are readable); personal ones need the user on them.
 * Deleted expenses are included only with `includeDeleted`.
 */
export async function loadExpenseFor(
  expenseId: string,
  userId: string,
  opts: { includeDeleted?: boolean } = {}
): Promise<{ expense: FullExpense; role: Role | null; archived: boolean; canManage: boolean }> {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId }, include: expenseFullInclude });
  if (!expense || (expense.isDeleted && !opts.includeDeleted)) throw new HttpError(404, "Expense not found");
  let role: Role | null = null;
  if (expense.groupId) {
    if (!expense.group?.isActive) throw new HttpError(404, "Expense not found");
    const m = await prisma.groupMember.findFirst({
      where: { groupId: expense.groupId, userId, status: "ACTIVE" },
      select: { role: true },
    });
    if (!m) throw new HttpError(403, "Access denied: Not a member of this group");
    role = m.role;
  } else {
    const involved =
      expense.createdById === userId ||
      expense.payers.some((p) => p.userId === userId) ||
      expense.splits.some((s) => s.userId === userId) ||
      expense.items.some((i) => i.splits.some((s) => s.userId === userId));
    if (!involved) throw new HttpError(404, "Expense not found");
  }
  const archived = Boolean(expense.group?.archivedAt);
  const canManage = canManageExpense({
    userId,
    createdById: expense.createdById,
    payerIds: expense.payers.map((p) => p.userId),
    role,
    archived,
  });
  return { expense, role, archived, canManage };
}

/** Members may write to a group only while it is active and not archived. */
export async function requireWritableMembership(groupId: string, userId: string) {
  const m = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: "ACTIVE", group: { isActive: true } },
    select: { role: true, group: { select: { archivedAt: true } } },
  });
  if (!m) throw new HttpError(403, "Access denied: Not a member of this group");
  if (m.group.archivedAt) throw new HttpError(409, "This group is archived. Unarchive it in group settings to make changes.");
  return m;
}

export function errorJson(error: unknown) {
  if (error instanceof HttpError) return { body: { error: error.message }, status: error.status };
  if (error instanceof z.ZodError) return { body: { error: "Validation error", details: error.issues }, status: 400 };
  if (error instanceof Error && !(error as { code?: string }).code) return { body: { error: error.message }, status: 400 };
  console.error(error);
  return { body: { error: "Internal server error" }, status: 500 };
}
