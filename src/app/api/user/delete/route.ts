import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadUserOverview } from "@/lib/overview";

// DELETE /api/user/delete - Delete the signed-in account.
//
// Expenses and payments are shared records: other people's balances depend on
// them, so the rows stay and the person is anonymised instead ("Deleted
// user"). Everything personal is removed: name, email, password, passkeys,
// OAuth links, sessions and preferences. Refused while the user still owes or
// is owed money in a group, so nobody's balance silently loses its owner.
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { confirmationText } = await request.json().catch(() => ({}));
    if (confirmationText !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Invalid confirmation text. Please type 'DELETE MY ACCOUNT' exactly." },
        { status: 400 }
      );
    }

    const { groups } = await loadUserOverview(userId);
    const open = groups.filter((g) => g.myStatus === "ACTIVE" && Math.round(g.net * 100) !== 0);
    if (open.length > 0) {
      return NextResponse.json(
        {
          error: `Settle up first: you still have open balances in ${open.map((g) => g.name).join(", ")}.`,
          openGroups: open.map((g) => ({ id: g.id, name: g.name })),
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.authenticator.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.userPreferences.deleteMany({ where: { userId } });
      await tx.userNotificationSetting.deleteMany({ where: { userId } });
      await tx.groupMember.updateMany({
        where: { userId, status: { in: ["ACTIVE", "INVITED"] } },
        data: { status: "LEFT", leftAt: new Date(), inviteToken: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: null,
          displayName: "Deleted user",
          email: `deleted-${userId}@deleted.invalid`,
          image: null,
          password: null,
          emailVerified: null,
          signupToken: null,
          status: "INACTIVE",
        },
      });
    });

    return NextResponse.json({ message: "Your account has been deleted.", redirectUrl: "/" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
