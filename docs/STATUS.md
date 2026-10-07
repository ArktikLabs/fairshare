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

- **Batch 3**
  - Money: amounts use each currency's minor unit (`Intl` en-US, IDR/JPY/KRW
    without decimals). Storage stays in cents; zero-decimal currencies are
    split in whole units (`minorUnitCents`, `allocateInUnits`).
  - Notifications (`src/lib/notify/`): `recordActivity()` schedules
    `dispatchActivity()` after the response (never blocks or fails it). It
    picks recipients (never the actor; edits only notify people whose share
    changed), checks per-user, per-event, per-channel preferences
    (`UserNotificationSetting`, Account > Notifications) and queues rows in the
    `Notification` outbox (status, attempts, lastError, dedupeKey). Sending
    retries with backoff (5 attempts). Weekly email digest option
    (`UserPreferences.emailDigest`).
  - Email via Resend (`mailer.ts`): HTML + text, `List-Unsubscribe` header and a
    signed one-click unsubscribe link per event type (`/unsubscribe?t=`).
  - WhatsApp via WAHA (`notify/whatsapp-waha.ts`): `POST /api/sendText`
    `{session, chatId: "<digits>@c.us", text}` with `X-Api-Key`, plus
    `GET /api/contacts/check-exists`. Disabled (UI says unavailable) without
    `WAHA_URL`/`WAHA_API_KEY`. Phone number in Account (country selector, E.164),
    verified with a 6-digit code over WhatsApp (hashed, 10 min, 5 tries,
    60 s between sends, 5 per day). Nothing else goes to unverified numbers.
  - Payment reminders: "Remind" on settle-up suggestions (creditor -> debtor),
    once per 24 h per pair per group (`PaymentReminder`), recorded in activity.
    Optional weekly automatic reminders per group (group settings, off).
  - Cron: `POST /api/cron/run` with `Authorization: Bearer $CRON_SECRET`:
    recurring expenses, auto reminders, digests, outbox. Idempotent (unique
    keys). Body `{ "now": "..." }` fakes the clock outside production.
    `ops/fairshare-cron.{service,timer}` every 5 min (not installed).
  - Recurring expenses: Repeat (weekly, 2 weeks, monthly, yearly, end date) on
    create/edit; `RecurringExpense` template; occurrence n is computed from the
    start date (Jan 31 -> Feb 28/29 -> Mar 31) in the owner's time zone; created
    as the owner, unique per (template, date). Pause / resume / stop on the
    expense page; list in group settings.
  - Friends: hidden DIRECT group per pair (`Group.kind`, `directKey`), excluded
    from group lists. `/friends` (net per friend across direct and shared
    groups, add by email which invites if no account), `/friends/[id]`
    (balance, settle up, remind, shared expenses, add expense). Desktop nav
    link; on mobile a Groups | Friends switch.
  - Multi-currency: an expense can be in another currency; stored original
    amount + currency, rate, rate date, source; rows converted to the group
    currency (largest remainder in the group's minor unit). Rates from
    Frankfurter (ECB) then open.er-api.com, cached per day in `ExchangeRate`;
    manual rate when both fail. Detail shows both amounts.
  - CSV: `/api/groups/[id]/export.csv` (share column per member, payments
    section) and `/api/expenses/export.csv` (my expenses with my share). BOM,
    RFC 4180, formula-injection safe. Buttons in group settings and /expenses.
  - `/insights`: my share by month and category per currency, group and date
    filters, CSS bar charts with a table fallback. In the account menu.
  - Activity: "Budi paid you IDR 100,000" no longer repeats "you received".

## Checks

- `pnpm test`: unit tests for split and balance math, the add-expense form
  helpers (`split-form.ts`, including edit-mode prefill), currencies,
  categories, overview totals, simplify debts on/off, edit recompute and diff,
  permission rules and activity lines (`batch2.test.ts`), recurrence dates,
  currency conversion, WAHA adapter (mocked fetch), notification routing,
  unsubscribe tokens, insights and minor-unit formatting (`batch3.test.ts`),
  CSV escaping (`batch3-csv.test.ts`)
- `pnpm typecheck`, `pnpm lint`, `next build`: clean

## Not done / next

- WhatsApp has only been tested against a mocked WAHA; first real use needs a
  WAHA server and `WAHA_*` env
- Existing expenses from before activity tracking have no history (no backfill)

## Configuration

- `UPLOAD_DIR`: where receipt images are written (default `./uploads`). Must be
  persistent and outside `public/`; in production
  `~/docker-apps/fairshare-prod/uploads`.
- `CRON_SECRET` (16+ chars): bearer token for `POST /api/cron/run`. Without it
  the endpoint answers 401 and nothing runs in the background (notifications
  are still sent right after each action).
- `CRON_ALLOW_FAKE_NOW=1`: lets the cron body fake the clock in production
  (testing only).
- `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION` (default `default`): WhatsApp via
  WAHA. Leave empty to disable WhatsApp.
- `RESEND_API_KEY`, `EMAIL_FROM`: email (without them, mail is logged in dev).
