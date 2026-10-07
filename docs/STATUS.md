# Status

Last updated 2026-10-08, after overnight batch 4.

Production (https://fairshare.arktik.id) runs commit `74fb079`, the end of batch 3.
The batch-4 commits are local only. They have not been pushed or deployed.

## Built and working

Unless an item says otherwise, it has been exercised end to end: through the UI by the
Playwright flows, and through the API by the smoke test.

### Accounts and sign-in

- Register, sign in, sign out, change password, forgot password and reset password.
  - Reset links last 1 h.
  - A dead link says so before you type a new password.
- Passkeys:
  - Register one from Account, then sign in with email + passkey.
  - The passkey is verified on the server and exchanged for a one-time ticket.
  - **Not exercised by the automated flows**, because there is no virtual authenticator.
- Google sign-in exists in code. It is **not configured in production** and is untested.
- Account page:
  - Name, default currency, and time zone (defaulted from the browser).
  - Data export (JSON).
  - Delete account, blocked while you have open balances.
- Public pages: landing, `/privacy`, `/terms`.
- Protected pages redirect to sign-in with a safe `callbackUrl`.
- Every group, expense and payment endpoint checks active membership, and participants
  must belong to the group.

### Dashboard

- Totals per currency: what you owe, what you are owed, and net.
- Balance per group.
- "Who pays whom" shortcuts.
- Recent expenses with your share.
- A first-run checklist.

### Groups and people

- Group settings:
  - Create, rename and describe a group.
  - Change the currency, only while the group is empty.
  - Turn simplify debts on or off.
- Archive (read-only) and unarchive.
- Delete: owner only, everyone settled, and you type the group name to confirm.
- Roles are owner, admin and member.
  - Admins invite and remove people.
  - The owner's role cannot be changed.
  - Plain members only see the "Leave" part of the danger zone.
- Invites by email:
  - Re-inviting keeps the same link and extends the expiry.
  - The dialog always shows the link to copy.
  - Logged-out invitees can register or sign in, then come back to the invite.
- Ghost members:
  - Invited people can be put on expenses straight away.
  - When they register with that email, they take over the account and its balance.
- Leaving needs a settled balance, and the last admin cannot leave.
- Friends:
  - `/friends` shows your net balance with each person, across every shared group plus
    the 1:1 ledger.
  - Add a friend by email. They get an invite if they have no account.
  - `/friends/:id` is a 1:1 ledger where you can add an expense, settle up and send a
    reminder.

### Expenses

- Split methods: equal, exact, percentage, shares, and per-item (itemized). There can be
  one or more payers.
- The add form:
  - Shows what is left to assign, and stays disabled until it balances.
  - Ticks everyone in the group by default.
  - Sets the date to today in your local time zone.
  - Guesses the category from the description.
  - Remembers the last group.
- Math is done in integer minor units, so the parts always add up exactly. IDR, JPY and
  KRW are split in whole units.
- Foreign currency:
  - The rate comes from Frankfurter (ECB), with open.er-api.com as a fallback. It is
    cached per day.
  - If both fail, you type a rate. Both amounts are shown.
  - The browser flows use a manual rate. The online lookup is covered by unit tests with
    a mocked `fetch`.
- The detail page shows who paid, each share, items, category, notes, receipt, comments
  and edit history. Timestamps use your saved time zone.
- Full edit, including amount, payers, split and items.
  - Allowed for the creator, any payer, or an admin.
  - Every change is recorded with a field diff.
- Soft delete, with restore for 30 days from the detail page, the list's Undo, or the
  activity feed.
- Receipts:
  - JPEG, PNG or WebP up to 8 MB. HEIC is refused with a hint.
  - Images are resized, EXIF is stripped, and a thumbnail is made.
  - Files are only served to group members.
- Comments: members can comment and delete their own.
- Recurring expenses:
  - Weekly, every 2 weeks, monthly or yearly, with an optional end date.
  - Month-end dates stay correct (Jan 31 → Feb 28 → Mar 31), in the owner's time zone.
  - Pause, resume or stop.
  - Created by the cron job. The smoke test checks this with a faked clock.
- `/expenses`:
  - Search and filters (group, category, date range).
  - "Load more" paging.
  - CSV export.

### Settling up

- Balances per group:
  - Fewest-payments suggestions when simplify is on, or plain pairwise debts when it is
    off.
  - The suggestions always clear every balance exactly.
- Record a full or partial payment, with a method and a note. Edit or delete it, with
  Undo for 30 days.
- `/settlements` and the dashboard show who pays whom across every group.
- Reminders:
  - Sent from a settle-up row.
  - At most once per pair every 24 h.
  - Optional weekly automatic reminders per group.

### Activity, notifications, insights

- Activity feed:
  - Covers every change to expenses, payments, members and groups, plus comments,
    reminders and friends.
  - Appears on `/activity` and on each group page, with "Load more" and inline Undo.
  - Wording: balances say "owe / are owed"; a single expense's effect says
    "lent / borrowed".
- Email notifications (Resend):
  - Each event can be turned on or off. The weekly digest is opt-in.
  - One-click unsubscribe per event, via `List-Unsubscribe` and a signed link.
  - The outbox retries with backoff (5 attempts).
  - Production has Resend configured. On 2026-10-08 the production outbox was empty,
    with two real users.
- **Reserved test domains are never mailed.** These are example.com/net/org and the
  `.test`, `.example`, `.invalid` and `.localhost` domains. Their rows are marked
  `SKIPPED`.
- WhatsApp (WAHA):
  - Built: a number field with country picker, a 6-digit verification code, and
    per-event switches.
  - **Turned off everywhere**, because no WAHA server is configured. The UI says "not
    available", and the number can still be saved.
  - Tested only against a mocked WAHA.
- `/insights`:
  - Your share by month and by category, per currency, with filters.
  - CSS bars with a table fallback.
- CSV exports:
  - Per group: one share column per member, plus payments.
  - All your expenses.
  - Files have a BOM, follow RFC 4180, and are safe against formula injection.

### Platform

- One app shell:
  - Desktop: a top nav and an account menu.
  - Mobile: a bottom tab bar (Home, Groups, Add, Settle up, Activity), with a
    Groups | Friends switch.
  - 404 and error pages are inside the shell.
- Every page is checked for horizontal overflow at 390 px and 1280 px. The stress case
  uses 10 members, IDR 1,000,000,000 and long names.
- Accessibility:
  - Every control has a visible keyboard focus ring.
  - Confirm dialogs use `role="alertdialog"`.
  - Every visible control has an accessible name, and this is checked.
- The light theme stays on when the OS is in dark mode. There is no dark theme.
- Production setup:
  - systemd units and Caddy (`noindex`).
  - Cron every 5 min.
  - A nightly backup of the database and receipts, kept 14 days on the same VPS.
  - See [OPERATIONS](./OPERATIONS.md).

## Verification for this batch (2026-10-08)

| Check | Result |
| --- | --- |
| `pnpm test` | 130 tests in 9 files pass, also with `TZ=America/Los_Angeles` |
| `pnpm typecheck`, `pnpm lint --max-warnings 0`, `next build` | clean |
| `scripts/smoke.py` against `next dev` | 219/219 checks pass |
| `scripts/smoke.py` against `next start` | 214/219. The 5 misses are expected: the phone test code and the faked cron clock are turned off in production mode. |
| Playwright flows at 1280 px | all 5 chunks pass |
| Playwright flows at 390 px | all 5 chunks pass |

How the flows were run:

- Chunk by chunk, against `next start`.
- The final run was a clean full run at both widths (A 24, B 29, C 15, D 35, E 15
  checks per width) on the final build.
- Screenshots from the final run are in `docs/screenshots/`.

## Fixed in this batch

### Mail

- Nothing is ever sent to reserved test domains. This is enforced in `deliverMail()` and
  in the outbox.

### Hydration and time zones

- **`/account` hydration error (React #418).** Two causes, both fixed with hydration-safe
  rendering:
  - The time-zone list depended on the browser's zone during server render.
  - Dates rendered on the server used the server's time zone.
- **Group page hydration error (React #418).** It was intermittent: seen once in the
  1280 run.
  - Probable cause, found by reading the code rather than by reproducing it:
    - Payment dates in settle up were formatted in the server's zone (Asia/Shanghai) on
      the server, and in the browser's zone during hydration. The two disagree for part
      of every day.
    - The reminder cooldown check also compared against "now" during render.
  - Fix: timestamps in client components now go through `<LocalDate>`, which renders UTC
    first and switches to local time after hydration.
  - Verified with a unit test, and by reloading a group page with a payment at 16:30 UTC
    in browsers set to Los Angeles and Jakarta: no errors.
  - Before the fix, the same setup was not re-run, so the original failure was never
    reproduced on demand.
- **Expense detail times** were shown in the server's time zone. They now use the
  viewer's saved time zone.

### Broken behaviour

- **`/insights` hung.** next/link prefetched the CSV route behind the download link. It
  is now a plain download link.
- **Reset password.** An expired or used link now says so up front, instead of failing
  after the user types a new password.
- **`POST /api/groups/:id/join`** accepted an invite token from another group, then
  answered 400. It now checks the token first and does nothing.
- **WhatsApp turned off.** Saving a number returned a 503, which showed up as a console
  error. It now returns 200 with `sent: false` and a message.

### Wording and permissions

- The activity feed said "you get back" and "you owe" about one expense, while the rest of
  the app said "lent / borrowed". It now matches.
- Re-invite wording is clearer, and the group header shows "· N invited".
- Plain members were shown the owner-only "Delete group" row. It is now hidden, and the
  card title matches the role.

### Layout and focus

- A long payer name pushed "pays you" or "you" off the row on the dashboard and in
  settle up.
- Long group names made the dashboard wider than a 390 px screen. Grid columns can now
  shrink (`min-w-0`).
- Keyboard focus was invisible on list-row links and plain text buttons. A global
  `:focus-visible` ring fixes it.

### Cleanup

- Removed the unused `theme-provider.tsx` and `useUserPreferences.ts`. Stale docs were
  rewritten or deleted.
- The test tooling is now in the repo: `scripts/smoke.py` and `scripts/qa/`.

## Known gaps and open issues

- **Not deployed.** Production is missing the batch-4 commits. Deploy with
  `ops/deploy.sh` once they are pushed. No migration is needed.
- **Passkeys** have no automated test, and **Google sign-in** is untested.
- **WhatsApp** has never talked to a real WAHA server.
- **Unused leftovers from the RFC.** There is no dark theme. These are stored but
  unused:
  - the `theme` and `language` preferences
  - the `NotificationTemplate` and `GroupSetting` tables
- **Weekly digest timing** is a rolling 7 days per user, not a fixed weekday or local
  time.
- **Older expenses have no history**, because they predate activity tracking.
- **Backups** stay on the same VPS. There is no off-site copy.
- **Receipts:** no OCR, and only one receipt per expense.
- **No email verification.** Sign-up does not verify the address; the `PENDING` user
  status is unused.
- **Smoke-test data is not cleaned up.** Run the smoke test only against a throwaway
  database.
