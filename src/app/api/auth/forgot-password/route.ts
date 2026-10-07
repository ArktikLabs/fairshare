import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    // but only send email if user exists
    if (user && user.password) {
      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: email.toLowerCase() },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          email: email.toLowerCase(),
          token: resetToken,
          expires,
        },
      });

      await sendMail({
        to: email.toLowerCase(),
        subject: "Reset your FairShare password",
        text: `Someone asked to reset the password for this FairShare account.\n\nReset it here (valid for a limited time):\n${appUrl(`/auth/reset-password?token=${resetToken}`)}\n\nIf this wasn't you, ignore this email.`,
      });
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
