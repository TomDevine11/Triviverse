// Cloudflare Worker in front of the static build. Static assets are still served
// straight from dist/ by the platform; this script only runs for the paths
// listed in wrangler.jsonc `assets.run_worker_first`:
//
//   /api/*          social API (D1)                     → api.js
//   /s/*, /c/*      share pages (OG tags + redirect)    → og.js
//   /og/g.png etc.  share images                        → og.js
//   /me, /leagues…, /world  app-only routes (not prerendered) → the SPA shell
//
// Local: `npm run dev:social` (vite on :5173 proxying to `wrangler dev` on :8787).

import { handleApi, lookupLink } from './api.js'
import { handleOg, handleShare, handleShortLink } from './og.js'

// App routes that exist only client-side. They are noindex app screens, so
// they get a bare SPA shell rather than a prerendered page.
const APP_ROUTE = /^\/(me|leagues|world)(\/.*)?$/

async function lookupLeague(env, code) {
  if (!env.DB) return null
  return env.DB.prepare(`SELECT l.code, l.name, (SELECT COUNT(*) FROM members m WHERE m.league = l.code) AS members FROM leagues l WHERE l.code = ?`).bind(code).first()
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const p = url.pathname
    if (p.startsWith('/api/')) return handleApi(request, env)
    if (p.startsWith('/s/')) return handleShare(request, env, (c) => lookupLeague(env, c))
    if (p.startsWith('/c/')) return handleShortLink(request, (c) => lookupLink(env, c))
    if (p.startsWith('/og/') && p.endsWith('.png') && (p.startsWith('/og/g') || p.startsWith('/og/d') || p.startsWith('/og/l/'))) {
      return handleOg(request, env, ctx, (c) => lookupLeague(env, c))
    }
    if (APP_ROUTE.test(p)) {
      const shell = await env.ASSETS.fetch(new Request(new URL('/app-shell', url), request))
      if (shell.ok) {
        return new Response(shell.body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-robots-tag': 'noindex' } })
      }
    }
    return env.ASSETS.fetch(request)
  },
}
