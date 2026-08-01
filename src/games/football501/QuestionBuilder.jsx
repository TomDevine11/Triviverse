// ─────────────────────────────────────────────────────────────────────────
// BUILD YOUR OWN — the generic question constructor.
//
// This component knows NO football. It talks only to the population registry:
// it asks which population kinds exist, what to ask for each, how they can be
// ranked, where they apply and what refinements exist — and renders whatever it
// receives. Adding a new population (e.g. Record Signings) is a registry change;
// this file does not move.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import GameChrome from '../../components/GameChrome'
import { useI18n } from '../../i18n'
import {
  getPopulationKinds, getPopulationParams, getPopulationOptions,
  getRankingOptions, getScopes, getRefinements, resolveQuestion, withScopeMeta,
} from '../../data/football501/populations.js'

const Chip = ({ on, onClick, children, sub }) => (
  <button onClick={onClick}
    className={`text-left rounded-lg px-3 py-2 border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright
      ${on ? 'bg-brand border-brand text-white' : 'bg-surface border-border text-secondary hover:text-primary hover:border-border-strong'}`}>
    <span className="block leading-tight">{children}</span>
    {sub && <span className={`block text-[0.68rem] font-medium mt-0.5 ${on ? 'text-white/70' : 'text-faint'}`}>{sub}</span>}
  </button>
)
const StepCard = ({ n, title, sub, children }) => (
  <div className="bg-card border border-border-strong rounded-xl p-4 mb-3">
    <div className="flex items-baseline gap-2.5 mb-3">
      <span className="grid place-items-center w-5 h-5 rounded-md bg-brand/15 text-brand-bright text-[0.7rem] font-black shrink-0">{n}</span>
      <h3 className="text-primary font-bold text-[0.95rem]">{title}</h3>
    </div>
    {sub && <p className="text-faint text-xs -mt-2 mb-3">{sub}</p>}
    {children}
  </div>
)

export default function QuestionBuilder({ onStart, onBack }) {
  const { t } = useI18n()
  const kinds = useMemo(() => getPopulationKinds(), [])

  const [kind, setKind] = useState(null)
  const [params, setParams] = useState({})       // { paramId: value }
  const [stat, setStat] = useState(null)          // ranking id — seeded from the registry on kind pick
  const [comp, setComp] = useState(null)          // competition id — seeded from the registry on kind pick
  const [refine, setRefine] = useState({})        // { refinementId: value }
  const [count, setCount] = useState(2)

  const [paramOpts, setParamOpts] = useState({})  // { paramId: [options] }
  const [nations, setNations] = useState([])
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const sel = useMemo(() => ({ kind, params, stat, scope: { comp }, refine, _nations: nations }), [kind, params, stat, comp, refine, nations])

  const paramDefs = kind ? getPopulationParams(kind) : []
  const rankings = kind ? getRankingOptions(kind, sel) : []
  const scopes = kind ? getScopes(kind, sel) : []
  const refinements = kind ? getRefinements(kind, sel) : []
  const populationReady = !!kind && paramDefs.every(p => params[p.id] != null)

  // Pick a population kind → seed its default ranking + competition from the
  // registry (the UI never names a stat or a league), clear prior params/refinements.
  const chooseKind = (k) => {
    setKind(k); setParams({}); setRefine({})
    setStat(getRankingOptions(k, { kind: k })[0]?.id || null)
    setComp(getScopes(k, { kind: k })[0]?.value || null)
  }

  // Load this kind+competition's option lists; keep still-valid param picks.
  useEffect(() => {
    if (!kind || !comp) return
    let dead = false
    ;(async () => {
      const defs = getPopulationParams(kind)
      const entries = await Promise.all(defs.map(async d => [d.id, await getPopulationOptions(kind, d.id, { kind, params, scope: { comp } })]))
      if (dead) return
      const opts = Object.fromEntries(entries)
      setParamOpts(opts)
      setParams(prev => { // drop picks no longer offered (e.g. a club that isn't in the new competition)
        const next = {}
        for (const d of defs) if (prev[d.id] != null && opts[d.id]?.some(o => o.value === prev[d.id])) next[d.id] = prev[d.id]
        return next
      })
      const meta = await withScopeMeta({ scope: { comp } })
      if (!dead) setNations(meta._nations || [])
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, comp])

  // Live resolve → preview (natural language, board, playability). When the
  // population isn't complete the render shows the placeholder, so we simply skip.
  useEffect(() => {
    if (!populationReady || !comp || !stat) return
    let dead = false
    ;(async () => {
      setBusy(true)
      try { const r = await resolveQuestion(sel); if (!dead) setPreview(r) }
      catch { if (!dead) setPreview({ error: true }) }
      finally { if (!dead) setBusy(false) }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, JSON.stringify(params), stat, comp, JSON.stringify(refine), populationReady])

  const ready = preview && !preview.error && !preview.empty && preview.solvable && preview.maxPlayers >= count

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      <GameChrome motifId="501" title={t('five01.wordmark')} />
      <button onClick={onBack} className="text-muted hover:text-secondary text-sm transition-colors mt-4">{t('common.back')}</button>
      <div className="mt-5 mb-5 text-center">
        <h2 className="score-number text-[clamp(2rem,5vw,2.6rem)] tv-wordmark leading-none">BUILD A QUESTION</h2>
      </div>

      <div className="grid md:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* ── the build ── */}
        <div>
          <StepCard n={1} title="Who are we talking about?" sub="Everything else follows from this.">
            <div className="grid sm:grid-cols-2 gap-2">
              {kinds.map(k => <Chip key={k.id} on={kind === k.id} onClick={() => chooseKind(k.id)} sub={k.example}>{k.label}</Chip>)}
            </div>
            {paramDefs.map(p => (
              <div key={p.id} className="mt-4">
                <div className="text-[0.6rem] font-black tracking-[0.12em] text-faint uppercase mb-2">{p.label}</div>
                <div className="flex flex-wrap gap-2">
                  {(paramOpts[p.id] || []).map(o => <Chip key={o.value} on={params[p.id] === o.value} onClick={() => setParams(s => ({ ...s, [p.id]: o.value }))}>{o.label}</Chip>)}
                  {!paramOpts[p.id]?.length && <span className="text-faint text-xs">…</span>}
                </div>
              </div>
            ))}
          </StepCard>

          {populationReady && (
            <>
              <StepCard n={2} title="How should we rank them?">
                <div className="flex flex-wrap gap-2">
                  {rankings.map(r => <Chip key={r.id} on={stat === r.id} onClick={() => setStat(r.id)}>{r.label}</Chip>)}
                </div>
              </StepCard>

              <StepCard n={3} title="Where does this apply?">
                <div className="flex flex-wrap gap-2">
                  {scopes.map(s => <Chip key={s.value} on={comp === s.value} onClick={() => setComp(s.value)}>{s.label}</Chip>)}
                </div>
              </StepCard>

              <StepCard n={4} title="Anything else?" sub="Optional — leave it wide open, or narrow it down.">
                {refinements.map(rf => (
                  <div key={rf.id} className="mb-3 last:mb-0">
                    <div className="text-[0.6rem] font-black tracking-[0.12em] text-faint uppercase mb-2">{rf.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {rf.options.map(o => <Chip key={o.value || 'any'} on={(refine[rf.id] || '') === o.value} onClick={() => setRefine(s => ({ ...s, [rf.id]: o.value }))}>{o.label}</Chip>)}
                    </div>
                  </div>
                ))}
              </StepCard>
            </>
          )}
        </div>

        {/* ── live preview ── */}
        <aside className="md:sticky md:top-4">
          <div className="bg-card border border-border-strong rounded-xl p-4">
            {!populationReady ? (
              <p className="text-faint text-sm italic text-center py-6">Choose who you’re talking about, and your question takes shape here.</p>
            ) : preview?.error ? (
              <p className="text-warn text-sm py-4">Couldn’t build that one — try another choice.</p>
            ) : (
              <>
                <div className="text-[0.55rem] font-black tracking-[0.18em] text-accent-bright uppercase mb-2">Your question</div>
                <div className="space-y-1.5">
                  {(preview?.narrative || []).map((line, i) => (
                    <p key={i} className="text-secondary text-[0.95rem] leading-snug">
                      {line.map((tok, j) => tok.em ? <b key={j} className="text-primary font-semibold">{tok.t}</b> : <span key={j}>{tok.t}</span>)}
                    </p>
                  ))}
                </div>

                <div className={`mt-4 rounded-lg px-3 py-2.5 text-sm font-bold flex items-center gap-2
                  ${ready ? 'bg-success/12 text-success-bright' : 'bg-warn/12 text-warn'}`}>
                  {busy ? '…' : ready ? '✓ Ready to play' : preview?.empty ? 'Nobody fits — widen a choice' : !preview?.solvable ? 'Can’t reach 501 — try a wider set' : `Needs ${count} finishers; only ${preview?.maxPlayers} available`}
                </div>

                {preview && !preview.empty && (
                  <div className="mt-3">
                    <div className="text-[0.55rem] font-black tracking-[0.16em] text-faint uppercase mb-1.5">Leaderboard · {preview.statLabel} · {preview.answers} answers</div>
                    <ol className="space-y-0.5">
                      {preview.board.slice(0, 6).map((b, i) => (
                        <li key={i} className="flex justify-between text-xs">
                          <span className="text-secondary truncate">{i + 1}. {b.name}</span>
                          <span className={`font-bold tabular-nums ${b.value > 180 ? 'text-warn' : 'text-primary'}`}>{b.value}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <label className="text-[0.6rem] font-black tracking-[0.12em] text-faint uppercase">Players</label>
                  <select value={count} onChange={e => setCount(Number(e.target.value))}
                    className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm font-bold text-primary outline-none cursor-pointer">
                    {[2, 3, 4, 5].map(n => <option key={n} value={n} disabled={preview && preview.maxPlayers < n}>{n}</option>)}
                  </select>
                </div>
                <button disabled={!ready} onClick={() => onStart(preview.challenge, count)}
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
