// ─────────────────────────────────────────────────────────────────────────
// BUILD YOUR OWN — the generic facet constructor.
//
// Knows NO football. It asks the registry which stats and layers exist, their
// options, and calls resolveQuestion(sel). You pick a stat, then stack any layers
// (competition, club, player, nationality, era, position, trophy). Adding a new
// layer or stat is a registry change; this file does not move.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import GameChrome from '../../components/GameChrome'
import { useI18n } from '../../i18n'
import { getStats, getLayers, getLayerOptions, resolveQuestion, resolveTenable } from '../../data/football501/populations.js'

const fold = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const Chip = ({ on, onClick, children, sub }) => (
  <button onClick={onClick}
    className={`text-left rounded-lg px-3 py-2 border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright
      ${on ? 'bg-brand border-brand text-white' : 'bg-surface border-border text-secondary hover:text-primary hover:border-border-strong'}`}>
    <span className="block leading-tight">{children}</span>
    {sub && <span className={`block text-[0.68rem] font-medium mt-0.5 ${on ? 'text-white/70' : 'text-faint'}`}>{sub}</span>}
  </button>
)
const Label = ({ children, onRemove }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[0.6rem] font-black tracking-[0.12em] text-faint uppercase">{children}</span>
    {onRemove && <button onClick={onRemove} className="text-faint hover:text-danger text-xs leading-none">✕</button>}
  </div>
)

export default function QuestionBuilder({ onStart, onBack, mode = '501' }) {
  const isTenable = mode === 'tenable'
  const { t } = useI18n()
  const stats = useMemo(() => getStats(), [])
  const layersMeta = useMemo(() => getLayers(), [])
  const layerMeta = (id) => layersMeta.find(l => l.id === id)

  const [stat, setStat] = useState(null)
  const [layers, setLayers] = useState({ competition: 'ALL' })
  const [active, setActive] = useState(['competition'])
  const [opts, setOpts] = useState({})
  const [query, setQuery] = useState({})
  const [count, setCount] = useState(1) // 1 = solo; 2–5 = local multiplayer (501 only)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const statMeta = stats.find(s => s.id === stat)
  const needs = statMeta?.needs

  const chooseStat = (id) => {
    const sd = stats.find(s => s.id === id)
    setStat(id)
    if (sd.needs) setActive(a => a.includes(sd.needs) ? a : [...a, sd.needs])
  }
  const addLayer = (id) => setActive(a => a.includes(id) ? a : [...a, id])
  const removeLayer = (id) => { setActive(a => a.filter(x => x !== id)); setLayers(l => { const n = { ...l }; delete n[id]; return n }) }
  const setLayer = (id, v) => setLayers(l => ({ ...l, [id]: v }))

  // Load option lists for the active layers (the club list depends on competition).
  useEffect(() => {
    let dead = false
    ;(async () => {
      const entries = await Promise.all(active.map(async id => [id, await getLayerOptions(id, { layers })]))
      if (!dead) setOpts(Object.fromEntries(entries))
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.join(','), layers.competition])

  // Live resolve → preview.
  useEffect(() => {
    if (!stat) return
    let dead = false
    ;(async () => {
      setBusy(true)
      try { const r = await (isTenable ? resolveTenable : resolveQuestion)({ stat, layers }); if (!dead) setPreview(r) }
      catch { if (!dead) setPreview({ error: true }) }
      finally { if (!dead) setBusy(false) }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stat, JSON.stringify(layers)])

  const needsUnmet = needs && !layers[needs]
  const ready = preview && !preview.error && !preview.empty && !needsUnmet &&
    (isTenable ? preview.valid : (preview.solvable && preview.maxPlayers >= count))
  const addable = layersMeta.filter(l => !active.includes(l.id))

  const renderLayer = (id) => {
    const meta = layerMeta(id), list = opts[id] || []
    const raw = (query[id] || '').trim(), fq = fold(raw)
    const removable = id !== 'competition' && !(needs === id) // keep competition + a stat-required layer
    return (
      <div key={id} className="mb-3.5 last:mb-0">
        <Label onRemove={removable ? () => removeLayer(id) : null}>{meta.label}{needs === id && <span className="text-brand-bright"> · required</span>}</Label>
        {meta.type === 'search' ? (
          layers[id] != null ? (
            <Chip on onClick={() => setLayer(id, undefined)}>{list.find(o => o.value === layers[id])?.label || layers[id]}&nbsp;✕</Chip>
          ) : (
            <>
              <input value={query[id] || ''} onChange={e => setQuery(v => ({ ...v, [id]: e.target.value }))}
                placeholder={meta.searchPlaceholder || 'Search…'} autoComplete="off"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-brand mb-2" />
              {!raw && <div className="text-[0.55rem] font-black tracking-[0.12em] text-faint uppercase mb-1.5">Popular picks</div>}
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                {list.filter(o => fold(o.label).includes(fq)).slice(0, raw ? 40 : 12).map(o => (
                  <Chip key={o.value} onClick={() => { setLayer(id, o.value); setQuery(v => ({ ...v, [id]: '' })) }}>{o.label}</Chip>
                ))}
                {raw && !list.some(o => fold(o.label).includes(fq)) && <span className="text-faint text-xs">No matches.</span>}
              </div>
            </>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map(o => <Chip key={o.value} on={layers[id] === o.value} onClick={() => setLayer(id, o.value)}>{o.label}</Chip>)}
            {!list.length && <span className="text-faint text-xs">…</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      <GameChrome motifId={isTenable ? 'tenable' : '501'} title={isTenable ? 'Tenable' : t('five01.wordmark')} />
      <button onClick={onBack} className="text-muted hover:text-secondary text-sm transition-colors mt-4">{t('common.back')}</button>
      <div className="mt-5 mb-5 text-center">
        <h2 className="score-number text-[clamp(2rem,5vw,2.6rem)] tv-wordmark leading-none">BUILD A QUESTION</h2>
      </div>

      <div className="grid md:grid-cols-[1fr_20rem] gap-4 items-start">
        <div>
          <div className="bg-card border border-border-strong rounded-xl p-4 mb-3">
            <div className="flex items-baseline gap-2.5 mb-3">
              <span className="grid place-items-center w-5 h-5 rounded-md bg-brand/15 text-brand-bright text-[0.7rem] font-black">1</span>
              <h3 className="text-primary font-bold text-[0.95rem]">What are we measuring?</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stats.map(s => <Chip key={s.id} on={stat === s.id} onClick={() => chooseStat(s.id)} sub={s.needs ? `needs a ${s.needs}` : null}>{s.label}</Chip>)}
            </div>
          </div>

          {stat && (
            <div className="bg-card border border-border-strong rounded-xl p-4">
              <div className="flex items-baseline gap-2.5 mb-1">
                <span className="grid place-items-center w-5 h-5 rounded-md bg-brand/15 text-brand-bright text-[0.7rem] font-black">2</span>
                <h3 className="text-primary font-bold text-[0.95rem]">Narrow it down</h3>
              </div>
              <p className="text-faint text-xs mb-3 ml-[1.9rem]">Stack any filters — or leave it wide open.</p>
              {active.map(renderLayer)}
              {addable.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  {addable.map(l => <button key={l.id} onClick={() => addLayer(l.id)}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-dashed border-border-strong text-muted hover:text-primary hover:border-brand transition-colors">+ {l.label}</button>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* live preview */}
        <aside className="md:sticky md:top-4">
          <div className="bg-card border border-border-strong rounded-xl p-4">
            {!stat ? (
              <p className="text-faint text-sm italic text-center py-6">Choose what to measure, and your question appears here.</p>
            ) : preview?.error ? (
              <p className="text-warn text-sm py-4">Couldn’t build that one — try another choice.</p>
            ) : (
              <>
                <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase mb-1.5">Your question</div>
                <p className="text-primary font-bold text-[1.05rem] leading-snug first-letter:uppercase">{preview?.question}</p>

                <div className={`mt-3.5 rounded-lg px-3 py-2.5 text-sm font-bold flex items-center gap-2 ${ready ? 'bg-success/12 text-success-bright' : 'bg-warn/12 text-warn'}`}>
                  {busy ? '…' : needsUnmet ? `Add a ${needs} to rank by ${statMeta.label.toLowerCase()}`
                    : ready ? '✓ Ready to play' : preview?.empty ? 'Nobody fits — widen a filter'
                      : isTenable ? 'Not enough answers for a top 10 — widen it'
                        : !preview?.solvable ? 'Can’t reach 501 — try a wider set' : `Needs ${count} finishers; only ${preview?.maxPlayers} available`}
                </div>

                {preview && !preview.empty && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                      <div className="text-[0.55rem] font-black tracking-[0.12em] text-faint uppercase">{isTenable ? 'In the pool' : 'Answers'}</div>
                      <div className="text-primary text-2xl font-black tabular-nums leading-tight mt-0.5">{isTenable ? preview.total : preview.answers}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
                      <div className="text-[0.55rem] font-black tracking-[0.12em] text-faint uppercase">Difficulty</div>
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(i => <span key={i} className={`w-2.5 h-2.5 rounded-full ${i <= (preview.difficulty?.level || 0) ? 'bg-brand-bright' : 'bg-border-strong'}`} />)}
                      </div>
                      <div className="text-secondary text-xs font-bold mt-1.5">{preview.difficulty?.label}</div>
                    </div>
                  </div>
                )}

                {!isTenable && (
                  <div className="mt-4">
                    <div className="text-[0.6rem] font-black tracking-[0.12em] text-faint uppercase mb-0.5">How many players?</div>
                    <div className="text-faint text-[0.68rem] mb-2">1 = solo · 2+ = local multiplayer</div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} disabled={preview && preview.maxPlayers < n} onClick={() => setCount(n)}
                          className={`py-3 rounded-lg border font-black text-lg tabular-nums transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                            ${count === n ? 'bg-brand border-brand text-white' : 'bg-surface border-border text-secondary hover:border-border-strong'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}
                <button disabled={!ready} onClick={() => isTenable ? onStart(preview) : onStart(preview.challenge, count)}
                  className="mt-3 w-full bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright">
                  {t('five01.startGame')}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
