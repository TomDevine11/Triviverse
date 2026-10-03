-- Social layer: anonymous players, one row per daily result, private leagues,
-- and short-lived device-transfer codes. Game CONTENT never lives here — it
-- stays in the static build (ARCHITECTURE.md). This is player state only.

CREATE TABLE IF NOT EXISTS players (
  id       TEXT PRIMARY KEY,         -- private device id (write credential)
  pub      TEXT NOT NULL UNIQUE,     -- public id, safe to show/share
  name     TEXT NOT NULL DEFAULT '',
  created  INTEGER NOT NULL,
  updated  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  player   TEXT NOT NULL,
  day      INTEGER NOT NULL,         -- local day index the client played on
  game     TEXT NOT NULL,            -- dailyStats key, or 'perfect' for the bonus row
  w        INTEGER NOT NULL DEFAULT 0,
  v        REAL,
  of       INTEGER,
  low      INTEGER NOT NULL DEFAULT 0,
  u        TEXT,
  pts      INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL,
  PRIMARY KEY (player, day, game)
);
CREATE INDEX IF NOT EXISTS results_day_game ON results (day, game);

CREATE TABLE IF NOT EXISTS leagues (
  code     TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  owner    TEXT NOT NULL,
  created  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  league   TEXT NOT NULL,
  player   TEXT NOT NULL,
  joined   INTEGER NOT NULL,
  PRIMARY KEY (league, player)
);
CREATE INDEX IF NOT EXISTS members_player ON members (player);

CREATE TABLE IF NOT EXISTS transfers (
  code     TEXT PRIMARY KEY,
  blob     TEXT NOT NULL,
  created  INTEGER NOT NULL
);
