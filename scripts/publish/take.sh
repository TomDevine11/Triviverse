#!/usr/bin/env bash
# One uninterrupted app-review take. Runs start-to-finish without further tool calls,
# because every previous failure came from something else stealing the screen mid-shot.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FF="$ROOT/node_modules/ffmpeg-static/ffmpeg"
RAW="$ROOT/output/tiktok-demo/take-raw.mp4"
OUT="$ROOT/output/tiktok-demo/tiktok-app-review-demo.mp4"
mkdir -p "$(dirname "$RAW")"

osascript -e 'tell application "System Events" to set visible of process "Terminal" to false' >/dev/null 2>&1

osascript >/dev/null 2>&1 <<'AS'
tell application "Google Chrome"
  repeat with w in windows
    if (count of tabs of w) is 1 and (URL of tab 1 of w contains "8787") then
      set index of w to 1
      set bounds of w to {0, 25, 1470, 956}
      set URL of tab 1 of w to "https://triviverse.com"
      exit repeat
    end if
  end repeat
  activate
end tell
AS
sleep 5

"$FF" -y -hide_banner -loglevel error \
  -f avfoundation -capture_cursor 1 -framerate 30 -i "1:none" \
  -fps_mode passthrough -vf "scale=1280:-2" -c:v libx264 -preset veryfast -crf 24 \
  -pix_fmt yuv420p -movflags +faststart "$RAW" &
REC=$!
sleep 7   # hold on triviverse.com so the reviewer sees the product + domain

osascript >/dev/null 2>&1 <<'AS'
tell application "Google Chrome"
  repeat with w in windows
    if (count of tabs of w) is 1 and (URL of tab 1 of w contains "triviverse.com") then
      set URL of tab 1 of w to "http://127.0.0.1:8787/?demo=1"
      exit repeat
    end if
  end repeat
end tell
AS

# wait for the self-driving demo to reach a terminal state
for _ in $(seq 1 90); do
  ST=$(curl -s http://127.0.0.1:8787/api/last-job | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
  [ "$ST" = "PUBLISH_COMPLETE" ] && break
  case "$ST" in *FAIL*) break;; esac
  sleep 2
done
sleep 5   # let the success state sit on screen

kill -INT "$REC" 2>/dev/null || true
wait "$REC" 2>/dev/null || true

"$FF" -y -hide_banner -loglevel error -i "$RAW" \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT"
rm -f "$RAW"

osascript -e 'tell application "System Events" to set visible of process "Terminal" to true' >/dev/null 2>&1
echo "final status: ${ST:-unknown}"
echo "video: $OUT ($(ls -lh "$OUT" | awk '{print $5}'))"
