# FairShare

Split shared expenses with groups and friends, see who owes whom, and settle up.
Built with Next.js 15 (App Router), PostgreSQL (Prisma) and Auth.js v5.

Production: https://fairshare.arktik.id (`noindex`, private beta).

## What it does

- **Groups:** roles (owner / admin / member) and invites by email. "Ghost"
  members can be put on expenses before they have an account.
- **Friends:** 1:1 balances with a friend, outside any group.
- **Splitting:**
  - Equal, exact, percentage, shares and per-item splits, with one or more payers.
  - Amounts are split in whole minor units (cents, or whole rupiah for IDR), so
    the parts always add up to the total.
- **Multi-currency:** an expense can be in a different currency from its group.
  It is converted at a stored daily rate.
- **Expense records:** receipts (image upload), comments and edit history. Deleting
  is soft and can be undone for 30 days.
- **Balances and settling up:**
  - The app suggests the fewest payments, or plain pairwise debts if you prefer.
  - Recorded payments can be edited or undone.
- **Also included:** recurring expenses, payment reminders, an activity feed,
  spending insights and CSV exports.
- **Notifications:**
  - Email is sent through Resend. You choose which events you hear about, can
    get a weekly digest, and can unsubscribe in one click.
  - WhatsApp (via WAHA) is built but switched off until a WAHA server is configured.
- **Sign-in:** email + password, Google, or a passkey (WebAuthn).

[docs/STATUS.md](docs/STATUS.md) lists what is built, what was verified and what
is still missing.

## Run it locally

Requirements: Node 20+, pnpm 10 and PostgreSQL 15+.

```bash
pnpm install
cp .env.example .env     # set DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL
pnpm db:deploy           # apply prisma/migrations
pnpm dev                 # http://localhost:3000
```

Some features depend on optional settings:

- **Without `RESEND_API_KEY`:** no email is sent. In dev it is printed to the server
  log instead, and the invite dialog shows a link you can copy.
- **Without `CRON_SECRET`:** background jobs (recurring expenses, digests,
  delivery retries) do not run.

All variables are described in [`.env.example`](.env.example) and
[docs/OPERATIONS.md](docs/OPERATIONS.md).

## Checks

```bash
pnpm test                   # vitest unit tests
pnpm typecheck              # tsc --noEmit
pnpm lint --max-warnings 0
python3 scripts/smoke.py    # API smoke test against a running server
scripts/qa/run-all.sh       # Playwright end-to-end flows + screenshots
```

See [docs/TESTING.md](docs/TESTING.md).

## Docs

- [STATUS](docs/STATUS.md): what works, what was verified, known gaps
- [ARCHITECTURE](docs/ARCHITECTURE.md): code layout, data model, money rules,
  notifications, auth
- [API](docs/API.md): every HTTP endpoint
- [OPERATIONS](docs/OPERATIONS.md): configuration, deploy, cron, backups
- [TESTING](docs/TESTING.md): unit, smoke and browser tests
- [Design system](docs/design-system/README.md): UI tokens, components, layout rules
- [RFC](docs/RFC_EXPENSE_GROUP_SYSTEM.md): the original design proposal. It is
  historical; the code is the source of truth.
