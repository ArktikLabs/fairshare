import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmationText } = await request.json();

    // Require explicit confirmation
    if (confirmationText !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        {
          error:
            "Invalid confirmation text. Please type 'DELETE MY ACCOUNT' exactly.",
        },
        { status: 400 }
      );
    }

    // In a real application, this would:
    // 1. Delete all related data (expenses, groups, authenticators, etc.)
    // 2. Anonymize or backup necessary data for compliance
    // 3. Send confirmation email
    // 4. Log the action for audit purposes

    // For now, we'll just return a success message without actually deleting
    return NextResponse.json({
      message: "Account deletion request received",
      status: "pending",
      note: "Account deletion is currently disabled in development mode",
    });

    // Uncomment this for actual deletion:
    /*
    await prisma.$transaction(async (tx) => {
      // Delete authenticators
      await tx.authenticator.deleteMany({
        where: { userId: session.user.id }
      });

      // Delete user sessions
      await tx.session.deleteMany({
        where: { userId: session.user.id }
      });

      // Delete user accounts
      await tx.account.deleteMany({
        where: { userId: session.user.id }
      });

      // Delete the user
      await tx.user.delete({
        where: { id: session.user.id }
      });
    });

    return NextResponse.json({
      message: "Account successfully deleted",
      redirectUrl: "/",
    });
    */
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
