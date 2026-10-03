-- Short share links: /c/<code> → a challenge payload (same payload as /s/…?c=).
-- Codes are derived from a hash of the payload, so re-sharing the same result
-- reuses the same link.
CREATE TABLE IF NOT EXISTS links (
  code     TEXT PRIMARY KEY,
  payload  TEXT NOT NULL,
  created  INTEGER NOT NULL
);
