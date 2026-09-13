#!/bin/zsh
# Wrapper launchd calls every 15 min: run the TikTok publisher for any DUE queue items.
# launchd has a minimal PATH, so we source the login profile to find node (incl. nvm).
source "$HOME/.zprofile" 2>/dev/null
source "$HOME/.zshrc" 2>/dev/null
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO" || exit 1
mkdir -p output/shorts
echo "── $(date '+%Y-%m-%d %H:%M:%S') ──" >> output/shorts/_publisher.log
node scripts/publish/publish.mjs >> output/shorts/_publisher.log 2>&1
