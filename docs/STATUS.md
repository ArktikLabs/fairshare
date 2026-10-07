# Project Status

## Done

- **Auth**: email/password, Google, passkeys (WebAuthn). Passkey sign-in is
  verified server-side and exchanged for a one-time ticket (no shared magic
  password). Registration challenges are stored server-side.
- **Groups**: create, list (`/groups`), edit, members and roles
  (owner/admin/member), invite by email, cancel invites, leave group (only
  once settled), last-admin protection.
- **Ghost users**: people invited by email can be put on expenses before they
  join. On sign-up they claim the same account and see their balance after
  accepting the invite.
- **Expenses**: equal / exact / percentage / shares / itemized splits, multiple
  payers, edit and delete (payer or group admin). All split math runs in
  integer cents so parts always add up to the total.
- **Balances & settle up**: per-group ledger (expenses + itemized splits +
  recorded payments), minimal payment suggestions, "Mark as paid" records a
  payment, payment history, cross-group overview (`/settlements`, dashboard).
- **Access control**: every group/expense/settlement endpoint checks active
  membership; participants must belong to the group.
- **Email**: invite and password-reset emails through Resend when configured,
  otherwise logged; the UI always shows a copyable invite link.

## Checks

- `pnpm test`: unit tests for split and balance math
- `pnpm typecheck`, `pnpm lint`, `next build`: clean

## Not done / next

- Recurring expenses, receipt upload, currency conversion between groups
- Activity feed and notifications
- Export (CSV) of a group's history
