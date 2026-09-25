import { defineConfig, devices } from '@playwright/test'

// End-to-end render checks. These exist to catch the one class of failure the
// rest of the gate is blind to: a route that returns HTTP 200 and serves the
// WRONG thing, or a game that mounts and immediately throws.
//
// Unit tests (vitest, test/**) cover game logic and canonical data. seo-validate
// covers dist/ metadata. Neither opens a page, so on 2026-09-13 the privacy and
// terms routes shipped serving the home shell on a 200 and the Pointless archive
// shipped rendering ten identical labels — both green all the way through.
//
// Runs against the real Express server (server/index.js) over the real build, so
// the SPA fallback behaves exactly as it does in production.
const PORT = 3002

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    // Functional checks — status, headings, routing, accessibility. Run in CI.
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /visual\.spec\.js/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /visual\.spec\.js/ },

    // Visual regression — LOCAL ONLY, and deliberately not part of the CI gate.
    //
    // Playwright screenshots are platform-specific: font rasterisation and
    // antialiasing differ enough between macOS and the ubuntu runner that a
    // darwin baseline always fails on linux. Generating linux baselines needs
    // Docker, which is not available here, and loosening the threshold far
    // enough to span both would also hide the regressions these exist to catch.
    //
    // So they run on the machine that has the baselines — `npm run test:visual`
    // — and CI keeps gating on the functional suite. Their job is to let Claude
    // SEE the UI it changed (CLAUDE.md, "Design work"), which works locally.
    { name: 'visual', testMatch: /visual\.spec\.js/, use: { ...devices['Desktop Chrome'] } },
    { name: 'visual-mobile', testMatch: /visual\.spec\.js/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node server/index.js',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
