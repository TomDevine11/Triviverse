import { useCallback, useEffect, useRef, useState } from 'react'

// Earshot's audio engine. One compressed recording per puzzle, decoded once with
// the Web Audio API and played from 0 for exactly the unlocked number of seconds:
// AudioBufferSourceNode.start(when, 0, duration) is sample-accurate in every
// browser, so there is no seeking, no media-element drift and no way to scrub past
// the unlocked stage from the page (no <audio> controls, no media session).
//
// Only the current puzzle's file is fetched — when the puzzle mounts — and the
// browser's HTTP cache keeps it for replays and refreshes.
//
// status: 'loading' | 'ready' | 'playing' | 'error'

let shared = null
function context() {
  if (shared) return shared
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) return null
  shared = new Ctx({ latencyHint: 'interactive' })
  // iOS: let Web Audio play with the ring/silent switch on, like a video would.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch { /* unsupported */ }
  return shared
}

const decode = (ctx, buf) => new Promise((resolve, reject) => {
  // Safari < 14.1 only had the callback form.
  const p = ctx.decodeAudioData(buf, resolve, reject)
  if (p && typeof p.then === 'function') p.then(resolve, reject)
})

export function useClipAudio(src) {
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const buffer = useRef(null)
  const node = useRef(null)
  const started = useRef(0)
  const limit = useRef(0)
  const guard = useRef(0)

  const stop = useCallback(() => {
    const n = node.current
    node.current = null
    clearTimeout(guard.current)
    if (n) { n.onended = null; try { n.stop() } catch { /* already stopped */ } }
  }, [])

  // Fetch + decode whenever the puzzle changes (or on retry).
  useEffect(() => {
    let live = true
    buffer.current = null
    const ctx = context()
    queueMicrotask(() => live && setStatus(ctx ? 'loading' : 'error'))
    if (!ctx || !src) return () => { live = false }
    const ctrl = new AbortController()
    fetch(src, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() })
      .then(b => decode(ctx, b))
      .then(b => { if (live) { buffer.current = b; setStatus('ready') } })
      .catch(() => { if (live) setStatus('error') })
    return () => { live = false; ctrl.abort(); stop() }
  }, [src, attempt, stop])

  const play = useCallback(async (seconds) => {
    const ctx = context()
    const b = buffer.current
    if (!ctx || !b) return
    stop()
    try { if (ctx.state !== 'running') await ctx.resume() } catch { /* autoplay policy: next tap */ }
    const n = ctx.createBufferSource()
    n.buffer = b
    n.connect(ctx.destination)
    const dur = Math.min(seconds, b.duration)
    const end = () => { if (node.current === n) { node.current = null; clearTimeout(guard.current); setStatus('ready') } }
    n.onended = end
    n.start(0, 0, dur)
    // If the output device stalls (its clock stops), still end on the wall clock.
    guard.current = setTimeout(() => { try { n.stop() } catch { /* ended */ } end() }, dur * 1000 + 1500)
    node.current = n
    started.current = ctx.currentTime
    limit.current = dur
    setStatus('playing')
  }, [stop])

  const pause = useCallback(() => { stop(); setStatus(s => (s === 'playing' ? 'ready' : s)) }, [stop])

  // Seconds into the clip right now (for the playhead) — read inside rAF.
  const position = useCallback(() => {
    const ctx = shared
    if (!ctx || !node.current) return 0
    return Math.min(limit.current, Math.max(0, ctx.currentTime - started.current))
  }, [])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  return { status, play, pause, position, retry }
}
