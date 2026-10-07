# Operations

## Configuration

Every variable is read from the environment. [`.env.example`](../.env.example) has the
same list with comments.

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection used by the app |
| `DIRECT_URL` | yes | Direct connection used by migrations (can be the same as `DATABASE_URL`) |
| `AUTH_SECRET` | yes | Auth.js secret. It also signs unsubscribe links, so changing it breaks links in old emails. |
| `AUTH_URL` | yes | Public base URL. Used in invite, reset, unsubscribe and email links. |
| `AUTH_WEBAUTHN_RP_ID` | for passkeys | Bare domain, e.g. `fairshare.arktik.id` |
| `AUTH_WEBAUTHN_RP_ORIGIN` | for passkeys | Full origin, e.g. `https://fairshare.arktik.id` |
| `AUTH_WEBAUTHN_RP_NAME` | no | Name shown by the authenticator (default `FairShare`) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | no | Turn on Google sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Send email through Resend. Without them nothing is sent: outside production the email is printed to stdout, and notification rows are marked `SKIPPED`. |
| `UPLOAD_DIR` | no | Where receipt images go (default `./uploads`). Must be persistent and outside `public/`. |
| `CRON_SECRET` | for background jobs | Bearer token for `POST /api/cron/run`, at least 16 characters. Without it the endpoint always returns 401. |
| `CRON_ALLOW_FAKE_NOW` | no | `1` lets the cron body set `now` in production. For testing only. |
| `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION` | no | Turn on WhatsApp through a WAHA server. The session defaults to `default`. |
| `NOTIFY_DISABLED` | no | `1` turns off dispatch right after each action. The cron `fanout` step still picks the activities up. |
| `FX_OFFLINE` | no | `1` skips online exchange-rate lookups, so users must type a rate |

The app still works without them:

- Without `RESEND_API_KEY`, no email goes out, but the invite dialog still shows a
  link you can copy.
- Without `CRON_SECRET`, notifications are still sent right after each action. Retries,
  digests, recurring expenses and automatic reminders do not run.

Mail to reserved test domains is never sent, whatever the configuration. That
covers `example.com/net/org` and anything under `.test`, `.example`, `.invalid`
or `.localhost`.

## Production (fairshare.arktik.id)

The app runs on the Arktik VPS as user-level systemd units. The files are in
`ops/`.

### Layout

| Thing | Where |
| --- | --- |
| Code | `~/apps/fairshare`, a git clone checked out at a commit (detached) |
| Env | `~/docker-apps/fairshare-prod/web.env` (mode 600) |
| Database | Docker container `fairshare-prod-db` (`ops/db.docker-compose.yml`), Postgres 17, `127.0.0.1:55441`, volume `fairshare-prod-pg` |
| Receipts | `~/docker-apps/fairshare-prod/uploads` |
| Backups | `~/docker-apps/fairshare-prod/backups` |
| Web | `fairshare-web.service`: `next start` on `127.0.0.1:3600` |
| Background jobs | `fairshare-cron.timer` runs every 5 min and calls `/api/cron/run` |
| Backups job | `fairshare-backup.timer`, daily at 03:07 |
| Proxy | Caddy site `ops/fairshare.arktik.id.caddy`: TLS, gzip, security headers, `X-Robots-Tag: noindex` |

### Deploy

```bash
cd ~/apps/fairshare
ops/deploy.sh                 # deploys origin/main
ops/deploy.sh <commit-or-ref> # deploys a specific ref, or rolls back
```

`deploy.sh` runs these steps in order:

1. Fetch.
2. `pg_dump` (a pre-deploy backup).
3. Check out the ref.
4. Run `pnpm install`, but only if the lockfile changed.
5. `prisma migrate deploy`.
6. `next build`.
7. Restart `fairshare-web`.
8. Poll `/api/health` until it returns 200.

If the health check fails, the script prints the rollback command.

Migrations only move forward. Rolling back the code does not undo a migration,
so restore the pre-deploy dump if you need to.

### Day-to-day commands

```bash
systemctl --user status fairshare-web fairshare-cron.timer fairshare-backup.timer
journalctl --user -u fairshare-web -f          # app log
journalctl --user -u fairshare-cron --since -1h
curl -s https://fairshare.arktik.id/api/health
```

### Backups

`fairshare-backup.service` runs nightly. Each run:

- writes a `pg_dump -Fc` of `fairshare_prod`, and
- writes a `tar.gz` of `uploads/`.

Copies older than 14 days are deleted. The backups stay on the same VPS: there
is no off-site copy yet.

To restore:

```bash
docker exec -i fairshare-prod-db pg_restore -U fairshare -d fairshare_prod --clean --if-exists < backups/fairshare_prod-YYYYMMDD-HHMM.dump
tar -C ~/docker-apps/fairshare-prod -xzf backups/uploads-YYYYMMDD-HHMM.tar.gz
```

### Cron by hand

```bash
set -a; . ~/docker-apps/fairshare-prod/web.env; set +a
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"only":["outbox"]}' http://127.0.0.1:3600/api/cron/run
```

The steps are `recurring`, `reminders`, `digests`, `fanout` and `outbox`.

### Notification outbox

Rows in `Notification` move through `PENDING → SENDING → SENT`. A row can also
end in one of these states:

- `FAILED`: gave up after 5 attempts.
- `SKIPPED`: the address was at a reserved domain, or the channel (email or
  WhatsApp) was not configured.

When a user has turned off an event, no row is written at all.

`lastError` says why. To look at the queue:

```sql
select channel, status, count(*) from "Notification" group by 1, 2;
select id, event, attempts, "lastError" from "Notification" where status in ('FAILED','SKIPPED') order by "createdAt" desc limit 20;
```

## Local development database

`docker compose -f ops/db.docker-compose.yml` defines the production database.
For development, any Postgres works. Point `DATABASE_URL` and `DIRECT_URL` at it
and run `pnpm db:deploy`.
