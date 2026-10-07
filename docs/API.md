# HTTP API

This API is used by FairShare's own pages. It is not versioned and makes no
stability promise to outside clients.

## Conventions

- **Auth:** "session" means a signed-in Auth.js session cookie is required.
  Without it the response is `401 {"error":"Unauthorized"}`.
- **Bodies and errors:** request and response bodies are JSON. Errors look like
  `{"error": "message"}`. Validation errors also carry
  `{"details": [...zod issues]}`.
- **Amounts:** JSON numbers in the major unit (`12.5` means 12.50, and IDR is
  whole rupiah). The server rounds them to the currency's minor unit.
- **Dates:** calendar dates are `YYYY-MM-DD`. Timestamps are ISO 8601.
- **Paging:** lists that page return `{ items, nextCursor }`. Pass
  `?cursor=<nextCursor>` to get the next page.
- **Status codes:**
  - 403: not a member, or not allowed.
  - 404: missing, or hidden from you.
  - 409: the group is archived, or the action is blocked by its current state.
  - 410: the restore window has passed.
  - 429: rate limited (`Retry-After` is set).

The source for every route is `src/app/api/<path>/route.ts`.

## Auth and account

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET/POST /api/auth/*` | – | Auth.js handlers (sign in/out, session, CSRF, Google callback) |
| `POST /api/auth/register` | public | `{email, password (8+), name?, timezone?}` → 201. If the email belongs to a ghost (invited) user, that account is claimed. |
| `POST /api/auth/forgot-password` | public | `{email}`. Always returns 200 (it does not reveal whether the account exists). Accounts with a password get an email with a reset link that lasts 1 h. |
| `GET /api/auth/reset-password?token=` | public | `{valid}`: the reset page checks the link before showing the form |
| `POST /api/auth/reset-password` | public | `{token, password}` |
| `POST /api/auth/change-password` | session | `{currentPassword, newPassword}` |
| `GET /api/webauthn/register` | session | Passkey registration options |
| `POST /api/webauthn/register` | session | Verify and store a passkey |
| `POST /api/webauthn/authenticate` | public | `{email}` → authentication options |
| `PUT /api/webauthn/authenticate` | public | Verify an assertion → `{verified, ticket}`. The ticket is single-use, lasts 60 s, and is exchanged via `signIn("credentials", {email, passkeyTicket})`. |
| `PUT /api/user/update` | session | `{name}` |
| `GET/PUT /api/user/preferences` | session | currency, timezone (IANA, validated), theme, language |
| `GET/PATCH /api/user/notifications` | session | Per-event email/WhatsApp switches and `digest: "WEEKLY"\|"NEVER"`. PATCH takes `{events?: [{key, email?, whatsapp?}], digest?}`. |
| `POST /api/user/phone` | session | See the WhatsApp number section below |
| `DELETE /api/user/phone` | session | Remove the number |
| `POST /api/user/export` | session | Download your data as JSON |
| `DELETE /api/user/delete` | session | `{confirmationText: "DELETE MY ACCOUNT"}`. Returns 409 while you still owe or are owed money. The account is deactivated and you leave every group. |

### `POST /api/user/phone` actions

- `{action:"send", phone}`:
  - Saves the number (unverified).
  - With WhatsApp configured, it sends a 6-digit code (429 when rate limited).
  - Without WhatsApp, it returns `200 {phone, sent:false, message}` and sends
    nothing.
- `{action:"verify", code}`: confirms the number.
- `{action:"test-code", code}`: plants a known code. It is only for the smoke
  test. It returns 404 in production, and also unless the request carries
  `x-test-secret: $CRON_SECRET`.

## Groups and members

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/groups` | session | Your groups, with member and expense counts. DIRECT (1:1) groups are excluded. |
| `POST /api/groups` | session | `{name, description?, currency?}` → 201. You become OWNER. The currency defaults to your preference, then USD. |
| `GET /api/groups/:id` | member | Group with active and invited members |
| `PUT /api/groups/:id` | admin | Change `name`, `description`, `currency` (only while the group has no expenses or payments), `simplifyDebts`, `archived` or `autoRemindWeekly`. An archived group only accepts `{archived:false}`. |
| `DELETE /api/groups/:id` | owner | `{confirmName}` must equal the group name. Everyone must be settled. |
| `GET /api/groups/:id/members` | member | Active and invited members |
| `POST /api/groups/:id/members` | admin | `{email \| userId, role?}`: invite. Creates a ghost user when the email has no account. Re-inviting keeps the same link, extends it and returns `alreadyInvited: true`. The response includes the invite link. |
| `PATCH /api/groups/:id/members/:memberId` | admin | `{role: "ADMIN"\|"MEMBER"}`. The owner's role cannot change. (`PUT` is an alias.) |
| `DELETE /api/groups/:id/members/:memberId` | admin or self | Remove a member, cancel an invite, or leave the group yourself. Leaving needs a settled balance, and the last admin cannot leave. |
| `GET /api/groups/:id/invitations` | admin | Pending invites |
| `DELETE /api/groups/:id/invitations?memberId=` | admin | Cancel an invite |
| `POST /api/groups/:id/join?token=` | session | Accept an invite for this group → 303 to the group. A token for another group returns 400 and does nothing. |
| `GET /api/invite/:token` | public | Invite details (group, inviter, invited email, expired?) |
| `POST /api/invite/:token` | session | Accept the invite |
| `GET /api/groups/:id/export.csv` | member | Expenses with a share column per member, then a payments section (UTF-8 BOM, RFC 4180, formula-safe) |

## Expenses

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/expenses` | session | Your expenses. Filters: `groupId`, `category`, `from`, `to` (`YYYY-MM-DD`), `q`, `limit`, `cursor`. Returns `{items, nextCursor}`. |
| `POST /api/expenses` | member | Create an expense (body below) → 201 |
| `GET /api/expenses/:id` | member | The expense, with payers, shares, items and your permissions. Deleted expenses are only shown to people who can restore them. |
| `PUT /api/expenses/:id` | creator / payer / admin | Full edit (same body as create), or metadata only (`description`, `category`, `notes`, `date`). The expense cannot move to another group. |
| `DELETE /api/expenses/:id` | creator / payer / admin | Soft delete → `{restorable: true}` |
| `POST /api/expenses/:id/restore` | creator / payer / admin | Undo a delete within 30 days (410 after that) |
| `GET /api/expenses/:id/receipt[?size=thumb]` | member | The receipt image |
| `POST /api/expenses/:id/receipt` | creator / payer / admin | Multipart `file`: JPEG, PNG or WebP, up to 8 MB (413 above). HEIC is refused with a hint. Replaces any existing receipt. |
| `DELETE /api/expenses/:id/receipt` | creator / payer / admin | Remove the receipt |
| `GET /api/expenses/:id/comments` | member | Comments |
| `POST /api/expenses/:id/comments` | member | `{body}` (1–2000 chars). Returns 409 in an archived group. |
| `DELETE /api/expenses/:id/comments/:commentId` | author | Delete your own comment |
| `GET /api/expenses/export.csv` | session | All your expenses, with your share |

### Expense body

```jsonc
{
  "groupId": "…",                      // required for currency and repeat
  "description": "Dinner",             // 1–255
  "amount": 300000,                    // total, in the expense currency
  "date": "2026-10-08",
  "category": "FOOD_DRINK",            // optional, see src/lib/categories.ts
  "notes": "…",
  "payers": [{ "userId": "…", "amountPaid": 300000 }],      // must add up to amount
  // EITHER a simple split …
  "splitMethod": "EQUAL",              // EQUAL | EXACT | PERCENTAGE | SHARES
  "participants": [{ "userId": "…" }, { "email": "new@friend.com", "shares": 2 }],
  // … OR items
  "items": [{ "name": "Pizza", "amount": 120000, "isShared": true,
              "splitMethod": "EQUAL", "participants": [{ "userId": "…" }] }],
  // optional extras
  "currency": "USD", "exchangeRate": 16250,      // foreign-currency expense; rate looked up when omitted
  "repeat": { "frequency": "MONTHLY", "endDate": "2027-10-08" }
}
```

- **Participants:** referenced by `userId` or `email`. An email that is not yet a
  member is invited as a ghost member.
- **Totals:** split amounts must add up to `amount`, and percentages to 100.
- **Foreign currency:** `exchangeRate` is in group-currency units per 1 unit of
  `currency`. Both `currency` and `repeat` need a `groupId`.
- **Repeat:** `repeat.frequency` can be `NONE`, `WEEKLY`, `BIWEEKLY`, `MONTHLY` or
  `YEARLY`. `endDate` is optional.

## Payments and balances

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/groups/:id/settlements` | member | Balances, suggested payments (according to `simplifyDebts`) and `history` |
| `POST /api/groups/:id/settlements` | payer / payee / admin | Record a payment: `{toUserId, fromUserId?, amount, method?, description?}` → 201. `fromUserId` defaults to you. |
| `PATCH /api/groups/:id/settlements/:sid` | payer / payee / admin | `{amount?, method?, description?}` |
| `DELETE /api/groups/:id/settlements/:sid` | payer / payee / admin | Soft delete → `{restorable: true}` |
| `POST /api/groups/:id/settlements/:sid` | payer / payee / admin | `{action: "restore"}`, within 30 days |
| `POST /api/groups/:id/reminders` | creditor, or admin | `{debtorId, creditorId?}`: remind someone to pay. 429 within 24 h of the last reminder. |
| `GET /api/balances` | session | Totals per currency, plus per-group net / owes / owed |

## Friends

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/friends` | session | People you share a group or a 1:1 ledger with, and the net balance with each |
| `POST /api/friends` | session | `{email}`: start a 1:1 ledger. Invites the person if they have no account. Returns 201 when created, 200 when it already existed. |
| `GET /api/friends/:id` | session | Friend detail |
| `POST /api/friends/:id` | session | Make sure a 1:1 ledger with someone you already share a group with exists → `{groupId, created}` |

## Activity, insights, currency

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/activity?groupId=&limit=&cursor=` | session / member | Activity lines, newest first → `{items, nextCursor}` |
| `GET /api/insights?groupId=&from=&to=` | session | Your share, by month and by category, per currency |
| `GET /api/fx/rate?from=&to=&date=` | session | `{rate, day, source}`, or 404 when no source has a rate |
| `PATCH /api/recurring/:id` | owner or admin | `{status: "ACTIVE"\|"PAUSED"\|"STOPPED"}`. A stopped template is final. |

## System

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | public | Checks the database connection: 200 `{status:"success"}`, or 500 |
| `POST /api/cron/run` | `Authorization: Bearer $CRON_SECRET` | Runs recurring, reminders, digests, fan-out and outbox. Body `{now?, only?: [step]}`; `now` only works outside production, or with `CRON_ALLOW_FAKE_NOW=1`. Returns 202 if a run is already in progress. |
| `POST /api/unsubscribe?t=` | signed token | One-click unsubscribe (RFC 8058). Also accepts a form field `t`. |
