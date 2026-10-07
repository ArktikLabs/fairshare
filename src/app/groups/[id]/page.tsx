import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import { formatCurrency } from "../../../lib/utils";
import MemberManagement from "../../../components/MemberManagement";
import SettlementSuggestions from "../../../components/SettlementSuggestions";
import { loadGroupSettlements } from "../../../lib/group-ledger";
import { appUrl } from "../../../lib/mailer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Get group with members and expenses
  const group = await prisma.group.findFirst({
    where: {
      id,
      isActive: true,
      members: {
        some: {
          userId: user.id,
          status: { in: ["ACTIVE", "INVITED"] },
        },
      },
    },
    include: {
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { role: "asc" }, // ADMINs first
          { user: { name: "asc" } },
        ],
      },
      expenses: {
        where: { isDeleted: false },
        include: {
          payers: true,
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h1>
          <p className="text-gray-600 mb-6">The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Balances come from the same ledger as the settlements API
  const ledger = await loadGroupSettlements(group.id);
  const memberBalances = new Map<string, number>(
    (ledger?.balances ?? []).map((b) => [b.userId, b.netBalance])
  );

  // Find current user's role in the group
  const currentUserMember = group.members.find((member) => member.userId === user.id);
  const isAdmin =
    currentUserMember?.status === "ACTIVE" &&
    (currentUserMember.role === "ADMIN" || currentUserMember.role === "OWNER");
  const isPendingInvite = currentUserMember?.status === "INVITED";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Currency: {group.currency} • {group.members.length} members
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/groups/${group.id}/expenses/create`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Expense
              </Link>
              {isAdmin && (
                <Link
                  href={`/groups/${group.id}/settings`}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Settings
                </Link>
              )}
            </div>
          </div>
        </div>


        {isPendingInvite && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
            You have been invited to this group. Open the invite link you received to join and see balances.
          </div>
        )}

        {/* Balances, suggested payments and payment history */}
        {!isPendingInvite && (
          <SettlementSuggestions
            group={{
              id: group.id,
              name: group.name,
              currency: group.currency,
            }}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        )}

        {/* Member Management */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <MemberManagement
            group={{
              id: group.id,
              name: group.name,
              currency: group.currency,
              members: group.members.map((member) => ({
                id: member.id,
                userId: member.userId,
                role: member.role,
                status: member.status,
                inviteLink:
                  isAdmin && member.status === "INVITED" && member.inviteToken
                    ? appUrl(`/invite/${member.inviteToken}`)
                    : null,
                user: {
                  id: member.user.id,
                  name: member.user.name,
                  email: member.user.email || "",
                },
              })),
            }}
            memberBalances={memberBalances}
            currentUser={user}
            isAdmin={isAdmin}
          />
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Expenses
            </h2>
            <Link
              href={`/groups/${group.id}/expenses`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          {group.expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No expenses yet</p>
              <Link
                href={`/groups/${group.id}/expenses/create`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Add your first expense
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {group.expenses.slice(0, 5).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {expense.description}
                    </div>
                    <div className="text-sm text-gray-500">
                      {expense.category} •{" "}
                      {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(Number(expense.amount), group.currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Paid by{" "}
                      {expense.payers.length === 1
                        ? group.members.find(
                            (m) => m.userId === expense.payers[0].userId
                          )?.user.name ||
                          group.members.find(
                            (m) => m.userId === expense.payers[0].userId
                          )?.user.email ||
                          ""
                        : `${expense.payers.length} people`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
