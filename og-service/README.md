> **Superseded 2026-09-30** by the Worker in `worker/og.js` (share pages + images on
> triviverse.com itself — see `docs/social.md`). Kept until the social layer ships; then delete.

# Triviverse OG share service

A tiny, standalone service that turns a game result into an **unfurling link
preview**. It's separate from the main app (which stays on Render) — this only
renders share-card images and redirects clicks into the game.

- `GET /s/:game?r=<packed>` — HTML with Open Graph tags (crawlers unfurl the
  image) + a redirect into the game (humans land on the gamemode). `noindex`.
- `GET /og?r=<packed>` — renders the result as a 1200×630 PNG (`next/og` +
  Satori). Fonts are fetched from Google Fonts as TTF and cached.

`<packed>` is produced by the app's `src/utils/shareUrl.js` (`encodeCard`) — the
whole fixture card lives in the URL, so there's **no database and no storage**.

## Deploy to Vercel (free)

1. Push this repo to GitHub (already done — `TomDevine11/football501`).
2. In Vercel: **Add New… → Project → import `football501`**.
3. Set **Root Directory** to `og-service`. Framework preset auto-detects
   **Next.js**. Leave build/output defaults. **Deploy.**
4. You now have a URL like `https://triviverse-og.vercel.app`. Test it:
   `https://triviverse-og.vercel.app/og?r=<any packed value from a share link>`

That's enough to go live. To use it, set `VITE_OG_HOST` on the **Render** app
(see below) to this Vercel URL and redeploy.

## Optional: branded subdomain (share.triviverse.com)

Nicer share links, and your main domain stays untouched (you only *add* a
subdomain — the apex `triviverse.com` → Render is not changed):

1. Vercel → this project → **Settings → Domains → Add** `share.triviverse.com`.
   Vercel shows a **CNAME target** (e.g. `cname.vercel-dns.com`).
2. In **Porkbun** DNS for `triviverse.com`, **add one record**:
   `Type: CNAME`, `Host: share`, `Answer: cname.vercel-dns.com` (whatever Vercel
   gave). Save. (Do **not** touch the existing `triviverse.com` / `www` records.)
3. Wait for it to verify in Vercel (usually minutes). SSL is automatic.

## Turn it on in the app (Render)

Set the env var on the **main app** (Render → Environment):

```
VITE_OG_HOST = https://share.triviverse.com     # or the *.vercel.app URL
```

Redeploy the Render app. `buildShareUrl` now emits `…/s/<game>?r=…` links that
unfurl into the result. Without `VITE_OG_HOST`, sharing falls back to the old
image/link behaviour, so this is safe to ship before the service exists.

## Local dev

```
cd og-service && npm install && npm run dev
# http://localhost:3000/og?r=<packed>
```
