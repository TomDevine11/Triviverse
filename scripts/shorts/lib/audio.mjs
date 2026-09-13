// Audio layer. Frames are rendered SILENT; this muxes a low music BED + soft countdown ticks + a warm
// reveal onto the MP4 with ffmpeg. Everything is swappable without re-rendering frames (see remux.mjs).
// Assets live in assets/shorts/audio/{beds,countdown,reveals} — all locally synthesised, copyright-clear.
// Drop a licensed loop into beds/ with the same name to override; the mux prefers whatever file exists.
import { existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import ffmpegPath from 'ffmpeg-static'

const AUDIO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets', 'shorts', 'audio')
// Relative loudness in the final mix (bed sits under the SFX so question/answer stay the focus). The
// whole mix is then loudness-normalised (loudnorm) to a punchy social level so nothing feels dead.
const VOL = { bed: 0.24, tick: 2.7, 'tick-final': 3.0, reveal: 3.3, whoosh: 1.6 }
const LOUDNORM = 'loudnorm=I=-15:TP=-1.5:LRA=11'
const SFX_SUB = { tick: 'countdown', 'tick-final': 'countdown', reveal: 'reveals', whoosh: 'motion' }
// Default per-format bed. Change these (or the profile below) and remux — no frame re-render.
const BED = { 'winner-stays-on': 'bed-pulse', 'football-pointless': 'bed-quiz' } // others → bed-soft

// Named audio profiles to A/B test (see audio-test.mjs). `bed: null` = SFX only (no music).
export const PROFILES = {
  sfx: { bed: null, label: 'SFX only (no music)' },
  pulse: { bed: 'bed-pulse', label: 'Soft heartbeat pulse' },
  soft: { bed: 'bed-soft', label: 'Warm low drone' },
  lofi: { bed: 'bed-lofi', label: 'Chilled lofi beat' },
  quiz: { bed: 'bed-quiz', label: 'Bright quiz-show' },
}

const find = (sub, name) => { for (const ext of ['wav', 'mp3', 'm4a', 'ogg']) { const p = path.join(AUDIO, sub, `${name}.${ext}`); if (existsSync(p)) return p } return null }
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

// Real music you drop into assets/shorts/audio/beds/ (any file NOT named "bed-*"). These form a pool
// that ROTATES per video (deterministic by seed) so 10 posts in a row don't share one loop. If the
// pool is empty we fall back to the built-in synth beds.
function musicPool() {
  const dir = path.join(AUDIO, 'beds')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => !f.startsWith('bed-') && /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort().map((f) => path.join(dir, f))
}
// Football Pointless always uses its own dedicated theme (assets/shorts/audio/pointless/*), never the
// rotation. Any audio/video file in that folder counts.
function pointlessBed() {
  const dir = path.join(AUDIO, 'pointless')
  if (!existsSync(dir)) return null
  const f = readdirSync(dir).find((x) => /\.(mp3|wav|m4a|ogg|mp4)$/i.test(x))
  return f ? path.join(dir, f) : null
}
export function bedFor(format, seed) {
  // Pointless uses the lofi rotation like everything else by default (the copyrighted TV theme risks
  // being muted/flagged on TikTok). Set POINTLESS_THEME=1 to opt back into the dropped-in theme.
  if (format === 'football-pointless' && process.env.POINTLESS_THEME === '1') { const pb = pointlessBed(); if (pb) return pb }
  const pool = musicPool()
  if (pool.length) return pool[seed != null ? hash(seed) % pool.length : 0]
  return find('beds', BED[format] || 'bed-soft')
}
// Music track names (basename, no extension) — for cycling by publish order in the trial.
export const musicTracks = () => musicPool().map((p) => path.basename(p).replace(/\.[^.]+$/, ''))
const sfxFile = (sound) => find(SFX_SUB[sound] || 'reveals', sound)

// Build the cue list for a spec's timeline (seconds → sound). Countdown ticks + reveal.
export function cuesFor({ cdStart, cdEnd, revealAt, extra = [] }) {
  const cues = []
  if (cdStart != null && cdEnd != null) for (let s = Math.ceil(cdEnd - cdStart); s >= 1; s--) cues.push({ at: +(cdEnd - s).toFixed(2), sound: s === 1 ? 'tick-final' : 'tick' })
  if (revealAt != null) cues.push({ at: revealAt, sound: 'reveal' })
  return [...cues, ...extra]
}

// Mux a looping bed + timed SFX onto the (silent) MP4. Returns { audio, path, bed }.
// `bed`: undefined → per-format default; null → no music; string → that bed name (for A/B profiles).
export function muxAudio(mp4Path, cues, { format, seed, bed: bedOpt } = {}) {
  const bed = bedOpt === null ? null : (typeof bedOpt === 'string' ? find('beds', bedOpt) : bedFor(format, seed))
  const sfx = (cues || []).map((c) => ({ ...c, file: sfxFile(c.sound) })).filter((c) => c.file)
  if (!bed && !sfx.length) return { audio: false, path: mp4Path }

  const inputs = [], parts = [], labels = []
  let idx = 1 // input 0 is the video
  if (bed) { inputs.push('-stream_loop', '-1', '-i', bed); parts.push(`[${idx}:a]volume=${VOL.bed}[bed]`); labels.push('[bed]'); idx++ }
  sfx.forEach((c, i) => {
    inputs.push('-i', c.file)
    const ms = Math.round(c.at * 1000)
    parts.push(`[${idx}:a]adelay=${ms}|${ms},volume=${VOL[c.sound] ?? 1}[s${i}]`)
    labels.push(`[s${i}]`); idx++
  })
  // apad → audio runs indefinitely; -shortest then clips to the VIDEO length (bed loops to fill).
  const filter = `${parts.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest[mx];[mx]${LOUDNORM}[ln];[ln]apad[aout]`
  const tmp = mp4Path.replace(/\.mp4$/, '.audio.mp4')
  const args = ['-y', '-i', mp4Path, ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', tmp]
  const r = spawnSync(ffmpegPath, args, { stdio: 'ignore' })
  if (r.status !== 0) return { audio: false, path: mp4Path }
  return { audio: true, path: tmp, bed: path.basename(bed || '') || null }
}
