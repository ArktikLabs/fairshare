import { prisma } from "./prisma";
import type { FormGroup } from "@/components/expense-form/expense-form";

/**
 * Groups the user can add expenses to, with everyone who can be on an
 * expense (active members and pending invitees), me first.
 */
export async function loadFormGroups(userId: string, onlyGroupId?: string): Promise<FormGroup[]> {
  const groups = await prisma.group.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      ...(onlyGroupId ? { id: onlyGroupId } : {}),
      members: { some: { userId, status: "ACTIVE" } },
    },
    select: {
      id: true,
      name: true,
      currency: true,
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        select: {
          status: true,
          user: { select: { id: true, name: true, email: true, displayName: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    currency: g.currency,
    members: g.members
      .map((m) => ({
        userId: m.user.id,
        name: m.user.name || m.user.displayName || m.user.email,
        email: m.user.email,
        status: m.status as "ACTIVE" | "INVITED",
      }))
      .sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0)),
  }));
}
