import { useState, useEffect, useRef } from 'react'
import { msUntilNextDay } from '../data/day'

const pad2 = (n) => String(n).padStart(2, '0')

// hh:mm:ss until the next geography day.
export function useCountdown() {
  const [ms, setMs] = useState(msUntilNextDay)
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextDay()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`
}


// ── Map view helpers (Overland, Patchwork) ─────────────────────────────────────
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ease = (p) => 1 - (1 - p) ** 3

// Glide the viewBox between frames instead of cutting.
export function useCamera(target) {
  const [box, setBox] = useState(target)
  const from = useRef(target)
  const key = target.map(n => Math.round(n)).join(' ')
  useEffect(() => {
    const dur = reducedMotion() ? 0 : 700
    const start = performance.now(), a = from.current, b = target
    let raf
    const tick = (now) => {
      const p = dur ? Math.min(1, (now - start) / dur) : 1
      const v = a.map((n, i) => n + (b[i] - n) * ease(p))
      from.current = v
      setBox(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return box
}

export function useSize(ref) {
  const [size, setSize] = useState({ w: 600, h: 400 })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => { const { width, height } = e.contentRect; if (width && height) setSize({ w: width, h: height }) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}


// Ease a number up from 0 to `target` once `run` is set (after `delay` ms); shows
// `target` directly otherwise.
export function useCountUp(target, run, dur = 1100, delay = 0) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf, start
    const tick = (now) => {
      start ??= now + delay
      const p = Math.max(0, Math.min(1, (now - start) / dur))
      setV(target * (1 - (1 - p) ** 3))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, dur, delay])
  return run ? v : target
}
