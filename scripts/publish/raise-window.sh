#!/usr/bin/env bash
# Raise the DEDICATED studio window: the Chrome window holding exactly one tab that
# points at the studio. Matching on URL alone is not enough — stale /callback tabs
# from earlier OAuth round-trips live in the main window and match first, which puts
# a browser full of personal tabs (and an old error page) on camera.
set -euo pipefail
MATCH="${1:?url fragment required}"
osascript <<APPLESCRIPT
tell application "Google Chrome"
  -- clear stale OAuth callback tabs so they cannot match or linger on screen
  repeat with w in windows
    set k to (count of tabs of w)
    repeat with i from k to 1 by -1
      if (URL of tab i of w contains "8787/callback") and (count of tabs of w) > 1 then
        close tab i of w
      end if
    end repeat
  end repeat

  set found to false
  repeat with w in windows
    if (count of tabs of w) is 1 and (URL of tab 1 of w contains "$MATCH") and (found is false) then
      set index of w to 1
      set bounds of w to {0, 25, 1470, 956}
      set found to true
    end if
  end repeat
  if found then activate
  return found
end tell
APPLESCRIPT
