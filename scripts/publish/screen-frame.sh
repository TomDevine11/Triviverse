#!/usr/bin/env bash
# Single frame of the real screen — the only honest check of what a recording will film.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$ROOT/node_modules/ffmpeg-static/ffmpeg" -y -hide_banner -loglevel error \
  -f avfoundation -capture_cursor 1 -framerate 30 -i "1:none" \
  -frames:v 1 -vf "scale=1100:-2" "${1:?out path}" 2>/dev/null || true
