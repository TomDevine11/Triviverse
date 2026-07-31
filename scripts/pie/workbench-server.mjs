#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// CALIBRATION WORKBENCH — local dev server.
//
// Serves the workbench SPA and persists your editorial preferences to an
// APPEND-ONLY file (scripts/pie/preferences.jsonl) — the durable preference
// dataset. The compiler never writes it; this server only appends.
//
//   node scripts/pie/pool.mjs                 # build the candidate pool first
//   node scripts/pie/workbench-server.mjs     # then open http://localhost:4501
//
// This is a local editorial tool. It is NOT telemetry (no player data, no game
// integration) and it never touches the live game.
// ─────────────────────────────────────────────────────────────────────────

import http from 'node:http'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WEIGHTS, GATES, RECOG_MIN } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREFS = path.join(__dirname, 'preferences.jsonl')
const POOL = path.join(__dirname, 'out', 'pool.json')
const HTML = path.join(__dirname, 'workbench.html')
const PORT = process.env.PORT || 4501

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body) }
const readPrefs = () => existsSync(PREFS) ? readFileSync(PREFS, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0]
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    if (!existsSync(HTML)) return send(res, 500, 'text/plain', 'workbench.html missing')
    return send(res, 200, 'text/html; charset=utf-8', readFileSync(HTML))
  }
  if (req.method === 'GET' && url === '/pool') {
    if (!existsSync(POOL)) return send(res, 404, 'application/json', JSON.stringify({ error: 'run `node scripts/pie/pool.mjs` first' }))
    return send(res, 200, 'application/json', readFileSync(POOL))
  }
  if (req.method === 'GET' && url === '/config') return send(res, 200, 'application/json', JSON.stringify({ WEIGHTS, GATES, RECOG_MIN }))
  if (req.method === 'GET' && url === '/preferences') return send(res, 200, 'application/json', JSON.stringify(readPrefs()))
  if (req.method === 'GET' && url === '/export') { res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': 'attachment; filename="preferences.jsonl"' }); return res.end(existsSync(PREFS) ? readFileSync(PREFS) : '') }
  if (req.method === 'POST' && url === '/vote') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', () => {
      try {
        const v = JSON.parse(body)
        if (!v.a || !v.b || !['a', 'b', 'skip'].includes(v.winner)) return send(res, 400, 'application/json', JSON.stringify({ error: 'bad vote' }))
        v.ts = new Date().toISOString()
        appendFileSync(PREFS, JSON.stringify(v) + '\n')  // APPEND ONLY
        send(res, 200, 'application/json', JSON.stringify({ ok: true, total: readPrefs().length }))
      } catch { send(res, 400, 'application/json', JSON.stringify({ error: 'invalid json' })) }
    })
    return
  }
  send(res, 404, 'text/plain', 'not found')
})

server.listen(PORT, () => {
  const n = readPrefs().length
  console.error(`\n  Calibration workbench → http://localhost:${PORT}`)
  console.error(`  preferences file: ${path.relative(process.cwd(), PREFS)} (${n} recorded)\n`)
})
