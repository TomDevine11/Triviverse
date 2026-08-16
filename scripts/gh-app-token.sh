#!/usr/bin/env bash
# Mint a short-lived GitHub App installation token for the autonomous runner, so it
# authors PRs as triviverse-autobot[bot] — a different identity from Tom, so Tom can
# approve/merge the runner's user-facing PRs.
#
# Env required:
#   APP_ID   GitHub App id (non-secret)
#   APP_PEM  path to the App private-key .pem (SECRET — keep outside the repo)
# Prints ONLY the installation token to stdout. Never logs the key or token.
set -euo pipefail
: "${APP_ID:?set APP_ID}"; : "${APP_PEM:?set APP_PEM to the private-key path}"
now=$(date +%s)
b64() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
header=$(printf '{"alg":"RS256","typ":"JWT"}' | b64)
payload=$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' $((now-60)) $((now+540)) "$APP_ID" | b64)
sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -sign "$APP_PEM" -binary | b64)
jwt="$header.$payload.$sig"
api() { curl -sf -H "Authorization: Bearer $jwt" -H "Accept: application/vnd.github+json" "$@"; }
inst=$(api https://api.github.com/app/installations | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
api -X POST "https://api.github.com/app/installations/$inst/access_tokens" | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])"
