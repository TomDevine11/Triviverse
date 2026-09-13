// Developer-only QA overlay bar. TEMPORARY. Rendered only when QA mode is active.
// Inline styles + a fixed banner keep it isolated from the design system and easy
// to remove. Shows which generated question is on screen, Prev/Skip controls, and a
// collapsible debug panel of the question's quality metadata + answer set.
import { useState } from 'react'

const bar = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 99999,
  background: '#101322', color: '#e6e8ee', borderTop: '2px solid #7c5cff',
  font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
  padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6,
  boxShadow: '0 -6px 20px rgba(0,0,0,.4)',
}
const btn = {
  background: '#1e2438', color: '#e6e8ee', border: '1px solid #333c58',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', font: 'inherit',
}
const chip = { background: '#7c5cff22', color: '#b9a8ff', borderRadius: 99, padding: '1px 8px' }

export default function QaBar({ gameId, index, total, onPrev, onNext, meta, note }) {
  const [debug, setDebug] = useState(false)
  return (
    <div style={bar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ ...chip, background: '#7c5cff', color: '#fff' }}>QA MODE</span>
        <strong>{gameId}</strong>
        <span style={chip}>Question {index + 1}{total ? ` / ${total}` : ''}</span>
        {note && <span style={{ color: '#8b93a7' }}>{note}</span>}
        <span style={{ flex: 1 }} />
        {onPrev && <button style={btn} onClick={onPrev}>← Prev</button>}
        <button style={{ ...btn, borderColor: '#7c5cff', color: '#c9bcff' }} onClick={onNext}>Skip →</button>
        {meta && <button style={btn} onClick={() => setDebug(d => !d)}>{debug ? 'Hide' : '🐞 Debug'}</button>}
        <button style={btn} onClick={() => { try { localStorage.setItem("tv_qa", "0") } catch { /* ignore */ } location.search = '' }}>Exit</button>
      </div>
      {debug && meta && (
        <div style={{ maxHeight: 180, overflow: 'auto', background: '#0a0d18', borderRadius: 6, padding: 8 }}>
          {Object.entries(meta).map(([k, v]) => (
            <div key={k}><span style={{ color: '#8b93a7' }}>{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
          ))}
        </div>
      )}
    </div>
  )
}
