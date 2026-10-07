import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSupportedCurrency } from "@/lib/currencies";
import { loadGroupSettlements } from "@/lib/group-ledger";
import { HttpError, errorJson } from "@/lib/expense-write";
import { currencyChangeBlocker, deleteGroupBlocker, isAdminRole, isGroupOwner } from "@/lib/permissions";
import { recordActivity } from "@/lib/activity";
import type { SettingChange } from "@/lib/activity-format";
import { toCents } from "@/lib/money";

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: unknown) => {
  const { body, status } = errorJson(error);
  return NextResponse.json(body, { status });
};

async function membership(groupId: string, userId: string) {
  const m = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: "ACTIVE", group: { isActive: true } },
    include: { group: true },
  });
  if (!m) throw new HttpError(403, "Access denied: Not a member of this group");
  return m;
}

// GET /api/groups/[id] - Group details for members
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: groupId } = await params;
    await membership(groupId, session.user.id);

    const group = await prisma.group.findUnique({
      where: { id: groupId, isActive: true },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        members: {
          where: { status: { in: ["ACTIVE", "INVITED"] } },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            expenses: { where: { isDeleted: false } },
            members: { where: { status: { in: ["ACTIVE", "INVITED"] } } },
          },
        },
      },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json({ ...group, archived: Boolean(group.archivedAt) });
  } catch (error) {
    return fail(error);
  }
}

const UpdateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  currency: z
    .string()
    .length(3)
    .transform((c) => c.toUpperCase())
    .refine(isSupportedCurrency, "Unknown currency code")
    .optional(),
  simplifyDebts: z.boolean().optional(),
  archived: z.boolean().optional(),
});

// PUT /api/groups/[id] - Group settings (admins). Archived groups only accept unarchive.
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id: groupId } = await params;
    const m = await membership(groupId, userId);
    if (!isAdminRole(m.role)) throw new HttpError(403, "Access denied: Admin privileges required");
    const g = m.group;
    const data = UpdateGroupSchema.parse(await request.json());

    const archivedNow = Boolean(g.archivedAt);
    const editsOther =
      data.name !== undefined || data.description !== undefined || data.currency !== undefined || data.simplifyDebts !== undefined;
    if (archivedNow && editsOther && data.archived !== false) {
      throw new HttpError(409, "This group is archived. Unarchive it to change settings.");
    }

    if (data.currency && data.currency !== g.currency) {
      const [expenses, payments] = await Promise.all([
        prisma.expense.count({ where: { groupId, isDeleted: false } }),
        prisma.settlement.count({ where: { groupId, status: "CONFIRMED" } }),
      ]);
      const blocker = currencyChangeBlocker(expenses, payments);
      if (blocker) throw new HttpError(409, blocker);
    }

    const settings: SettingChange[] = [];
    if (data.currency && data.currency !== g.currency) settings.push({ field: "currency", from: g.currency, to: data.currency });
    if (data.simplifyDebts !== undefined && data.simplifyDebts !== g.simplifyDebts) {
      settings.push({ field: "simplifyDebts", to: data.simplifyDebts });
    }
    const newDescription = data.description === undefined ? undefined : data.description?.trim() || null;
    if (newDescription !== undefined && newDescription !== (g.description ?? null)) settings.push({ field: "description" });
    const renamed = data.name !== undefined && data.name !== g.name;
    const archiveChange = data.archived !== undefined && data.archived !== archivedNow;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.group.update({
        where: { id: groupId },
        data: {
          name: data.name,
          description: newDescription,
          currency: data.currency,
          simplifyDebts: data.simplifyDebts,
          archivedAt: archiveChange ? (data.archived ? new Date() : null) : undefined,
        },
      });
      if (renamed) {
        await recordActivity(
          { type: "GROUP_RENAMED", actorId: userId, groupId, payload: { oldName: g.name, newName: data.name } },
          tx
        );
      }
      if (settings.length) {
        await recordActivity({ type: "GROUP_SETTINGS_CHANGED", actorId: userId, groupId, payload: { settings } }, tx);
      }
      if (archiveChange) {
        await recordActivity({ type: data.archived ? "GROUP_ARCHIVED" : "GROUP_UNARCHIVED", actorId: userId, groupId }, tx);
      }
      return u;
    });

    return NextResponse.json({ ...updated, archived: Boolean(updated.archivedAt) });
  } catch (error) {
    return fail(error);
  }
}

// DELETE /api/groups/[id] { confirmName } - Owner only, only when every balance is settled.
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id: groupId } = await params;
    const m = await membership(groupId, userId);
    const g = m.group;

    const ledger = await loadGroupSettlements(groupId);
    const blocker = deleteGroupBlocker({
      isOwner: isGroupOwner({ userId, createdBy: g.createdBy, role: m.role }),
      unsettledCents: (ledger?.balances ?? []).map((b) => toCents(b.netBalance)),
    });
    if (blocker) throw new HttpError(blocker.startsWith("Only") ? 403 : 409, blocker);

    const body = await request.json().catch(() => ({}));
    if (typeof body?.confirmName !== "string" || body.confirmName.trim() !== g.name.trim()) {
      throw new HttpError(400, "Type the group name exactly to confirm");
    }

    // Soft delete: the group disappears for everyone; rows stay for the record
    await prisma.$transaction(async (tx) => {
      await tx.group.update({ where: { id: groupId }, data: { isActive: false } });
      await tx.groupMember.updateMany({
        where: { groupId, status: { in: ["ACTIVE", "INVITED"] } },
        data: { status: "LEFT", leftAt: new Date(), inviteToken: null },
      });
      await tx.expense.updateMany({ where: { groupId, isDeleted: false }, data: { isDeleted: true, deletedAt: new Date(), deletedById: userId } });
    });

    return NextResponse.json({ message: "Group deleted" });
  } catch (error) {
    return fail(error);
  }
}
