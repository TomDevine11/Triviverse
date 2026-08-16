#!/usr/bin/env node
// Autonomous-system dashboard generator. Reads the local runner journal + BACKLOG.md +
// live GitHub PRs and writes ONE self-contained HTML file (no external calls) answering, in
// 30 seconds: what is Claude doing, why, what has it done, what needs me, what's next, is
// anything broken. This is the live OPERATIONAL view; the weekly State of Triviverse is the
// strategic view. Output: $DASHBOARD_OUT or ~/.triviverse/dashboard.html
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'

const HOME = process.env.HOME
const STATE = process.env.STATE_DIR || join(HOME, '.triviverse', 'state')
const OUT = process.env.DASHBOARD_OUT || join(HOME, '.triviverse', 'dashboard.html')
const REPO = process.env.REPO_DIR || process.cwd()

const readJSON = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
const readJSONL = (p, n) => { try { return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).slice(-n) } catch { return [] } }
const gh = (a, d) => { try { return JSON.parse(execSync(`gh ${a}`, { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] }).toString()) } catch { return d } }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const ago = (ts) => { if (!ts) return ''; const m = Math.round((Date.now() - new Date(ts)) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago` }
const when = (ts) => ts ? new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

const status = readJSON(join(STATE, 'status.json'), { state: 'idle' })
const activity = readJSONL(join(STATE, 'activity.jsonl'), 60).reverse()
const decisions = readJSONL(join(STATE, 'decisions.jsonl'), 20).reverse()
const completed = readJSONL(join(STATE, 'completed.jsonl'), 60).reverse()

let backlog = []
try {
  backlog = readFileSync(join(REPO, 'docs/autonomy/BACKLOG.md'), 'utf8').split('\n')
    .filter(l => /^\|\s*B-\d/.test(l))
    .map(l => { const c = l.split('|').map(s => s.trim()); return { id: c[1], title: c[2], cls: c[3], effort: c[6], priority: c[7], status: c[8] } })
} catch {}

const prs = (gh(`pr list --state open --json number,title,author,headRefName,createdAt,reviewDecision,mergeStateStatus,body`, []) || [])
  .map(p => ({ ...p, bot: (p.author?.login || '').includes('autobot') }))
const reviewPRs = prs.filter(p => p.bot) // user-facing items the loop opened await Tom

// ── system state light ─────────────────────────────────────────────────────
const SYS = { working: ['🟡', 'Working'], idle: ['⚪', 'Idle'], paused: ['⏸️', 'Paused'], error: ['🔴', 'Error'], blocked: ['🔴', 'Blocked'] }[status.state] || ['⚪', status.state || 'Idle']
const dot = (s) => ({ shipped: '🟢', working: '🟡', 'waiting-for-me': '🔵', review: '🔵', blocked: '🔴', error: '🔴', queued: '⚪', done: '🟢' }[s] || '⚪')

const card = (title, inner) => `<section class="card"><h2>${title}</h2>${inner}</section>`
const rows = (arr, fn) => arr.length ? arr.map(fn).join('') : `<p class="muted">Nothing yet.</p>`

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Triviverse Autonomy</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b0d12;color:#e6e8ee;font:14px/1.5 ui-sans-serif,system-ui,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px}h1{font-size:20px;margin:0 0 2px}.sub{color:#8b93a7;font-size:12px;margin-bottom:18px}
.grid{display:grid;gap:14px;grid-template-columns:1fr 1fr}@media(max-width:760px){.grid{grid-template-columns:1fr}}
.card{background:#141824;border:1px solid #232a3a;border-radius:12px;padding:14px}.card h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b93a7;margin:0 0 10px}
.row{padding:7px 0;border-top:1px solid #1e2430}.row:first-of-type{border-top:0}.muted{color:#6b7488}.pill{font-size:11px;padding:1px 7px;border-radius:99px;background:#1e2636;color:#aeb6c8}
.big{font-size:15px;font-weight:600}.time{color:#6b7488;font-size:11px;font-variant-numeric:tabular-nums}.why{color:#b7c0d4;font-size:13px;margin-top:3px}
a{color:#7aa2ff;text-decoration:none}a:hover{text-decoration:underline}.k{color:#8b93a7}.tl .row{display:flex;gap:10px}.tl .time{min-width:96px}
.hero{display:flex;align-items:center;gap:12px;background:#141824;border:1px solid #232a3a;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.hero .st{font-size:26px}.hero .lbl{font-size:16px;font-weight:700}</style></head><body><div class="wrap">
<h1>Triviverse — Autonomous System</h1><div class="sub">Live operational view · generated ${when(new Date().toISOString())} · 🟢 shipped · 🟡 working · 🔵 waiting for you · 🔴 blocked · ⚪ queued</div>

<div class="hero"><div class="st">${SYS[0]}</div><div><div class="lbl">System: ${SYS[1]}</div>
<div class="time">last run ${ago(status.lastRun || status.ts)} · next run ${status.nextRun ? when(status.nextRun) : '—'} · ${reviewPRs.length} waiting for you${status.error ? ' · <span style="color:#ff6b6b">'+esc(status.error)+'</span>' : ''}</div></div></div>

<div class="grid">
${card('🟡 Current work', status.state === 'working' && status.task ? `
  <div class="big">${dot('working')} ${esc(status.taskTitle || status.task)}</div>
  <div class="time">${esc(status.task || '')} · stage: ${esc(status.stage || '—')} · started ${ago(status.taskStarted)}</div>
  <div class="why"><span class="k">Doing:</span> ${esc(status.doing || '')}</div>
  <div class="why"><span class="k">Why:</span> ${esc(status.why || '')}</div>
  <div class="why"><span class="k">Expected impact:</span> ${esc(status.impact || '')} <span class="k">· confidence:</span> ${esc(status.confidence || '')}</div>`
  : `<p class="muted">Idle — no task in progress. Next run ${status.nextRun ? when(status.nextRun) : 'when scheduled'}.</p>`)}

${card(`🔵 Needs your attention (${reviewPRs.length})`, rows(reviewPRs, p => {
  const ask = (p.body || '').match(/Your job[^\n:]*:\*\*\s*([^\n]+)/i)?.[1] || 'Review this change'
  return `<div class="row"><div class="big">🔵 <a href="https://github.com/TomDevine11/Triviverse/pull/${p.number}">#${p.number} ${esc(p.title)}</a></div>
    <div class="why">${esc(ask.replace(/\*/g, '').slice(0, 160))}</div>
    <div class="time">opened ${ago(p.createdAt)} · ${p.mergeStateStatus === 'BLOCKED' ? 'awaiting your approval' : esc(p.mergeStateStatus)}</div></div>` })) }
</div>

<div class="grid" style="margin-top:14px">
${card('Backlog', rows(backlog.slice(0, 12), b => `<div class="row"><span class="pill">${esc(b.priority)}</span> ${dot(b.status.includes('review') ? 'review' : b.status.includes('progress') ? 'working' : b.status.includes('done') ? 'done' : 'queued')} <b>${esc(b.id)}</b> ${esc(b.title)} <span class="k">· ${esc(b.cls)} · ${esc(b.status)}</span></div>`))}

${card('✅ Autonomously completed', rows(completed.slice(0, 15), c => `<div class="row"><div>${dot(c.merged ? 'shipped' : 'review')} ${esc(c.what)}</div>
  <div class="time">${when(c.ts)} · ${esc(c.class || '')}${c.pr ? ` · <a href="https://github.com/TomDevine11/Triviverse/pull/${c.pr}">#${c.pr}</a>` : ''} · ${c.merged ? 'merged' : 'awaiting review'} · CI ${esc(c.ci || '—')}</div></div>`))}
</div>

<div class="grid" style="margin-top:14px">
${card('Agent activity', `<div class="tl">${rows(activity.slice(0, 30), a => `<div class="row"><span class="time">${when(a.ts)}</span><span>${esc(a.msg)}</span></div>`)}</div>`)}

${card('Decision history', rows(decisions.slice(0, 10), d => `<div class="row"><div class="big">${esc(d.chose)}</div>
  <div class="why"><span class="k">Why:</span> ${esc(d.why)}</div>
  ${d.evidence ? `<div class="why"><span class="k">Evidence:</span> ${esc(d.evidence)}</div>` : ''}
  ${d.alternatives ? `<div class="why"><span class="k">Considered / rejected:</span> ${esc(d.alternatives)}</div>` : ''}
  <div class="time">${when(d.ts)} · confidence: ${esc(d.confidence || '—')}</div></div>`))}
</div>
<div class="sub" style="margin-top:16px">Production is protected by GitHub branch protection — this dashboard is read-only and cannot ship anything. Strategy &amp; recommendations: see the weekly State of Triviverse report.</div>
</div></body></html>`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, html)
console.log(`dashboard → ${OUT}`)
