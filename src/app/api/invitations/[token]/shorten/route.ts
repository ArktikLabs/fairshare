import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

// Short code cache (expires after 1 hour)
const shortCodeCache = new Map<string, { token: string; expiresAt: number }>();

function generateShortCode(): string {
  // Generate a 8-character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// POST /api/invitations/[token]/shorten - Create short code for invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { token } = await params;

    // Validate invitation token and check permissions
    const invitation = await prisma.groupInvitation.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        group: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                isActive: true,
                role: { in: ["OWNER", "ADMIN"] },
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or expired" },
        { status: 404 }
      );
    }

    // Check if user has permission to create short codes for this invitation
    if (invitation.group.members.length === 0) {
      return NextResponse.json(
        { error: "Access denied: Admin privileges required" },
        { status: 403 }
      );
    }

    // Generate unique short code
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = generateShortCode();
      attempts++;
      if (attempts > maxAttempts) {
        return NextResponse.json(
          { error: "Failed to generate unique short code" },
          { status: 500 }
        );
      }
    } while (shortCodeCache.has(shortCode));

    // Store short code with 1-hour expiration
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    shortCodeCache.set(shortCode, { token, expiresAt });

    // Clean up expired codes
    for (const [code, data] of shortCodeCache.entries()) {
      if (Date.now() > data.expiresAt) {
        shortCodeCache.delete(code);
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const shortUrl = `${baseUrl}/invite/s/${shortCode}`;

    return NextResponse.json({
      shortCode,
      shortUrl,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("Error creating short code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}