// Dependency-free .env loader + writer for the TikTok publisher, mirroring scripts/seo/lib/env.mjs.
// Secrets live in scripts/publish/.env.publish.local (gitignored) — never in source, never printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const PUBLISH_DIR = HERE
export const REPO_ROOT = resolve(HERE, '..', '..')
export const ENV_FILE = resolve(PUBLISH_DIR, '.env.publish.local')

function parseEnv(text) {
  const out = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    out[key] = val
  }
  return out
}

let loaded = false
export function loadEnv() {
  if (loaded) return
  loaded = true
  for (const path of [ENV_FILE, resolve(REPO_ROOT, '.env.publish.local')]) {
    if (!existsSync(path)) continue
    const vars = parseEnv(readFileSync(path, 'utf8'))
    for (const [k, v] of Object.entries(vars)) if (process.env[k] === undefined) process.env[k] = v
  }
}

// Persist updated keys back into the local env file (creating it if needed). Values are never logged.
export function writeEnv(updates) {
  const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split('\n') : []
  const seen = new Set()
  const lines = existing.map((raw) => {
    const t = raw.trim()
    if (!t || t.startsWith('#')) return raw
    const key = t.slice(0, t.indexOf('=')).trim()
    if (key in updates) { seen.add(key); return `${key}=${updates[key]}` }
    return raw
  })
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) lines.push(`${k}=${v}`)
    process.env[k] = String(v)
  }
  writeFileSync(ENV_FILE, lines.join('\n').replace(/\n+$/, '') + '\n', { mode: 0o600 })
}

// Fail fast with a clear message when a required secret/config is missing.
export function requireEnv(keys) {
  loadEnv()
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`\nMissing config: ${missing.join(', ')}`)
    console.error(`Set it in ${ENV_FILE} (see .env.publish.example) — never in source or the chat.\n`)
    process.exit(1)
  }
}
