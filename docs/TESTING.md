# Testing

There are three layers. Run all of them before you merge anything that touches
money, permissions or a flow.

| Layer | Command | Needs | What it proves |
| --- | --- | --- | --- |
| Unit | `pnpm test` | nothing | Money math, form helpers, permissions, activity lines, recurrence, FX, notification routing, mail guard |
| Static | `pnpm typecheck` and `pnpm lint --max-warnings 0` | nothing | Types and lint |
| API smoke | `python3 scripts/smoke.py` | a running server and the dev DB | 219 checks across every endpoint, including permissions and the cron jobs |
| Browser | `scripts/qa/run-all.sh` | a running server, the dev DB and Playwright Chromium | 118 screenshot and assertion checks through the real UI at one width |

## Unit tests (vitest)

These live in `src/lib/*.test.ts` and `src/lib/notify/*.test.ts`. They are pure
functions. The few tests that touch Prisma or `fetch` mock them with `vi`.

| File | Covers |
| --- | --- |
| `money.test.ts` | Largest-remainder allocation, split methods, payer totals, group balances and settle-up suggestions |
| `split-form.test.ts` | Add-expense form helpers: remainders, payloads, edit-mode prefill |
| `catalog.test.ts` | Currency and category lists |
| `batch2.test.ts` | Simplify debts on/off, edit recompute and diff, calendar days, permissions, activity sentences |
| `batch3.test.ts` | Recurrence dates, FX conversion, WAHA adapter, notification recipients and prefs, unsubscribe tokens, insights, minor-unit formatting |
| `batch3-csv.test.ts` | CSV escaping and formula-injection safety |
| `email-domains.test.ts` | Reserved-domain detection; `deliverMail` / `sendMail` never call Resend for them |
| `notify/outbox.test.ts` | Reserved-domain rows become `SKIPPED` with no transport call |
| `format-dates.test.ts` | Calendar dates stay on their day; timestamps use the viewer's zone |

The tests must pass whatever the machine's time zone is. Check that with:

```bash
TZ=America/Los_Angeles pnpm test
```

## API smoke test

`scripts/smoke.py` uses only the Python standard library.

- It registers fresh users and drives every endpoint.
- It asserts on responses, and, for things the API does not expose, on rows in
  the database.
- It moves the cron clock forward (`{"now": …}`) to test recurring expenses,
  reminders and digests.

```bash
pnpm dev -p 3810                       # or next start on 3810
DOCKER_HOST=unix:///run/user/1000/docker.sock python3 scripts/smoke.py
```

- Run it against `next dev`. Under `next start` (`NODE_ENV=production`), 5 checks fail
  on purpose, because the phone test code and the faked cron clock are switched off.
- It refuses to run against anything except localhost.
- `BASE_URL=… python3 scripts/smoke.py --prod` runs only the API checks before the
  cron section, against a deployed server and without database access. It still
  creates `@smoke.invalid` users and groups there.
- Every user it creates is at `@demo.test`, or `@smoke.invalid` with `--prod`.
  The mailer never sends to reserved domains.
- Test data is not cleaned up. Use a throwaway database: the dev container
  `fairshare-dev-db` keeps its data on tmpfs.

## Browser flows (Playwright)

```bash
pnpm exec playwright install chromium          # once
WIDTH=1280 OUT_DIR=/tmp/qa scripts/qa/run-all.sh
WIDTH=390  OUT_DIR=/tmp/qa scripts/qa/run-all.sh
```

### How the runner works

`run-all.sh` runs `scripts/qa/flows.mjs` once per chunk. One chunk per process
keeps memory low.

Chunks share state through `$OUT_DIR/state-<width>.json`, so run chunk A first:

- **A:** landing, register, create a group, invites (logged out, ghost, logged in)
- **B:** every split mode, several payers, foreign currency, recurring, large
  amounts, detail and edit, comment, receipt, delete and restore, expense list
- **C:** settle up (record, edit, delete, undo), reminders, activity,
  notification settings, unsubscribe, phone
- **D:** friends and 1:1 ledgers, insights, CSV, group settings, archive, delete,
  leave-blocked, account, sign out, forgot and reset password, 404
- **E:** stress (10 members, IDR 1 billion), keyboard focus, accessible names,
  API 500, back navigation, OS dark mode, loading state

### What every screenshot checks

Each screenshot is also an assertion. It fails on:

- horizontal overflow, measured both as `scrollWidth` and as the captured PNG's
  width,
- an uncaught page error (hydration errors included), or
- a console error.

The exit code is the number of failed checks.

### Tips

- **Run against a production build.** `next build && next start -p 3810` uses
  far less memory than `next dev`. Long runs against the dev server got
  OOM-killed on the VPS.
- **Contact sheets:** `node scripts/qa/sheet.mjs <dir> <out.png> "<regex>" <cols>`
  builds one for visual review.
- **Hunting a specific bug:**
  - `probe-overflow.mjs` names the element that sticks out of the viewport.
  - `probe-hydration.mjs` reloads one page N times and prints any errors. Set
    `BROWSER_TZ` to run the browser in a different zone from the server.
