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
- **App shell & design system**: one authenticated layout (`src/app/(app)/`)
  with top nav on desktop and a bottom tab bar on mobile, in-shell 404 and
  error pages, shared UI components (`src/components/ui/`), lucide icons,
  indigo brand colour, emerald/rose money colours. See `docs/design-system/`.
- **Dashboard**: per-currency owe / owed / net, per-group balances, who-pays-
  whom shortcuts, recent expenses with your share, first-run checklist.
- **Add expense**: all members and pending invitees ticked by default, payer =
  you, local date, category guessed from the description, live remainder for
  every split mode with submit disabled until balanced, inline errors,
  cents-exact payloads. `/expenses/create` remembers the last group.
- **Expenses list**: filters (group, category, date range, search), your share
  per row, cursor pagination ("Load more"). API: `GET /api/expenses` returns
  `{ items, nextCursor }` and accepts `limit`, `cursor`, `groupId`,
  `category`, `from`, `to`, `q`.
- **Invites**: re-inviting a pending email keeps the existing link, extends the
  expiry and returns `alreadyInvited: true`.
- **Currencies & categories**: one ISO currency list (`src/lib/currencies.ts`),
  validated server-side; new groups default to your preferred currency. One
  category list with labels and icons (`src/lib/categories.ts`).
- **Account**: profile, default currency, time zone (defaults from the
  browser), password, passkeys, JSON export, delete account (blocked while you
  have open balances).
- **Public pages**: landing, `/privacy`, `/terms`.
- **Email**: invite and password-reset emails through Resend when configured,
  otherwise logged; the UI always shows a copyable invite link.

## Checks

- `pnpm test`: unit tests for split and balance math, the add-expense form
  helpers (`split-form.ts`), currencies, categories and overview totals
- `pnpm typecheck`, `pnpm lint`, `next build`: clean

## Not done / next

- Recurring expenses, receipt upload, currency conversion between groups
- Activity feed and notifications
- Export (CSV) of a group's history
