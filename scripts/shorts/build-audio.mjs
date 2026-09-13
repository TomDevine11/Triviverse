#!/usr/bin/env node
// Generate the local audio library with ffmpeg — 100% synthesized (copyright-clear). Cleaner, less
// "wobbly" beds to A/B test + soft motion/countdown SFX. Files: assets/shorts/audio/{beds,countdown,reveals,motion}.
//   node scripts/shorts/build-audio.mjs
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const A = path.join(ROOT, 'assets', 'shorts', 'audio')
for (const d of ['beds', 'countdown', 'reveals', 'motion']) mkdirSync(path.join(A, d), { recursive: true })
const run = (args, out) => { const r = spawnSync(ffmpeg, ['-y', ...args, out], { stdio: 'ignore' }); console.log(`${r.status === 0 ? '✓' : '✗ FAILED'}  ${path.relative(ROOT, out)}`) }
const sine = (f, d = 14) => ['-f', 'lavfi', '-i', `sine=frequency=${f}:duration=${d}`]
// soft kick every `period`s (phase via floor avoids commas the lavfi parser would choke on)
const kick = (period, d = 14, freq = 55) => ['-f', 'lavfi', '-i', `aevalsrc=exprs=0.6*sin(2*PI*${freq}*t)*exp(-16*(t-${period}*floor(t/${period}))):d=${d}:s=44100`]

// ── BEDS (options to A/B) ──
// soft: a warm low drone, no rhythm, no wobble — nearly subliminal warmth.
run([...sine(130.81), ...sine(196), ...sine(261.63),
  '-filter_complex', '[0][1][2]amix=inputs=3:normalize=0,volume=0.22,lowpass=f=1100,afade=t=in:d=0.6,afade=t=out:st=13:d=1,volume=1.3,alimiter=limit=0.9[a]',
  '-map', '[a]', '-ar', '44100', '-ac', '2', '-t', '14'], path.join(A, 'beds', 'bed-soft.wav'))

// pulse: just a soft heartbeat kick (~109bpm) + faint low drone — energy without melody.
run([...kick(0.55), ...sine(130.81), ...sine(196),
  '-filter_complex', '[1][2]amix=inputs=2:normalize=0,volume=0.12,lowpass=f=700[dr];[0]volume=0.45[k];[dr][k]amix=inputs=2:normalize=0,volume=1.2,alimiter=limit=0.9[a]',
  '-map', '[a]', '-ar', '44100', '-ac', '2', '-t', '14'], path.join(A, 'beds', 'bed-pulse.wav'))

// lofi: gentle 120bpm kick + warm C-major chord, softly filtered — chilled beat.
run([...kick(0.5, 14, 50), ...sine(261.63), ...sine(329.63), ...sine(392),
  '-filter_complex', '[1][2][3]amix=inputs=3:normalize=0,volume=0.11,lowpass=f=1300,tremolo=f=0.25:d=0.12[ch];[0]volume=0.42[k];[ch][k]amix=inputs=2:normalize=0,volume=1.25,alimiter=limit=0.9[a]',
  '-map', '[a]', '-ar', '44100', '-ac', '2', '-t', '14'], path.join(A, 'beds', 'bed-lofi.wav'))

// quiz: brighter Cmaj6 pad + gentle pulse (kept for Football Pointless character).
run([...sine(261.63), ...sine(329.63), ...sine(392), ...sine(440), ...sine(523.25), ...kick(0.5, 14, 60),
  '-filter_complex', '[0][1][2][3][4]amix=inputs=5:normalize=0,volume=0.13,afade=t=in:d=0.5,lowpass=f=2000,aecho=0.8:0.5:110:0.25[pd];[5]volume=0.3[k];[pd][k]amix=inputs=2:normalize=0,volume=1.3,alimiter=limit=0.9[a]',
  '-map', '[a]', '-ar', '44100', '-ac', '2', '-t', '14'], path.join(A, 'beds', 'bed-quiz.wav'))

// ── COUNTDOWN ticks (soft, not harsh) ──
run(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.05', '-af', 'lowpass=f=1400,afade=t=out:st=0.008:d=0.042,volume=0.3', '-ar', '44100', '-ac', '2'], path.join(A, 'countdown', 'tick.wav'))
run(['-f', 'lavfi', '-i', 'sine=frequency=587:duration=0.13', '-af', 'lowpass=f=1600,afade=t=out:st=0.05:d=0.08,volume=0.36', '-ar', '44100', '-ac', '2'], path.join(A, 'countdown', 'tick-final.wav'))

// ── MOTION swoosh (soft, dark "woosh" — brown noise, low-passed, gentle attack; not a hi-hat) ──
run(['-f', 'lavfi', '-i', 'anoisesrc=color=brown:duration=0.28:amplitude=0.6', '-af', 'highpass=f=180,lowpass=f=1900,afade=t=in:d=0.07:curve=ipar,afade=t=out:st=0.12:d=0.16,volume=0.4', '-ar', '44100', '-ac', '2'], path.join(A, 'motion', 'whoosh.wav'))

// ── REVEAL (warm chime with a short tail) ──
run([...sine(523.25, 0.7), ...sine(659.25, 0.7), ...sine(783.99, 0.7), ...sine(1046.5, 0.7),
  '-filter_complex', '[0][1][2][3]amix=inputs=4:normalize=0,volume=0.3,lowpass=f=3200,aecho=0.9:0.7:140:0.4,afade=t=out:st=0.2:d=0.5[a]',
  '-map', '[a]', '-ar', '44100', '-ac', '2'], path.join(A, 'reveals', 'reveal.wav'))

console.log('\nAudio library written to assets/shorts/audio/')
