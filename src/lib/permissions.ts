// Pure permission rules, shared by the APIs and the pages so the UI never
// shows a button the server would refuse. Every API still checks active
// group membership first; these rules only decide what a member may do.

export type Role = "OWNER" | "ADMIN" | "MEMBER";

/** How long a deleted expense or payment can be restored. */
export const RESTORE_WINDOW_DAYS = 30;
const DAY = 86_400_000;

export const isAdminRole = (role: Role | null | undefined) => role === "OWNER" || role === "ADMIN";

/** Creator, any payer, or a group admin may edit / delete / restore an expense. */
export function canManageExpense(opts: {
  userId: string;
  createdById: string | null;
  payerIds: string[];
  role: Role | null;
  archived: boolean;
}): boolean {
  if (opts.archived) return false;
  return opts.createdById === opts.userId || opts.payerIds.includes(opts.userId) || isAdminRole(opts.role);
}

/** The payer, the receiver or a group admin may edit / delete / restore a payment. */
export function canManagePayment(opts: {
  userId: string;
  payerId: string;
  payeeId: string;
  role: Role | null;
  archived: boolean;
}): boolean {
  if (opts.archived) return false;
  return opts.userId === opts.payerId || opts.userId === opts.payeeId || isAdminRole(opts.role);
}

/** Deleted items stay restorable for RESTORE_WINDOW_DAYS. */
export function withinRestoreWindow(deletedAt: Date | string | null, now: Date = new Date()): boolean {
  if (!deletedAt) return true; // deleted before we tracked the time: allow
  const t = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt;
  return now.getTime() - t.getTime() <= RESTORE_WINDOW_DAYS * DAY;
}

/** Changing the currency would silently re-label every amount, so only before the first expense or payment. */
export function currencyChangeBlocker(expenseCount: number, paymentCount: number): string | null {
  if (expenseCount > 0 || paymentCount > 0) {
    return "The currency can only change while the group has no expenses or payments: amounts already recorded would be re-labelled, not converted.";
  }
  return null;
}

/** The group owner is the OWNER role, or the creator for groups made before roles had owners. */
export function isGroupOwner(opts: { userId: string; createdBy: string; role: Role | null }): boolean {
  return opts.role === "OWNER" || opts.userId === opts.createdBy;
}

/** Why the group cannot be deleted (null = allowed). */
export function deleteGroupBlocker(opts: { isOwner: boolean; unsettledCents: number[] }): string | null {
  if (!opts.isOwner) return "Only the group owner can delete the group.";
  if (opts.unsettledCents.some((c) => c !== 0)) return "Settle every balance first: deleting would wipe out money people still owe.";
  return null;
}

/** Why a member cannot leave (null = allowed). */
export function leaveGroupBlocker(opts: { balanceCents: number; isAdmin: boolean; adminCount: number }): string | null {
  if (opts.balanceCents !== 0) return "Settle up first: you still have an open balance in this group.";
  if (opts.isAdmin && opts.adminCount <= 1) return "You are the last admin. Make someone else admin first.";
  return null;
}
