#!/usr/bin/env bash
# Records the TikTok app-review demo end-to-end.
#   1. starts a real-time screen capture
#   2. runs the self-narrating demo (OAuth -> creator_info -> SELF_ONLY Direct Post)
#   3. stops the capture cleanly and compresses to TikTok's <50MB review limit
#
# Usage: record-demo.sh [output.mp4]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FF="$ROOT/node_modules/ffmpeg-static/ffmpeg"
OUT="${1:-$ROOT/output/tiktok-demo/demo.mp4}"
RAW="${OUT%.mp4}-raw.mp4"
LOG="${OUT%.mp4}.log"
mkdir -p "$(dirname "$OUT")"

echo "▶︎ starting screen capture…"
"$FF" -y -hide_banner -loglevel error \
  -f avfoundation -capture_cursor 1 -framerate 30 -i "1:none" \
  -fps_mode passthrough \
  -vf "scale=1280:-2" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p \
  -movflags +faststart "$RAW" &
REC=$!
sleep 2   # let the capture settle before the demo paints the screen

echo "▶︎ running demo…"
( cd "$ROOT" && node scripts/publish/demo.mjs --no-open ) 2>&1 | tee "$LOG"
DEMO_RC=${PIPESTATUS[0]}

sleep 3   # hold the final frame so the ✅ result is readable in the video
echo "▶︎ stopping capture…"
kill -INT "$REC" 2>/dev/null || true
wait "$REC" 2>/dev/null || true

echo "▶︎ compressing for review upload (<50MB)…"
"$FF" -y -hide_banner -loglevel error -i "$RAW" \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT"
rm -f "$RAW"

SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo ""
echo "demo exit code : $DEMO_RC"
echo "video          : $OUT  ($SIZE)"
exit "$DEMO_RC"
