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
- **Expense detail** (`/expenses/[id]`): total, who paid, each person's share
  (item splits folded in) with owes / gets back, per-item breakdown, category,
  date, notes, added / last edited by, receipt, comments and edit history.
  Every expense row (dashboard, group, group expenses, `/expenses`) links here.
- **Edit expense** (`/expenses/[id]/edit`): the add-expense form in edit mode.
  Everything is editable, including amount, payers, split mode, participants
  and items. `PUT /api/expenses/[id]` validates membership and replaces payers,
  splits and items in one transaction (`src/lib/expense-write.ts` +
  `expense-compute.ts`, shared with create). Allowed for the creator, any payer
  or a group admin (`src/lib/permissions.ts`, used by API and UI alike).
- **Delete / restore**: delete is soft; `POST /api/expenses/[id]/restore`
  undoes it for 30 days (detail page, activity feed, Undo in the list).
- **Receipts**: JPEG/PNG/WebP up to 8 MB (HEIC rejected with a hint), resized
  to max 2000 px and re-encoded as JPEG with EXIF stripped (sharp), plus a
  thumbnail. Stored under `UPLOAD_DIR/receipts/` (default `./uploads`, outside
  `public/`) and served only by `GET /api/expenses/[id]/receipt[?size=thumb]`
  after a membership check. Add / replace / remove from the form or the detail
  page.
- **Comments**: members comment on expenses and delete their own
  (`/api/expenses/[id]/comments`).
- **Payments**: edit amount / method and delete with undo
  (`/api/groups/[id]/settlements/[settlementId]`, PATCH / DELETE / POST
  `{action:"restore"}`), by the payer, the receiver or an admin.
- **Group settings** (`/groups/[id]/settings`): rename, description, currency
  (only while the group has no expenses or payments), simplify debts on/off
  (off = plain pairwise net debts, see `pairwiseSettlements`), archive /
  unarchive (archived = read-only, listed separately on `/groups`), leave
  (settled, not the last admin), delete (owner only, everyone settled, type the
  group name). Members card lives here too.
- **Activity feed**: one `Activity` table written only through
  `recordActivity()` (`src/lib/activity.ts`), always inside the same
  transaction as the change. Payload snapshots names and amounts (plus the
  per-person impact for expenses) so lines stay readable later and
  notifications can reuse them. Events: expense created / edited (with a field
  diff) / deleted / restored, payment recorded / edited / deleted / restored,
  member invited / joined / left / removed / role changed, group created /
  renamed / settings changed / archived / unarchived, comment added. Lines are
  written for the reader by `describeActivity()` (`activity-format.ts`).
  `/activity` (nav + mobile tab) and a per-group section; API
  `GET /api/activity?groupId=&cursor=&limit=` returns `{ items, nextCursor }`.

## Checks

- `pnpm test`: unit tests for split and balance math, the add-expense form
  helpers (`split-form.ts`, including edit-mode prefill), currencies,
  categories, overview totals, simplify debts on/off, edit recompute and diff,
  permission rules and activity lines (`batch2.test.ts`)
- `pnpm typecheck`, `pnpm lint`, `next build`: clean

## Not done / next

- Notifications (email / WhatsApp) hooked into `recordActivity()`, reminders
- Recurring expenses, 1:1 friends, currency conversion between groups
- Export (CSV) of a group's history, charts
- Existing expenses from before activity tracking have no history (no backfill)

## Configuration

- `UPLOAD_DIR`: where receipt images are written (default `./uploads`). Must be
  persistent and outside `public/`; in production
  `~/docker-apps/fairshare-prod/uploads`.
