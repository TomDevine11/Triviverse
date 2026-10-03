-- World leaderboard: a moderation flag (hidden players never appear on the
-- public table — scripts/world-hide.mjs sets it) and an index for the per-day
-- player totals the table and world rank are built from.
ALTER TABLE players ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS results_day_player ON results (day, player);
