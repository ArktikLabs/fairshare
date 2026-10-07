#!/usr/bin/env bash
# Run every flow chunk at one width, one chunk per process (keeps memory low).
# Usage: WIDTH=390 OUT_DIR=/tmp/qa scripts/qa/run-all.sh
set -u
cd "$(dirname "$0")/../.."
: "${WIDTH:=1280}" "${OUT_DIR:=./qa-out}"
export WIDTH OUT_DIR
mkdir -p "$OUT_DIR"
fails=0
for c in A B C D E; do
  echo "== chunk $c ($WIDTH)"
  timeout "${CHUNK_TIMEOUT:-590}" env CHUNK=$c node scripts/qa/flows.mjs > "$OUT_DIR/chunk-$c-$WIDTH.log" 2>&1
  rc=$?
  grep -E "^FAIL|ok$|/[0-9]+ ok" "$OUT_DIR/chunk-$c-$WIDTH.log" | grep -v "^ok" || true
  [ $rc -ne 0 ] && fails=$((fails + 1))
done
echo "chunks with failures: $fails"
exit $fails
