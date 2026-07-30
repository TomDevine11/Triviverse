/**
 * Triviverse — static web server
 *
 * Serves the prerendered SPA (`npm run build` → dist/) from a single port. It does
 * NOT compute or fetch any football data: all game data is precomputed offline and
 * shipped as static JSON (see ../ARCHITECTURE.md).
 *
 * NOTE: this file previously also ran a StatMuse/Wikipedia/TheSportsDB scraping API
 * (/api/stat, /api/category-stat, …) that validated guesses at runtime. That stack
 * became unreachable once all data moved offline (the app makes zero /api calls) and
 * has been removed. Only static file-serving — the always-live part — remains.
 */

import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Behind Cloudflare/Render's reverse proxy — trust X-Forwarded-* so redirects and
// client-host handling use the real request, not the proxy's.
app.set('trust proxy', 1)

// ── Canonical-domain 301 redirect (opt-in) ───────────────────────
// Sends the old onrender subdomain and the www host to the primary domain so
// links/SEO consolidate on one URL. OFF by default to avoid any outage while the
// custom domain's DNS/SSL is still propagating — enable it in Render only AFTER
// https://triviverse.com is confirmed live, by setting:
//   REDIRECT_TO_CANONICAL=1   (and optionally CANONICAL_HOST, default below)
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'triviverse.com'
if (process.env.REDIRECT_TO_CANONICAL === '1') {
  app.use((req, res, next) => {
    const hostname = (req.headers.host || '').split(':')[0]
    // Never redirect local dev, health checks without a host, or the canonical host itself.
    if (!hostname || hostname === CANONICAL_HOST || hostname === 'localhost' || hostname === '127.0.0.1') return next()
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`)
  })
}

// Serve the built frontend (npm run build → dist/) if it exists, so the whole app
// can be hosted from this single server/port.
const DIST_DIR = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST_DIR)) {
  // index:false so static never auto-serves index.html — the SPA fallback below
  // controls HTML routing and serves the per-route prerendered file. redirect:false
  // avoids 301s that would add trailing slashes (and diverge from canonical URLs).
  app.use(express.static(DIST_DIR, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Hashed build assets are immutable — cache them hard so a chunk fetched
      // once is never re-requested (and can't 404 against a later deploy).
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (filePath.endsWith('.html')) {
        // HTML must always revalidate so a page load references the CURRENT
        // build's chunk hashes, never a stale set from a previous deploy.
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))

  // SPA fallback — serve the prerendered HTML for the requested route (each route
  // has its own dist/<path>/index.html with unique SEO head + crawlable content),
  // falling back to the home shell for anything unrecognised. The (?!\/api) guard
  // is retained so any stray /api/* request 404s (as it always did) rather than
  // being handed the HTML shell.
  const HOME = path.join(DIST_DIR, 'index.html')
  app.get(/^(?!\/api).*/, (req, res) => {
    // A request that reached here with a file extension is a static asset that
    // express.static did NOT find — e.g. a hashed chunk from a previous deploy.
    // Return 404, never the HTML shell: serving text/html for a .js request is
    // exactly what triggers the browser's "expected a JavaScript module" error.
    if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found')

    const clean = req.path.replace(/\/+$/, '').replace(/^\/+/, '')
    res.setHeader('Cache-Control', 'no-cache') // navigations must always get fresh chunk refs
    if (clean) {
      const candidate = path.join(DIST_DIR, clean, 'index.html')
      // guard against path traversal, then serve the prerendered route if present
      if (candidate.startsWith(DIST_DIR + path.sep) && fs.existsSync(candidate)) {
        return res.sendFile(candidate)
      }
    }
    res.sendFile(HOME)
  })
}

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`\nTriviverse server → http://localhost:${PORT}\n`)
})
