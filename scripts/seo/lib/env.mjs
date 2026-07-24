// Minimal .env loader (no dependency). Reads scripts/seo/.env.seo.local (and a
// repo-root .env.seo.local as a fallback) into process.env without overriding
// anything already set in the real environment. KEY=VALUE lines, # comments,
// optional surrounding quotes. Kept dependency-free on purpose.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const SEO_DIR = resolve(HERE, '..')
export const REPO_ROOT = resolve(HERE, '..', '..', '..')

function parseEnv(text) {
  const out = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

let loaded = false
export function loadEnv() {
  if (loaded) return
  loaded = true
  for (const path of [resolve(SEO_DIR, '.env.seo.local'), resolve(REPO_ROOT, '.env.seo.local')]) {
    if (!existsSync(path)) continue
    const vars = parseEnv(readFileSync(path, 'utf8'))
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined) process.env[k] = v
    }
  }
}
