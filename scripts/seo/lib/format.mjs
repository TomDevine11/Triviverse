// Console + report-file formatting helpers.

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SEO_DIR } from './env.mjs'

export const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)
export const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'))
export const round = (n, d = 1) => (n == null ? '—' : Number(n).toFixed(d))

export function heading(text) {
  return `\n${'━'.repeat(2)} ${text} ${'━'.repeat(Math.max(2, 64 - text.length))}`
}

// Minimal fixed-width table from an array of objects and an ordered column spec
// [{ key, label, align }]. Truncates long cells so the table stays readable.
export function table(rows, columns, { max = 15 } = {}) {
  if (!rows?.length) return '  (no data)'
  const cols = columns.map(c => ({ align: 'left', ...c }))
  const shown = rows.slice(0, max)
  const widths = cols.map(c => Math.max(c.label.length, ...shown.map(r => String(r[c.key] ?? '').length)))
  const cell = (v, w, align) => (align === 'right' ? String(v).padStart(w) : String(v).padEnd(w))
  const header = '  ' + cols.map((c, i) => cell(c.label, widths[i], c.align)).join('  ')
  const rule = '  ' + cols.map((_, i) => '─'.repeat(widths[i])).join('  ')
  const body = shown.map(r => '  ' + cols.map((c, i) => cell(r[c.key] ?? '', widths[i], c.align)).join('  ')).join('\n')
  const more = rows.length > max ? `\n  … +${rows.length - max} more` : ''
  return `${header}\n${rule}\n${body}${more}`
}

// Persist a machine-readable snapshot so future sessions can read fresh data
// instead of re-querying. Returns the path written.
export function writeReport(name, data) {
  const dir = resolve(SEO_DIR, 'reports')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const path = resolve(dir, `${name}-${stamp}.json`)
  writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2))
  // Also keep a stable "latest" pointer per report type.
  writeFileSync(resolve(dir, `${name}-latest.json`), JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2))
  return path
}
