#!/usr/bin/env bash
# Records the TikTok app-review demo with DETERMINISTIC window staging.
#
# The plain record-demo.sh captures whichever Space happens to be front, which
# picked up the wrong desktop entirely. This version stages its own screen:
#   - opens a FRESH Terminal window for the demo (so no agent/session scrollback shows)
#   - tiles it left, the Chrome demo window right, both full height
#   - together they cover the display, hiding anything behind them
#
# Usage: record-demo-staged.sh [output.mp4]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FF="$ROOT/node_modules/ffmpeg-static/ffmpeg"
OUT="${1:-$ROOT/output/tiktok-demo/demo.mp4}"
RAW="${OUT%.mp4}-raw.mp4"
LOG="${OUT%.mp4}.log"
DONE="$ROOT/output/tiktok-demo/.demo-done"
mkdir -p "$(dirname "$OUT")"
rm -f "$DONE" "$LOG"

# Logical screen size (points, not Retina pixels).
read -r SW SH < <(osascript -e 'tell application "Finder" to get bounds of window of desktop' \
  | awk -F', ' '{print $3" "$4}')
HALF=$((SW / 2))
TOP=25

echo "▶︎ staging windows on a ${SW}x${SH} display…"
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "clear && cd '$ROOT' && node scripts/publish/demo.mjs --no-open; touch '$DONE'"
  delay 1
  set bounds of front window to {0, $TOP, $HALF, $SH}
end tell
tell application "Google Chrome"
  activate
  set bounds of front window to {$HALF, $TOP, $SW, $SH}
end tell
APPLESCRIPT

echo "▶︎ starting screen capture…"
"$FF" -y -hide_banner -loglevel error \
  -f avfoundation -capture_cursor 1 -framerate 30 -i "1:none" \
  -fps_mode passthrough \
  -vf "scale=1280:-2" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p \
  -movflags +faststart "$RAW" &
REC=$!

# The demo runs in the staged Terminal window; wait for its sentinel.
echo "▶︎ demo running in staged window — waiting…"
for _ in $(seq 1 300); do [ -f "$DONE" ] && break; sleep 1; done
sleep 3   # hold the final frame so the ✅ result is readable

echo "▶︎ stopping capture…"
kill -INT "$REC" 2>/dev/null || true
wait "$REC" 2>/dev/null || true

echo "▶︎ compressing for review upload (<50MB)…"
"$FF" -y -hide_banner -loglevel error -i "$RAW" \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT"
rm -f "$RAW" "$DONE"
echo "video: $OUT ($(ls -lh "$OUT" | awk '{print $5}'))"
