import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getInvitationByToken, acceptInvitation } from "@/lib/invitation-utils";
import { hash } from "bcrypt";

const AcceptInvitationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// GET /api/invitations/[token] - Get invitation details by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Return invitation details without sensitive information
    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      group: invitation.group,
      inviter: invitation.inviter,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invitations/[token] - Accept invitation and create account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const validatedData = AcceptInvitationSchema.parse(body);

    // Hash the password
    const hashedPassword = await hash(validatedData.password, 12);

    const result = await acceptInvitation(token, {
      ...validatedData,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        message: "Invitation accepted successfully",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        group: result.group,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
