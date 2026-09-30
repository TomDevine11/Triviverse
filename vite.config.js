import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

// X-Forwarded-Host: the Worker builds redirect/og:image URLs from X-Forwarded-Host, so links
// made through the dev proxy point back at Vite (:5173), not at wrangler (:8787).
const WORKER = {
  target: 'http://127.0.0.1:8787',
  configure: (proxy) => proxy.on('proxyReq', (req, incoming) => req.setHeader('x-forwarded-host', incoming.headers.host || '')),
}
export default defineConfig({
  plugins: [react()],
  server: {
    // The social layer's Worker (`wrangler dev`, see scripts/dev-social.mjs):
    // API, share pages and generated share images. Static /og/*.png stay local.
    proxy: {
      '/api': WORKER,
      '/s/': WORKER,
      '/c/': WORKER,
      '/og/g.png': WORKER,
      '/og/d.png': WORKER,
      '/og/l/': WORKER,
    },
  },
  // The canonical data-integrity tests iterate large generated datasets and can exceed
  // vitest's default 5s timeout on slower CI runners — give them headroom so CI isn't flaky.
  test: {
    // Vitest owns test/**/*.test.js only. Playwright's specs live in e2e/ and use
    // a different runner — without this include they'd be collected here and fail.
    include: ['test/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
