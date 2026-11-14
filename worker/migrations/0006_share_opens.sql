-- Share-link opens, counted server-side (not blockable by ad blockers).
-- One row per UTC day × kind:
--   league     /s/league/<code>  (league invite)
--   challenge  /s/<game>?c=…     (long challenge link)
--   short      /c/<code>         (short challenge link)
-- `human`   = a person followed the link (browser request).
-- `preview` = a chat app fetched it to build a link preview (WhatsApp, Teams,
--             iMessage, Slack…): a strong sign the link was pasted somewhere.
CREATE TABLE IF NOT EXISTS share_opens (
  day      TEXT NOT NULL,
  kind     TEXT NOT NULL,
  human    INTEGER NOT NULL DEFAULT 0,
  preview  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);
