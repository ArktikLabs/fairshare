import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadGroupSettlements } from "@/lib/group-ledger";
import { appUrl } from "@/lib/mailer";
import { toCents } from "@/lib/money";
import { currencyChangeBlocker, deleteGroupBlocker, isGroupOwner, leaveGroupBlocker } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/primitives";
import { GroupSettingsForm } from "@/components/group/group-settings";
import { MembersCard, type MemberRow } from "@/components/group/members-card";

export const metadata = { title: "Group settings · FairShare" };
export const dynamic = "force-dynamic";

export default async function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/groups/${id}/settings`);
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: { id, isActive: true, members: { some: { userId, status: "ACTIVE" } } },
    include: {
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        include: { user: { select: { id: true, name: true, email: true, displayName: true } } },
        orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!group) notFound();
  const me = group.members.find((m) => m.userId === userId)!;
  const isAdmin = me.role === "ADMIN" || me.role === "OWNER";
  const archived = Boolean(group.archivedAt);

  const [ledger, expenseCount, paymentCount] = await Promise.all([
    loadGroupSettlements(group.id),
    prisma.expense.count({ where: { groupId: group.id, isDeleted: false } }),
    prisma.settlement.count({ where: { groupId: group.id, status: "CONFIRMED" } }),
  ]);
  if (!ledger) notFound();
  const balanceOf = new Map(ledger.balances.map((b) => [b.userId, b.netBalance]));
  const adminCount = group.members.filter((m) => m.status === "ACTIVE" && (m.role === "ADMIN" || m.role === "OWNER")).length;
  const activeCount = group.members.filter((m) => m.status === "ACTIVE").length;

  const members: MemberRow[] = group.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    status: m.status as "ACTIVE" | "INVITED",
    inviteLink: isAdmin && m.status === "INVITED" && m.inviteToken ? appUrl(`/invite/${m.inviteToken}`) : null,
    name: m.user.name || m.user.displayName || m.user.email,
    email: m.user.email,
    balance: m.status === "ACTIVE" ? (balanceOf.get(m.userId) ?? 0) : null,
  }));

  const isOwner = isGroupOwner({ userId, createdBy: group.createdBy, role: me.role });
  let leaveBlocker = leaveGroupBlocker({
    balanceCents: toCents(balanceOf.get(userId) ?? 0),
    isAdmin,
    adminCount,
  });
  if (!leaveBlocker && activeCount === 1) leaveBlocker = "You are the only member. Delete the group instead.";

  return (
    <>
      <PageHeader
        back={
          <Link href={`/groups/${group.id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="size-4" aria-hidden /> {group.name}
          </Link>
        }
        title="Group settings"
        description={isAdmin ? "Admins can change these settings." : "Only admins can change these settings."}
      />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <GroupSettingsForm
            group={{
              id: group.id,
              name: group.name,
              description: group.description ?? "",
              currency: group.currency,
              simplifyDebts: group.simplifyDebts,
              archived,
            }}
            isAdmin={isAdmin}
            currencyBlocker={currencyChangeBlocker(expenseCount, paymentCount)}
            deleteBlocker={deleteGroupBlocker({
              isOwner,
              unsettledCents: ledger.balances.map((b) => toCents(b.netBalance)),
            })}
            isOwner={isOwner}
            myMemberId={me.id}
            leaveBlocker={leaveBlocker}
          />
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <MembersCard
            groupId={group.id}
            groupName={group.name}
            currency={group.currency}
            members={members}
            currentUserId={userId}
            isAdmin={isAdmin && !archived}
          />
        </div>
      </div>
    </>
  );
}
