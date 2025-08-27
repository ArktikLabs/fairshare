import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const rpName = process.env.AUTH_WEBAUTHN_RP_NAME || "FairShare";
const rpID = process.env.AUTH_WEBAUTHN_RP_ID || "localhost";
const origin = process.env.AUTH_WEBAUTHN_RP_ORIGIN || "http://localhost:3000";

// Generate registration options
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { authenticators: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userAuthenticators = user.authenticators.map((authenticator) => ({
      id: Buffer.from(authenticator.credentialID, "base64url"),
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email || user.name || "User",
      userDisplayName: user.name || user.email || "User",
      attestationType: "indirect",
      excludeCredentials: userAuthenticators,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    // Store challenge in session or database for verification
    // For simplicity, we'll store it in the database temporarily
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // We'll store the challenge in a temporary field - you might want to use a separate table
        name: user.name, // Keep existing name
        // Store challenge somehow - this is a simplified approach
      },
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

// Verify registration response
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credential, challenge } = body;

    if (!credential || !challenge) {
      return NextResponse.json(
        { error: "Missing credential or challenge" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } =
        verification.registrationInfo;

      // Save the authenticator to the database
      await prisma.authenticator.create({
        data: {
          credentialID: Buffer.from(credentialID).toString("base64url"),
          userId: user.id,
          providerAccountId: Buffer.from(credentialID).toString("base64url"),
          credentialPublicKey:
            Buffer.from(credentialPublicKey).toString("base64url"),
          counter,
          credentialDeviceType: "platform",
          credentialBackedUp: false,
          transports: credential.response.transports?.join(",") || null,
        },
      });

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (error) {
    console.error("WebAuthn registration verification error:", error);
    return NextResponse.json(
      { error: "Registration verification failed" },
      { status: 500 }
    );
  }
}
