# Architecture

This page describes how FairShare fits together. Where it and the code disagree, the
code is right; fix this page.

## Stack

| Part | Used here |
| --- | --- |
| Web framework | Next.js 15.5 (App Router, React 19). Dev uses Turbopack; production uses `next start`. |
| Database | PostgreSQL 17 in production, through Prisma 6. Migrations are in `prisma/migrations/`. |
| Auth | Auth.js v5 (`auth.ts`, JWT sessions). Sign-in by credentials, Google (optional) or a passkey (SimpleWebAuthn). |
| UI | Tailwind CSS v4, Radix primitives, lucide icons. See [design-system](./design-system/README.md). |
| Images | `sharp`, for receipts. |
| Tests | vitest (unit), plus `scripts/smoke.py` (API) and Playwright (`scripts/qa/`). |

## Code layout

```
auth.ts                     Auth.js config: credentials (password or passkey ticket), Google
src/middleware.ts           adds x-pathname for the sign-in callbackUrl; no auth logic
src/app/
  (app)/                    signed-in pages; layout = app shell, redirects to /auth/signin
    dashboard groups friends expenses settlements activity insights account
  auth/                     signin, register, forgot-password, reset-password
  invite/[token]            accept an invite (also /invite/expired, /invite/error)
  unsubscribe               one-click unsubscribe landing page
  page.tsx privacy terms    public pages
  api/                      route handlers, see API.md
src/components/
  ui/                       design-system primitives
  expense-form/             add/edit expense form (split editor, items, currency, repeat)
  group/ friends/ expense/ account/ activity/ site/
src/lib/                    domain logic, no React
  money.ts                  integer-cent allocation (largest remainder)
  expense-compute.ts        payload -> payers/splits/items rows (create and edit share this)
  expense-write.ts          request schemas, HttpError, permission-aware loading
  settlement-utils.ts       balances, simplify-debts and pairwise suggestions
  group-ledger.ts           loads a group's ledger and payment history
  permissions.ts            who may edit, delete or restore what (used by the API and the UI)
  activity.ts               recordActivity(); activity-format.ts writes the lines
  notify/                   outbox, dispatch, email and WhatsApp transports, prefs, digest, tokens
  recurring.ts recurrence.ts reminders.ts friends.ts fx.ts fx-rates.ts receipts.ts csv.ts
  mailer.ts email-domains.ts  Resend sender and the reserved-domain guard
prisma/schema.prisma        data model
ops/                        systemd units, Caddy site, DB compose, deploy script
scripts/                    smoke.py, qa/ (Playwright flows)
```

## Data model (main tables)

### People

- **`User`**
  - `status` is one of `GHOST` (invited, never signed up), `PENDING`, `ACTIVE`,
    `INACTIVE` (deleted account) or `MERGED`.
  - `phone` and `phoneVerifiedAt` hold the WhatsApp number.
  - GHOST, INACTIVE and MERGED users cannot sign in.
- **`UserPreferences`:** currency, time zone, `emailDigest` (`WEEKLY` | `NEVER`).
- **`UserNotificationSetting`:** one row per user and event key, with email and
  WhatsApp on/off.
- **`Authenticator`:** passkeys.
- **`PasswordResetToken`** and **`VerificationToken`:** the latter also holds passkey
  challenges and one-time login tickets.

### Groups

- **`Group`:**
  - `kind` is `STANDARD` or `DIRECT`. A DIRECT group is the hidden 1:1 ledger between
    two friends, keyed by `directKey`.
  - Other fields: `currency`, `simplifyDebts`, `archivedAt`, `autoRemindWeekly`,
    `isActive` (false means deleted).
- **`GroupMember`:**
  - `role`: `OWNER`, `ADMIN` or `MEMBER`.
  - `status`: `INVITED`, `ACTIVE`, `LEFT` or `REMOVED`.
  - `inviteToken` and `expiresAt` hold the invite link.

### Money

- **`Expense`:**
  - `amount` is in the group currency.
  - A foreign-currency expense also stores `originalAmount`, `originalCurrency`,
    `exchangeRate`, `rateDate` and `rateSource`.
  - Also: `receiptKey`, soft delete (`isDeleted`, `deletedAt`), `recurringId`.
- **`ExpensePayer`, `ExpenseSplit`, `ExpenseItem`, `ExpenseItemSplit`:** who paid,
  who owes, and the per-item breakdown.
- **`Settlement`:** a recorded payment. `status` is `CONFIRMED` or `CANCELLED`.
  `deletedAt` is set when a payment is deleted and can be restored.
- **`RecurringExpense`:** a template. It is linked to the expense it came from and
  to the expenses it generates.
- **`ExchangeRate`:** a per-day rate cache.

### History and messaging

- **`Activity`:** an append-only event log. See below.
- **`ExpenseComment`:** comments on expenses.
- **`Notification`:** the outbox. Fields: channel, status, attempts, lastError,
  dedupeKey, nextAttemptAt.
- **`PaymentReminder`:** one row per reminder sent, used for the 24 h cooldown.
- **`PhoneVerification`:** hashed WhatsApp codes.

### Leftover tables

`NotificationTemplate`, `GroupSetting` and the `theme` / `language` preference fields
come from the original RFC. Only `/api/user/preferences` still reads them. Notification
preferences are defined in code (`src/lib/notify/events.ts`).

## Money rules

- **Storage:** amounts are stored as decimals.
- **Arithmetic:** all arithmetic runs in integer minor units (`toCents`).
- **Allocation:**
  - Equal, percentage and share splits use `allocateCents()`, a largest-remainder
    method. The parts always add up to the total exactly, and ties go to the
    earlier participant.
  - Zero-decimal currencies (IDR, JPY, KRW, …) are allocated in whole units
    (`allocateInUnits`, `minorUnitCents`).
- **Foreign-currency expenses:** each row is converted to the group currency.
  Largest remainder applies again, so the converted parts still add up.
- **Exchange rates:**
  - Taken from Frankfurter (ECB) first, then open.er-api.com.
  - Cached per day.
  - If both fail, the user types a rate by hand.
- **Balances:** for each member, paid − share, plus payments sent − payments received
  (`calculateGroupBalances`).
- **Settle-up suggestions:**
  - With `simplifyDebts` on, `optimizeSettlements` greedily matches the largest
    debtor with the largest creditor. This gives at most n − 1 payments.
  - With it off, `pairwiseSettlements` resolves each expense on its own, then nets
    the result per pair.
  - Both modes clear every balance exactly.
- **Display:** amounts are formatted with each currency's minor unit
  (`formatCurrency`, `Intl` en-US).

## Permissions

The rules are in `src/lib/permissions.ts`. The API and the pages share them, so the UI
never shows a button the server would refuse.

- **Every group, expense and settlement endpoint** first checks for active membership.
  If that fails it returns 403, or 404 when existence must not leak.
- **Expense** edit, delete, restore and receipt changes: the creator, any payer, or a
  group admin.
- **Payment** edit, delete and restore: the payer, the receiver, or an admin.
- **Archived groups** are read-only. Writes return 409, except unarchive.
- **Group settings:** admins only.
  - The currency can change only while the group has no expenses or payments.
  - Deleting a group is owner-only, needs everyone settled, and needs the group name
    typed to confirm.
- **Leaving a group** requires your balance to be settled, and the last admin cannot
  leave.

## Activity log

- Every change is written through `recordActivity()` (`src/lib/activity.ts`), inside
  the same transaction as the change itself.
- The payload snapshots names, amounts and each person's impact, so a line reads
  correctly later even after renames.
- `describeActivity()` turns a row into a sentence for a given reader. For example:
  "Ani added "Dinner" · you borrowed IDR 25,000".
- Activity rows also drive notifications.

## Notifications

```
recordActivity() --(after commit)--> dispatchActivity()   [schedule.ts; cron catches misses]
   -> recipientsFor()      never the actor; edits only reach people whose share changed
   -> wants()              per-user, per-event, per-channel prefs (defaults in events.ts)
   -> enqueue()            Notification rows, unique dedupeKey
   -> sendNotification()   claim PENDING -> SENDING; email via Resend (mailer.ts),
                           WhatsApp via WAHA (whatsapp-waha.ts); retry with backoff
                           (1 min * 2^n, max 6 h, 5 attempts) or FAILED / SKIPPED
```

- **Reserved domains are never sent to.**
  - Addresses at example.com/net/org or under .test, .example, .invalid, .localhost
    (RFC 2606 / 6761) are refused in `deliverMail()`.
  - The outbox marks those rows `SKIPPED` without calling any transport
    (`email-domains.ts`).
- **Email** has an HTML and a text part, a `List-Unsubscribe` and
  `List-Unsubscribe-Post` header, and a signed one-click link per event
  (`notify/token.ts`, an HMAC of `AUTH_SECRET`).
- **WhatsApp:**
  - Off unless both `WAHA_URL` and `WAHA_API_KEY` are set. The UI then says
    "not available" and nothing is queued.
  - Messages go only to numbers verified with a 6-digit code. The code is hashed,
    valid for 10 min, allows 5 tries, needs 60 s between sends, and is limited to
    5 per day.
- **Weekly digest:** opt-in, built by `runDigests()`. Each user gets one at most every
  7 days (rolling from `lastDigestAt`), covering the past 7 days. It is not tied to a
  weekday or the user's time zone.
- **Payment reminders:**
  - Sent by the creditor, or by an admin on the creditor's behalf.
  - Limited to one per pair per group per 24 h (a second try returns 429 with
    `Retry-After`).
  - Optional weekly automatic reminders per group.

## Background jobs

- `POST /api/cron/run` (bearer `CRON_SECRET`) runs these steps in order:
  1. Recurring expenses
  2. Auto reminders
  3. Digests
  4. Fan-out of activities that were not dispatched yet
  5. Outbox drain
- Each step is idempotent through unique keys. If one step fails, the others still
  run.
- In production a systemd timer calls it every 5 minutes. See
  [OPERATIONS](./OPERATIONS.md).

## Recurring expenses

- A template stores the expense payload, `frequency` (weekly, every 2 weeks,
  monthly, yearly), the start date and an optional end date.
- Occurrence n is computed from the start date rather than from the previous
  occurrence. So Jan 31 → Feb 28/29 → Mar 31, all in the owner's time zone.
- Each occurrence is created as the owner, and is unique per (template, date).
- Templates can be paused, resumed or stopped from the expense page.

## Receipts

- **Upload:** JPEG, PNG or WebP up to 8 MB. File types are sniffed from magic bytes,
  and HEIC is rejected with a hint.
- **Processing:** images are resized to at most 2000 px and re-encoded as JPEG
  without EXIF data, plus a thumbnail.
- **Storage:** files are written to `UPLOAD_DIR/receipts/`, outside `public/`.
- **Access:** files are served only through `/api/expenses/:id/receipt` after a
  membership check.

## Friends and 1:1 ledgers

- Adding a friend by email creates a hidden DIRECT group for the pair. If the
  person has no account, a ghost user is created and invited.
- `/friends` shows the net balance across the DIRECT group and every shared group.
- `/friends/:id` only settles the DIRECT ledger. Group balances are settled on each
  group's page.

## Auth

- **Password:** bcrypt.
  - A reset link is valid for 1 hour.
  - The page checks it with `GET /api/auth/reset-password?token=` before showing
    the form.
- **Passkeys:**
  - `/api/webauthn/register` (GET options, POST verify) is for signed-in users.
    Registration options ask for a platform authenticator with a resident key
    preferred.
  - `/api/webauthn/authenticate` (POST options by email, PUT verify) returns a
    one-time ticket, valid for 60 s.
  - The client exchanges the ticket for a session through the credentials provider
    (`passkeyTicket`).
  - Challenges are stored server-side for 5 minutes and deleted when read.
  - `AUTH_WEBAUTHN_RP_ID` and `AUTH_WEBAUTHN_RP_ORIGIN` must match the public domain.
- **Google:** enabled only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
  It is not configured in production.
- **Sessions:** JWT. Pages under `(app)` redirect to
  `/auth/signin?callbackUrl=…`. The callback URL is checked by `safe-redirect.ts`.
