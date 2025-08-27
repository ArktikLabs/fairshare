import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

const rpID = process.env.AUTH_WEBAUTHN_RP_ID || "localhost";
const origin = process.env.AUTH_WEBAUTHN_RP_ORIGIN || "http://localhost:3000";

// Generate authentication options
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true },
    });

    if (!user || user.authenticators.length === 0) {
      return NextResponse.json(
        { error: "No authenticators found for this user" },
        { status: 404 }
      );
    }

    const userAuthenticators = user.authenticators.map((authenticator) => ({
      id: Buffer.from(authenticator.credentialID, "base64url"),
      type: "public-key" as const,
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userAuthenticators,
      userVerification: "preferred",
    });

    // Store challenge temporarily for verification
    // In a production app, you'd want to store this more securely
    return NextResponse.json({ ...options, userId: user.id });
  } catch (error) {
    console.error("WebAuthn authentication options error:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}

// Verify authentication response
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, challenge, userId } = body;

    if (!credential || !challenge || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const credentialID = credential.id;
    const authenticator = user.authenticators.find(
      (auth) => auth.credentialID === credentialID
    );

    if (!authenticator) {
      return NextResponse.json(
        { error: "Authenticator not found" },
        { status: 404 }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(
          authenticator.credentialPublicKey,
          "base64url"
        ),
        counter: authenticator.counter,
      },
    });

    if (verification.verified) {
      // Update the counter
      await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: { counter: verification.authenticationInfo.newCounter },
      });

      return NextResponse.json({
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (error) {
    console.error("WebAuthn authentication verification error:", error);
    return NextResponse.json(
      { error: "Authentication verification failed" },
      { status: 500 }
    );
  }
}
