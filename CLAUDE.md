# CLAUDE.md

Guidance for coding agents working in this repo. Read [docs/STATUS.md](docs/STATUS.md)
first, then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Commands

```bash
pnpm dev                       # dev server (Turbopack)
pnpm test                      # vitest unit tests
pnpm typecheck                 # tsc --noEmit
pnpm lint --max-warnings 0
pnpm build && pnpm start       # production build
pnpm db:generate               # after editing prisma/schema.prisma
pnpm exec prisma migrate dev --name <change>   # create a migration (dev DB)
pnpm db:deploy                 # apply migrations
python3 scripts/smoke.py       # API smoke test (server on :3810, dev DB)
WIDTH=390 OUT_DIR=/tmp/qa scripts/qa/run-all.sh   # browser flows + screenshots
```

Run `pnpm test`, `pnpm typecheck` and `pnpm lint --max-warnings 0` before every commit.
Whenever you change a flow, an endpoint or money logic, also run the smoke test and the
affected Playwright chunk. See [docs/TESTING.md](docs/TESTING.md).

## Rules that are easy to break

### Money

- Keep money in integer cents.
- Use the helpers in `src/lib/money.ts` and `src/lib/currencies.ts` (`allocateCents`,
  `allocateInUnits`, `minorUnitCents`).
- Never split with floats, and never round per row.
- Every balance comes from `src/lib/group-ledger.ts`. Do not compute balances anywhere
  else.

### Expense writes

- Expenses are written only through `src/lib/expense-write.ts`.
- Every activity row is recorded with `recordActivity()`, inside the same transaction
  as the change.

### Permissions

- Permission rules live in `src/lib/permissions.ts`. The API and the UI both use them.
- Every route checks active membership.
- A non-member gets 404, not 403.

### Dates and time zones

- Expense dates are calendar days. Format them with `formatDate()`, which uses UTC on
  purpose.
- Timestamps get the viewer's time zone.
- Anything that depends on the browser or on "now" must be hydration-safe.
  - In client components, use `<LocalDate>` or `useHydrated()` from
    `components/ui/local-date.tsx`.
  - Never call `formatDate(timestamp)` directly in a client component.

### Mail

- Mail goes only through `deliverMail()` / `sendMail()` or the notification outbox.
- Reserved test domains (`email-domains.ts`) are never sent to.
- Use `@demo.test` addresses in tests and seed data.

### Links and dialogs

- A link to an API or file download is a plain `<a>`, never `next/link`. Prefetching it
  hangs the page.
- Use `ConfirmDialog`, never `window.confirm()`. It renders as `role="alertdialog"`.

### Wording

- Running balances use "owe / are owed".
- The effect of a single expense uses "lent / borrowed".

### Layout

- Mobile is 390 px wide, and nothing may overflow it.
- Direct children of a grid need `min-w-0` so that truncated text can shrink.

## Where things are

- `src/app/(app)/` holds the signed-in pages. The shell is in
  `src/components/app-shell.tsx`.
- `src/app/api/` holds the route handlers ([docs/API.md](docs/API.md)).
- `src/lib/` holds domain logic, and `src/lib/notify/` holds notifications (outbox,
  dispatch, digest, WAHA).
- `auth.ts` configures Auth.js. Passkeys use a one-time ticket from
  `src/lib/auth-ticket.ts`.
- `ops/` has the deploy script, systemd units and the Caddy site
  ([docs/OPERATIONS.md](docs/OPERATIONS.md)).
