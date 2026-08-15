// Club crest lookup. Callers pass the club name they display; we resolve it to a
// Transfermarkt id and return TM's deterministic crest URL (see clubBadges.js /
// scripts/build-badges.mjs). Returns null when the name doesn't resolve — the
// <Crest> component then falls back to a monogram, so the tail degrades cleanly.
import { clubBadgeUrl, BADGES_AS_OF } from './clubBadges'

export const CRESTS_AS_OF = BADGES_AS_OF

export function crestUrl(clubName) {
  return clubBadgeUrl(clubName)
}
