#!/usr/bin/env node
// Smoke test for the social Worker (API + share pages + share images).
//
//   npm run social-smoke                         (local: wrangler dev on :8787)
//   npm run social-smoke -- https://triviverse.com   (after a deploy)
//
// Creates two throwaway players, posts results, runs a league round-trip,
// makes a short link and fetches every generated image. Exits non-zero on any
// failure. Against production it leaves a tiny "smoke-test" league behind and
// removes it again (both players leave).

const BASE = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '')
const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
const now = new Date()
const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
let failed = 0

async function check(name, fn) {
  try { const extra = await fn(); console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ''}`) } catch (e) { failed++; console.log(`  ✗ ${name}: ${e.message}`) }
}
const post = (p, body) => fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, json: await r.json().catch(() => null) }))
const get = (p) => fetch(BASE + p, { redirect: 'manual' })
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }

const a = { player: rid(), pub: rid().slice(0, 12), name: 'Smoke A' }
const b = { player: rid(), pub: rid().slice(0, 12), name: 'Smoke B' }
let code, link

console.log(`Social smoke test → ${BASE}`)
await check('POST /api/results (A)', async () => {
  const r = await post('/api/results', { ...a, day, game: 'tenable', w: false, v: 6, of: 10, p: 10 })
  assert(r.status === 200 && r.json?.ok, `status ${r.status} ${JSON.stringify(r.json)}`)
})
await check('POST /api/results (B) returns a percentile', async () => {
  const r = await post('/api/results', { ...b, day, game: 'tenable', w: true, v: 10, of: 10, p: 25 })
  assert(r.json?.pc != null, JSON.stringify(r.json))
  return `beat ${r.json.pc}% of ${r.json.others}`
})
await check('GET /api/today', async () => {
  const j = await (await get(`/api/today?day=${day}`)).json()
  assert(j.players >= 2, JSON.stringify(j))
  return `${j.players} players`
})
await check('GET /api/dist', async () => {
  const j = await (await get(`/api/dist?day=${day}&game=tenable`)).json()
  assert(j.total >= 2, JSON.stringify(j))
})
await check('league create + join + table', async () => {
  const c = await post('/api/leagues', { ...a, leagueName: 'Smoke test' })
  assert(c.json?.code, JSON.stringify(c.json))
  code = c.json.code
  const j = await post(`/api/leagues/${code}/join`, b)
  assert(j.json?.joined, JSON.stringify(j.json))
  const t = await (await get(`/api/leagues/${code}?player=${a.player}&day=${day}`)).json()
  assert(t.week?.length === 2 && t.week[0].name === 'Smoke B', JSON.stringify(t.week))
  assert(!JSON.stringify(t).includes(a.player), 'private id leaked in league response')
  return code
})
await check('rejects a replayed public id', async () => {
  const r = await post('/api/results', { player: rid(), pub: a.pub, name: 'Imposter', day, game: 'wordle', w: true, v: 1, of: 6, p: 25 })
  assert(r.status === 403, `status ${r.status}`)
})
await check('short link', async () => {
  const payload = Buffer.from(JSON.stringify({ k: 'g', i: a.pub, n: 'Smoke', m: 1, g: 'wordle', r: [1, 3, 6, 1, ''] })).toString('base64url')
  const r = await post('/api/links', { c: payload })
  assert(r.json?.code, JSON.stringify(r.json))
  link = { code: r.json.code, payload }
  const again = await post('/api/links', { c: payload })
  assert(again.json?.code === link.code, 'same payload should give the same code')
  const page = await (await get(`/c/${link.code}`)).text()
  assert(page.includes('og:image') && page.includes('/wordle?c='), 'share page missing tags')
})
for (const [name, path] of [['game image', () => `/og/g.png?c=${link.payload}`], ['league image', () => `/og/l/${code}.png`]]) {
  await check(name, async () => {
    const r = await get(path())
    assert(r.status === 200 && r.headers.get('content-type') === 'image/png', `status ${r.status} ${r.headers.get('content-type')}`)
    return `${(await r.arrayBuffer()).byteLength} bytes`
  })
}
await check('app shell for /me and /leagues', async () => {
  for (const p of ['/me', `/leagues/${code}`]) {
    const r = await get(p)
    assert(r.status === 200, `${p} → ${r.status}`)
  }
})
await check('cleanup', async () => {
  await post(`/api/leagues/${code}/leave`, b)
  await post(`/api/leagues/${code}/leave`, a)
  const r = await get(`/api/leagues/${code}/peek`)
  assert(r.status === 404, 'league should be gone')
})

console.log(failed ? `\n${failed} check(s) failed` : '\nAll social checks passed')
process.exit(failed ? 1 : 0)
