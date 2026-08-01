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
import { readFileSync, appendFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WEIGHTS, GATES, RECOG_MIN } from './config.mjs'
import { schedule } from './scheduler.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREFS = path.join(__dirname, 'preferences.jsonl')
const POOL = path.join(__dirname, 'out', 'pool.json')
const REGISTRY = path.join(__dirname, 'registry.json')
const HTML = path.join(__dirname, 'workbench.html')
const PORT = process.env.PORT || 4501
const readRegistry = () => existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : { pins: {}, vetoes: [] }

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
  if (req.method === 'GET' && url === '/schedule') {
    if (!existsSync(POOL)) return send(res, 404, 'application/json', JSON.stringify({ error: 'run pool.mjs first' }))
    const q = new URLSearchParams((req.url.split('?')[1] || ''))
    const candidates = JSON.parse(readFileSync(POOL, 'utf8')).candidates
    const result = schedule({ candidates, days: +(q.get('days') || 90), seed: +(q.get('seed') || 1), startDate: q.get('start') || '2026-08-01', registry: readRegistry() })
    return send(res, 200, 'application/json', JSON.stringify(result))
  }
  if (req.method === 'POST' && url === '/registry') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      try {
        const { action, date, questionId } = JSON.parse(body)
        const reg = readRegistry(); reg.pins = reg.pins || {}; reg.vetoes = reg.vetoes || []
        if (action === 'pin' && date && questionId) reg.pins[date] = questionId
        else if (action === 'unpin' && date) delete reg.pins[date]
        else if (action === 'veto' && questionId) { if (!reg.vetoes.includes(questionId)) reg.vetoes.push(questionId) }
        else if (action === 'unveto' && questionId) reg.vetoes = reg.vetoes.filter((v) => v !== questionId)
        else return send(res, 400, 'application/json', JSON.stringify({ error: 'bad action' }))
        writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + '\n')
        send(res, 200, 'application/json', JSON.stringify({ ok: true, registry: reg }))
      } catch { send(res, 400, 'application/json', JSON.stringify({ error: 'invalid json' })) }
    })
    return
  }
  if (req.method === 'GET' && url === '/preferences') return send(res, 200, 'application/json', JSON.stringify(readPrefs()))
  if (req.method === 'GET' && url === '/export') { res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': 'attachment; filename="preferences.jsonl"' }); return res.end(existsSync(PREFS) ? readFileSync(PREFS) : '') }
  if (req.method === 'POST' && url === '/vote') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', () => {
      try {
        const v = JSON.parse(body)
        const pair = v.a && v.b && ['a', 'b', 'skip'].includes(v.winner)
        const rate = v.kind === 'rate' && v.candidate && ['yes', 'no', 'skip'].includes(v.verdict)
        if (!pair && !rate) return send(res, 400, 'application/json', JSON.stringify({ error: 'bad vote' }))
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
