/**
 * Ghost Users System - Utilities for managing invited users who haven't signed up yet
 * 
 * This system creates placeholder User records immediately when someone is invited,
 * allowing seamless expense splitting regardless of signup status.
 */

import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { UserStatus, MemberStatus, Prisma } from '@prisma/client';

/**
 * Create or get a ghost user for an email address
 * Used when inviting someone who may not have a FairShare account
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createOrGetGhostUser(rawEmail: string, _invitedBy?: string) {
  const email = rawEmail.trim().toLowerCase();
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
      // Already invited: keep the existing token so links that were already
      // shared keep working; only push the expiry out. Role is left as is.
      const updated = await prisma.groupMember.update({
        where: { id: existingMember.id },
        data: {
          expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          inviteToken: existingMember.inviteToken ?? generateInviteToken(),
        },
        include: {
          user: true,
          group: true,
          inviter: true,
        }
      });
      return { ...updated, alreadyInvited: true as const };
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

  if (userId && userId !== invitation.userId) {
    // Someone opened the invite while signed in to a different account.
    // Only allowed when the invited person is still a placeholder; their
    // splits and payments move over to the real account.
    if (invitation.user.status !== UserStatus.GHOST) {
      throw new Error('This invitation was sent to a different account');
    }
    await mergeGhostUser(invitation.userId, userId);
    const merged = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invitation.groupId, userId } },
      include: { user: true, group: true },
    });
    if (!merged) throw new Error('Invalid invitation token');
    if (merged.status === MemberStatus.ACTIVE) return merged;
    return prisma.groupMember.update({
      where: { id: merged.id },
      data: { status: MemberStatus.ACTIVE, joinedAt: new Date(), inviteToken: null, expiresAt: null },
      include: { user: true, group: true },
    });
  }

  // Update group member to active status
  const updatedMember = await prisma.groupMember.update({
    where: { id: invitation.id },
    data: {
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
 * Move everything a placeholder (ghost) user owns onto a real account and
 * mark the ghost as MERGED. Rows that would collide on a unique key (both
 * users on the same expense / item / group) are folded together.
 */
export async function mergeGhostUser(ghostId: string, realId: string) {
  if (ghostId === realId) return;
  await prisma.$transaction(async (tx) => {
    const add = (a: Prisma.Decimal, b: Prisma.Decimal) => a.add(b);

    for (const p of await tx.expensePayer.findMany({ where: { userId: ghostId } })) {
      const clash = await tx.expensePayer.findUnique({
        where: { expenseId_userId: { expenseId: p.expenseId, userId: realId } },
      });
      if (clash) {
        await tx.expensePayer.update({ where: { id: clash.id }, data: { amountPaid: add(clash.amountPaid, p.amountPaid) } });
        await tx.expensePayer.delete({ where: { id: p.id } });
      } else {
        await tx.expensePayer.update({ where: { id: p.id }, data: { userId: realId } });
      }
    }

    for (const sp of await tx.expenseSplit.findMany({ where: { userId: ghostId } })) {
      const clash = await tx.expenseSplit.findUnique({
        where: { expenseId_userId: { expenseId: sp.expenseId, userId: realId } },
      });
      if (clash) {
        await tx.expenseSplit.update({ where: { id: clash.id }, data: { amount: add(clash.amount, sp.amount) } });
        await tx.settlement.updateMany({ where: { splitId: sp.id }, data: { splitId: clash.id } });
        await tx.expenseSplit.delete({ where: { id: sp.id } });
      } else {
        await tx.expenseSplit.update({ where: { id: sp.id }, data: { userId: realId } });
      }
    }

    for (const sp of await tx.expenseItemSplit.findMany({ where: { userId: ghostId } })) {
      const clash = await tx.expenseItemSplit.findUnique({
        where: { itemId_userId: { itemId: sp.itemId, userId: realId } },
      });
      if (clash) {
        await tx.expenseItemSplit.update({ where: { id: clash.id }, data: { amount: add(clash.amount, sp.amount) } });
        await tx.expenseItemSplit.delete({ where: { id: sp.id } });
      } else {
        await tx.expenseItemSplit.update({ where: { id: sp.id }, data: { userId: realId } });
      }
    }

    await tx.settlement.updateMany({ where: { payerId: ghostId }, data: { payerId: realId } });
    await tx.settlement.updateMany({ where: { payeeId: ghostId }, data: { payeeId: realId } });

    for (const m of await tx.groupMember.findMany({ where: { userId: ghostId } })) {
      const clash = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: m.groupId, userId: realId } },
      });
      if (clash) {
        // Keep the real membership; carry the pending invite over if it is not active yet
        if (clash.status !== MemberStatus.ACTIVE) {
          await tx.groupMember.update({
            where: { id: clash.id },
            data: { status: m.status === MemberStatus.ACTIVE ? MemberStatus.ACTIVE : clash.status },
          });
        }
        await tx.groupMember.delete({ where: { id: m.id } });
      } else {
        await tx.groupMember.update({ where: { id: m.id }, data: { userId: realId } });
      }
    }

    await tx.user.update({
      where: { id: ghostId },
      data: { status: UserStatus.MERGED, isCleanupEligible: true },
    });
  });
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
export function generateInviteToken(): string {
  // Cryptographically secure, URL-safe
  return randomBytes(24).toString('base64url');
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