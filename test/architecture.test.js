import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAW_MARKERS, CANONICAL_FACTS, GAME_IMPORT_EXCEPTIONS } from '../src/data/layers.js'

// RFC-001 §6 / inv. #4: game code (src/games/**) consumes DERIVED data only —
// never the canonical model, never raw source. This guard enforces that boundary
// and ratchets it: the only permitted game→canonical imports are the tracked
// exceptions in the layer manifest, each tied to the backlog task that removes it.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const GAMES_DIR = path.join(ROOT, 'src', 'games')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(full)
  }
  return out
}

// Every import/re-export specifier in a source file.
function importSpecifiers(src) {
  const specs = []
  const re = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(src))) specs.push(m[1])
  return specs
}

const forbidden = [...RAW_MARKERS, ...CANONICAL_FACTS]
const allowed = new Set(GAME_IMPORT_EXCEPTIONS.map(e => `${e.file}::${e.imports}`))

describe('RFC-001 layer boundary (games consume derived, never canonical/raw)', () => {
  const files = existsSync(GAMES_DIR) ? walk(GAMES_DIR) : []

  it('finds game source files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('no game imports a canonical fact or raw source (except tracked exceptions)', () => {
    const violations = []
    for (const file of files) {
      const rel = path.relative(ROOT, file)
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        const marker = forbidden.find(f => spec.includes(f))
        if (!marker) continue
        if (allowed.has(`${rel}::${marker}`)) continue
        violations.push(`${rel} imports "${spec}" (canonical/raw: ${marker})`)
      }
    }
    expect(violations, `RFC-001 §6 boundary violations:\n${violations.join('\n')}`).toEqual([])
  })

  it('every tracked exception is real and names the retiring backlog task', () => {
    for (const e of GAME_IMPORT_EXCEPTIONS) {
      expect(existsSync(path.join(ROOT, e.file)), `stale exception: ${e.file} no longer exists`).toBe(true)
      const src = readFileSync(path.join(ROOT, e.file), 'utf8')
      expect(importSpecifiers(src).some(s => s.includes(e.imports)),
        `stale exception: ${e.file} no longer imports ${e.imports}`).toBe(true)
      expect(e.retiredBy, `exception for ${e.file} must name a backlog task`).toMatch(/^C\d+$/)
    }
  })
})
