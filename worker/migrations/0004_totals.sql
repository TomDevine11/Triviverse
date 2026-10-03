-- Running totals so reads stay small as the results table grows (free-tier D1
-- bills rows read/written per day). Every result write keeps these in step
-- (worker/api.js → refreshTotals / bumpScore); the backfill below seeds them.

-- One row per player per day. `eligible` = 0 for a scripted-looking day (6+
-- dailies inside two minutes): it still counts in private leagues, never on
-- the world table.
CREATE TABLE IF NOT EXISTS daily_totals (
  player   TEXT NOT NULL,
  day      INTEGER NOT NULL,
  pts      INTEGER NOT NULL DEFAULT 0,
  played   INTEGER NOT NULL DEFAULT 0,
  wins     INTEGER NOT NULL DEFAULT 0,
  perfect  INTEGER NOT NULL DEFAULT 0,
  first    INTEGER,
  last     INTEGER,
  eligible INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (player, day)
);
CREATE INDEX IF NOT EXISTS daily_totals_rank ON daily_totals (day, eligible, pts);

-- All-time world totals (eligible days only), one row per player.
CREATE TABLE IF NOT EXISTS world_all (
  player   TEXT PRIMARY KEY,
  pts      INTEGER NOT NULL DEFAULT 0,
  played   INTEGER NOT NULL DEFAULT 0,
  wins     INTEGER NOT NULL DEFAULT 0,
  perfect  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS world_all_rank ON world_all (pts);

-- How many players got each result, per daily (the percentile). vkey = v, or
-- -1 when the result has no score yet.
CREATE TABLE IF NOT EXISTS score_counts (
  day   INTEGER NOT NULL,
  game  TEXT NOT NULL,
  w     INTEGER NOT NULL,
  vkey  REAL NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, game, w, vkey)
);

-- Superseded by daily_totals (each index costs a written row per result).
DROP INDEX IF EXISTS results_day_player;

-- Backfill from existing results.
INSERT OR REPLACE INTO daily_totals (player, day, pts, played, wins, perfect, first, last, eligible)
  SELECT player, day, SUM(pts),
    SUM(CASE WHEN game != 'perfect' THEN 1 ELSE 0 END),
    SUM(CASE WHEN game != 'perfect' THEN w ELSE 0 END),
    SUM(CASE WHEN game = 'perfect' THEN 1 ELSE 0 END),
    MIN(created), MAX(created), 1
  FROM results GROUP BY player, day;
UPDATE daily_totals SET eligible = 0 WHERE played >= 6 AND last - first < 120000;
INSERT OR REPLACE INTO world_all (player, pts, played, wins, perfect)
  SELECT player, SUM(pts), SUM(played), SUM(wins), SUM(perfect) FROM daily_totals WHERE eligible = 1 GROUP BY player;
INSERT OR REPLACE INTO score_counts (day, game, w, vkey, n)
  SELECT day, game, w, COALESCE(v, -1), COUNT(*) FROM results WHERE game != 'perfect' GROUP BY day, game, w, COALESCE(v, -1);
