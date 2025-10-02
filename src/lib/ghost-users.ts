/**
 * Ghost Users System - Utilities for managing invited users who haven't signed up yet
 * 
 * This system creates placeholder User records immediately when someone is invited,
 * allowing seamless expense splitting regardless of signup status.
 */

import { prisma } from './prisma';
import { UserStatus, MemberStatus } from '@prisma/client';

/**
 * Create or get a ghost user for an email address
 * Used when inviting someone who may not have a FairShare account
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createOrGetGhostUser(email: string, _invitedBy?: string) {
  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Extract display name from email
    const displayName = extractNameFromEmail(email);
    
    user = await prisma.user.create({
      data: {
        email,
        status: UserStatus.GHOST,
        displayName,
        invitedAt: new Date(),
        lastInvitedAt: new Date(),
      }
    });
  } else if (user.status === UserStatus.GHOST) {
    // Update last invited timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastInvitedAt: new Date() }
    });
  }

  return user;
}

/**
 * Invite a user to a group, creating ghost user if necessary
 */
export async function inviteUserToGroup({
  email,
  groupId,
  invitedBy,
  role = 'MEMBER',
  expiresInDays = 7
}: {
  email: string;
  groupId: string;
  invitedBy: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  expiresInDays?: number;
}) {
  // Create or get ghost user
  const user = await createOrGetGhostUser(email, invitedBy);
  
  // Check if already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });

  if (existingMember) {
    if (existingMember.status === MemberStatus.ACTIVE) {
      throw new Error('User is already an active member of this group');
    } else if (existingMember.status === MemberStatus.INVITED) {
      // Update existing invitation
      return await prisma.groupMember.update({
        where: { id: existingMember.id },
        data: {
          invitedBy,
          expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          inviteToken: generateInviteToken(),
          role,
        },
        include: {
          user: true,
          group: true,
          inviter: true,
        }
      });
    } else {
      // Reactivate if they left or were removed
      return await prisma.groupMember.update({
        where: { id: existingMember.id },
        data: {
          status: MemberStatus.INVITED,
          invitedBy,
          expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          inviteToken: generateInviteToken(),
          role,
        },
        include: {
          user: true,
          group: true,
          inviter: true,
        }
      });
    }
  }

  // Create new group member invitation
  const groupMember = await prisma.groupMember.create({
    data: {
      groupId,
      userId: user.id,
      role,
      status: MemberStatus.INVITED,
      invitedBy,
      inviteToken: generateInviteToken(),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    },
    include: {
      user: true,
      group: true,
      inviter: true,
    }
  });

  return groupMember;
}

/**
 * Accept group invitation - transitions ghost user to active member
 */
export async function acceptGroupInvitation(inviteToken: string, userId?: string) {
  const invitation = await prisma.groupMember.findUnique({
    where: { inviteToken },
    include: {
      user: true,
      group: true,
    }
  });

  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    throw new Error('Invitation has expired');
  }

  if (invitation.status !== MemberStatus.INVITED) {
    throw new Error('Invitation is no longer valid');
  }

  // If userId provided, link the invitation to the real user account
  let targetUserId = invitation.userId;
  if (userId && userId !== invitation.userId) {
    // This handles the case where someone signs up with a different user account
    // than the ghost user that was invited
    targetUserId = userId;
    
    // TODO: Consider migrating expenses from ghost user to real user
    // For now, we'll just update the group member
  }

  // Update group member to active status
  const updatedMember = await prisma.groupMember.update({
    where: { id: invitation.id },
    data: {
      userId: targetUserId,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
      inviteToken: null, // Clear the token
      expiresAt: null,   // Clear expiry
    },
    include: {
      user: true,
      group: true,
    }
  });

  return updatedMember;
}

/**
 * Upgrade ghost user to active user when they sign up
 */
export async function upgradeGhostUserToActive(
  email: string,
  userData: {
    name: string;
    password?: string;
    emailVerified?: Date;
  }
) {
  const ghostUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!ghostUser) {
    throw new Error('Ghost user not found');
  }

  if (ghostUser.status !== UserStatus.GHOST) {
    throw new Error('User is not a ghost user');
  }

  // Upgrade the ghost user to active
  const upgradedUser = await prisma.user.update({
    where: { id: ghostUser.id },
    data: {
      name: userData.name,
      password: userData.password,
      emailVerified: userData.emailVerified || new Date(),
      status: UserStatus.ACTIVE,
      lastActivityAt: new Date(),
    }
  });

  return upgradedUser;
}

/**
 * Get display name for a user (handles ghost users)
 */
export function getUserDisplayName(user: {
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  status: string;
}) {
  if (user.name) return user.name;
  if (user.displayName) return user.displayName;
  if (user.email) {
    const extracted = extractNameFromEmail(user.email);
    return user.status === 'GHOST' ? `${extracted} (invited)` : extracted;
  }
  return 'Unknown User';
}

/**
 * Check if user is a ghost user
 */
export function isGhostUser(user: { status: string }) {
  return user.status === 'GHOST';
}

/**
 * Generate a unique invite token
 */
function generateInviteToken(): string {
  // Generate a secure random token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Extract a display name from an email address
 */
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  
  // Convert common patterns to readable names
  return localPart
    .replace(/[._-]/g, ' ') // Replace separators with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
    .trim();
}

/**
 * Clean up expired ghost users (for maintenance)
 */
export async function cleanupExpiredGhostUsers(daysInactive = 90) {
  const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);
  
  // Find ghost users with no recent activity and no group memberships
  const expiredGhosts = await prisma.user.findMany({
    where: {
      status: UserStatus.GHOST,
      OR: [
        { lastInvitedAt: { lt: cutoffDate } },
        { AND: [{ lastInvitedAt: null }, { invitedAt: { lt: cutoffDate } }] }
      ],
      groupMemberships: { none: {} }, // No group memberships
      expenseSplits: { none: {} },    // No expense splits
    }
  });

  if (expiredGhosts.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: { in: expiredGhosts.map(user => user.id) }
      }
    });
  }

  return expiredGhosts.length;
}