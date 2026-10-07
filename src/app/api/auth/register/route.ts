import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isValidTimezone } from "@/lib/localization-utils";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().max(100).optional(),
  /** Browser time zone, used as the default preference. */
  timezone: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password, name } = parsed.data;
    const timezone = parsed.data.timezone && isValidTimezone(parsed.data.timezone) ? parsed.data.timezone : undefined;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Placeholder users (invited before they signed up) can claim their account.
    // Their memberships, splits and payments are already attached to this row.
    if (existingUser && existingUser.status !== "GHOST") {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const select = { id: true, email: true, name: true, createdAt: true } as const;
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            name: name || existingUser.displayName || null,
            status: "ACTIVE",
            lastActivityAt: new Date(),
          },
          select,
        })
      : await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: name || null,
            status: "ACTIVE",
          },
          select,
        });

    if (timezone) {
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, timezone },
      });
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
