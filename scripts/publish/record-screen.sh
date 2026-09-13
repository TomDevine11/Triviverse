#!/usr/bin/env bash
# Real-time screen recorder for the TikTok app-review demo.
# Usage: record-screen.sh <output.mp4> <seconds>
# Stops with SIGINT so ffmpeg finalises the moov atom (a SIGKILL leaves an unplayable file).
set -euo pipefail

OUT="${1:?output path required}"
SECS="${2:-60}"
FF="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/node_modules/ffmpeg-static/ffmpeg"

# -fps_mode passthrough: avfoundation hands us wall-clock PTS; without this ffmpeg
# duplicates one frame tens of thousands of times instead of recording in real time.
"$FF" -y -hide_banner -loglevel warning \
  -f avfoundation -capture_cursor 1 -framerate 30 -i "1:none" \
  -fps_mode passthrough \
  -vf "scale=1280:-2" -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p \
  -movflags +faststart "$OUT" &
PID=$!

sleep "$SECS"
kill -INT "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
echo "recorded: $OUT"
