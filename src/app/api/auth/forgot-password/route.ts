import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

      // TODO: Send email with reset link
      // For now, we'll log the token (remove this in production)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: ${process.env.AUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`);
      
      // In production, you would send an email here:
      // await sendPasswordResetEmail(email, resetToken);
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
