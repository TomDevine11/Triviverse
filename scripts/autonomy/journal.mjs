#!/usr/bin/env node
// Runner journal writer — the autonomous loop calls this to record what it's doing, so the
// dashboard (scripts/autonomy/build-dashboard.mjs) can show it. Writes to a LOCAL state dir
// (never committed) so per-run journaling doesn't spam the repo.
//
//   node scripts/autonomy/journal.mjs status   '{"state":"working","task":"B-002",...}'
//   node scripts/autonomy/journal.mjs activity  '{"msg":"Selected B-002 Tenable SEO"}'
//   node scripts/autonomy/journal.mjs decision  '{"chose":"...","why":"...","evidence":"...","alternatives":"...","confidence":"medium"}'
//   node scripts/autonomy/journal.mjs completed '{"what":"...","class":"internal","pr":123,"merged":true,"ci":"pass"}'
//
// status  → overwrites status.json (the single current-state snapshot)
// others  → append one JSON line to <type>.jsonl (activity/decisions/completed)
import { mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'

const DIR = process.env.STATE_DIR || join(process.env.HOME, '.triviverse', 'state')
mkdirSync(DIR, { recursive: true })

const type = process.argv[2]
const entry = { ts: new Date().toISOString(), ...JSON.parse(process.argv[3] || '{}') }
const FILES = { activity: 'activity.jsonl', decision: 'decisions.jsonl', completed: 'completed.jsonl' }

if (type === 'status') writeFileSync(join(DIR, 'status.json'), JSON.stringify(entry, null, 2) + '\n')
else if (FILES[type]) appendFileSync(join(DIR, FILES[type]), JSON.stringify(entry) + '\n')
else { console.error(`journal: unknown type "${type}"`); process.exit(1) }
