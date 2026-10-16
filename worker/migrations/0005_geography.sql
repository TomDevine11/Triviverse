-- Triviverse Geography's own competition tables: the same shapes as football's
-- (results, daily_totals, score_counts, leagues, members) so worker/api.js runs
-- both sections through one set of handlers, but kept apart so geography points
-- never land in a football league (or the reverse). Players and nicknames are
-- shared: one identity across Triviverse.

CREATE TABLE IF NOT EXISTS geo_results (
  player   TEXT NOT NULL,
  day      INTEGER NOT NULL,
  game     TEXT NOT NULL,            -- geography game id, or 'perfect' for the bonus row
  w        INTEGER NOT NULL DEFAULT 0,
  v        REAL,
  of       INTEGER,
  low      INTEGER NOT NULL DEFAULT 0,
  u        TEXT,
  pts      INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL,
  PRIMARY KEY (player, day, game)
);

CREATE TABLE IF NOT EXISTS geo_daily_totals (
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
CREATE INDEX IF NOT EXISTS geo_daily_totals_rank ON geo_daily_totals (day, eligible, pts);

CREATE TABLE IF NOT EXISTS geo_world_all (
  player   TEXT PRIMARY KEY,
  pts      INTEGER NOT NULL DEFAULT 0,
  played   INTEGER NOT NULL DEFAULT 0,
  wins     INTEGER NOT NULL DEFAULT 0,
  perfect  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS geo_score_counts (
  day   INTEGER NOT NULL,
  game  TEXT NOT NULL,
  w     INTEGER NOT NULL,
  vkey  REAL NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, game, w, vkey)
);

CREATE TABLE IF NOT EXISTS geo_leagues (
  code     TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  owner    TEXT NOT NULL,
  created  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_members (
  league   TEXT NOT NULL,
  player   TEXT NOT NULL,
  joined   INTEGER NOT NULL,
  PRIMARY KEY (league, player)
);
CREATE INDEX IF NOT EXISTS geo_members_player ON geo_members (player);
