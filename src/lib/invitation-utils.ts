import { prisma } from "@/lib/prisma";
import { GroupRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface InvitationData {
  email: string;
  groupId: string;
  role: GroupRole;
  invitedBy: string;
}

export interface InvitationResult {
  id: string;
  email: string;
  token: string;
  inviteLink: string;
  expiresAt: Date;
}

/**
 * Generate a cryptographically secure, URL-safe token for invitations
 */
function generateSecureToken(): string {
  const randomBytes = crypto.randomBytes(32);
  return randomBytes.toString('base64url');
}

/**
 * Generate a unique invitation token, retrying on collision
 */
async function generateUniqueInvitationToken(maxRetries = 5): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const token = generateSecureToken();
    
    // Check if token already exists
    const existingInvitation = await prisma.groupInvitation.findUnique({
      where: { token },
    });
    
    if (!existingInvitation) {
      return token;
    }
  }
  
  throw new Error('Failed to generate unique invitation token after multiple attempts');
}

/**
 * Create a group invitation for a user who doesn't have an account yet
 */
export async function createGroupInvitation(
  data: InvitationData
): Promise<InvitationResult> {
  // Normalize email for consistent lookups and storage
  const email = data.email.trim().toLowerCase();

  // Check if there's already an active invitation for this email and group
  const existingInvitation = await prisma.groupInvitation.findFirst({
    where: {
      email,
      groupId: data.groupId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvitation) {
    // Return the existing invitation
    return {
      id: existingInvitation.id,
      email: existingInvitation.email,
      token: existingInvitation.token,
      inviteLink: generateInviteLink(existingInvitation.token),
      expiresAt: existingInvitation.expiresAt,
    };
  }

  // Generate secure token and create new invitation that expires in 7 days
  const secureToken = await generateUniqueInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.groupInvitation.create({
    data: {
      email,
      groupId: data.groupId,
      role: data.role,
      invitedBy: data.invitedBy,
      token: secureToken,
      expiresAt,
    },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    token: invitation.token,
    inviteLink: generateInviteLink(invitation.token),
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Validate and get invitation details by token
 */
export async function getInvitationByToken(token: string) {
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
        select: {
          id: true,
          name: true,
          description: true,
          currency: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return invitation;
}

/**
 * Accept a group invitation and create user account + group membership
 */
export async function acceptInvitation(
  token: string,
  userData: {
    name: string;
    email: string;
    password: string;
  }
) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error("Invalid or expired invitation");
  }

  // Normalize emails for comparison and database query
  const normalizedInvitationEmail = invitation.email.trim().toLowerCase();
  const normalizedUserEmail = userData.email.trim().toLowerCase();

  if (normalizedInvitationEmail !== normalizedUserEmail) {
    throw new Error("Email doesn't match invitation");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedUserEmail },
  });

  if (existingUser) {
    // User exists, just add them to the group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: invitation.groupId,
        userId: existingUser.id,
      },
    });

    if (existingMember) {
      if (existingMember.status !== "ACTIVE") {
        // Reactivate existing member
        await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: "ACTIVE",
            role: invitation.role,
          },
        });
      }
    } else {
      // Create new membership
      await prisma.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId: existingUser.id,
          role: invitation.role,
        },
      });
    }

    // Mark invitation as accepted
    await prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        isActive: false,
      },
    });

    return { user: existingUser, group: invitation.group };
  }

  // Hash password before creating user
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
  const passwordHash = await bcrypt.hash(userData.password, rounds);

  // Create new user and group membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        name: userData.name,
        email: normalizedUserEmail,
        password: passwordHash,
        emailVerified: new Date(), // Auto-verify email for invited users
      },
    });

    // Create group membership
    await tx.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId: newUser.id,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await tx.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        isActive: false,
      },
    });

    return { user: newUser, group: invitation.group };
  });

  return result;
}

/**
 * Generate invite link URL
 */
function generateInviteLink(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

/**
 * Get pending invitations for a group
 */
export async function getGroupInvitations(groupId: string) {
  const invitations = await prisma.groupInvitation.findMany({
    where: {
      groupId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invitations.map((invitation) => {
    const { token, ...invitationWithoutToken } = invitation;
    return {
      ...invitationWithoutToken,
      inviteLink: generateInviteLink(token),
    };
  });
}

/**
 * Cancel/deactivate an invitation
 */
export async function cancelInvitation(invitationId: string, userId: string) {
  // Verify the user has permission to cancel this invitation
  const invitation = await prisma.groupInvitation.findFirst({
    where: {
      id: invitationId,
      isActive: true,
    },
    include: {
      group: {
        include: {
          members: {
            where: {
              userId,
              status: "ACTIVE",
              role: { in: ["ADMIN"] },
            },
          },
        },
      },
    },
  });

  if (!invitation || invitation.group.members.length === 0) {
    throw new Error("Permission denied or invitation not found");
  }

  await prisma.groupInvitation.update({
    where: { id: invitationId },
    data: { isActive: false },
  });

  return true;
}
