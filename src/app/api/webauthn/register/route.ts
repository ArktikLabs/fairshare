import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { consumeChallenge, storeChallenge } from "@/lib/webauthn-store";

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
      // v13: credential IDs are base64url strings (as stored)
      id: authenticator.credentialID,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      // v13 wants bytes; UTF-8 of the id keeps the same user handle v9 produced
      userID: isoUint8Array.fromUTF8String(user.id),
      userName: user.email || user.name || "User",
      userDisplayName: user.name || user.email || "User",
      // v13 dropped "indirect"; attestation isn't checked against a trust anchor here anyway
      attestationType: "none",
      excludeCredentials: userAuthenticators,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    await storeChallenge("register", user.id, options.challenge);

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
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "Missing credential" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const challenge = await consumeChallenge("register", user.id);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge expired, please try again" },
        { status: 400 }
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred } = verification.registrationInfo;
      const credentialID = cred.id; // base64url string
      const credentialPublicKey = cred.publicKey;
      const counter = cred.counter;

      // Save the authenticator to the database
      await prisma.authenticator.create({
        data: {
          credentialID,
          userId: user.id,
          providerAccountId: credentialID,
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
