#!/usr/bin/env bash
# Deploy FairShare on the Arktik VPS (fairshare.arktik.id).
# Usage: ops/deploy.sh [git-ref]   (default: origin/main)
#
# Steps: fetch -> backup DB -> checkout -> install -> migrate -> build -> restart -> health check.
# The live clone is ~/apps/fairshare; env lives in ~/docker-apps/fairshare-prod/web.env.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/apps/fairshare}"
ENV_FILE="${ENV_FILE:-$HOME/docker-apps/fairshare-prod/web.env}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/docker-apps/fairshare-prod/backups}"
UNIT="${UNIT:-fairshare-web}"
PORT="${PORT:-3600}"
REF="${1:-origin/main}"

export PATH="/usr/bin:/bin:$PATH" DOCKER_HOST="${DOCKER_HOST:-unix:///run/user/1000/docker.sock}"
cd "$APP_DIR"

echo "==> fetch"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  H=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c http.extraHeader="Authorization: Basic $H" fetch -q origin
  unset H
else
  GIT_TERMINAL_PROMPT=0 git fetch -q origin
fi
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse "$REF")
echo "    $OLD -> $NEW"

echo "==> backup database"
mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
F="$BACKUP_DIR/fairshare_prod-$(date +%Y%m%d-%H%M%S)-predeploy.dump"
docker exec fairshare-prod-db pg_dump -U fairshare -Fc fairshare_prod > "$F.tmp" && mv "$F.tmp" "$F"
echo "    $F ($(stat -c %s "$F") bytes)"

echo "==> checkout"
git checkout -q --detach "$NEW"

echo "==> install"
if ! git diff --quiet "$OLD" "$NEW" -- package.json pnpm-lock.yaml; then
  CI=true pnpm install --frozen-lockfile
fi

set -a; . "$ENV_FILE"; set +a

echo "==> migrate"
./node_modules/.bin/prisma generate >/dev/null
./node_modules/.bin/prisma migrate deploy

echo "==> build"
./node_modules/.bin/next build

echo "==> restart"
systemctl --user restart "$UNIT"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" || true)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "    health: $code"
[ "$code" = "200" ] || { echo "Health check failed. Roll back with: ops/deploy.sh $OLD"; exit 1; }
echo "==> deployed $NEW"
