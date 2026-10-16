#!/usr/bin/env node
// Triviverse Geography — builds Earshot's clip bank.
//
//   npm run build:voices              fetch, verify, trim, encode, write manifest
//   npm run build:voices -- --list    also print each clip's transcript for review
//
// Input: scripts/geography/voices.source.mjs (candidate recordings per puzzle).
// For each puzzle the first candidate that passes every check is used:
//
//   1. Licence — Commons files must be CC0 / public domain / CC BY / CC BY-SA and not
//      flagged non-free (the same whitelist as Postcard's photos). FLEURS is CC BY 4.0
//      as a whole dataset. Nothing is assumed reusable for being downloadable.
//   2. Language — scripts/geography/voices_verify.py finds the most speech-dense
//      window and checks it with Whisper's language identification: the labelled
//      language must be Whisper's top pick with p >= MIN_PROB. Languages Whisper
//      doesn't know (Irish, Zulu, Igbo, Wolof, Quechua…) rely on the source's own
//      label — FLEURS's dataset labels, or a single-language Wikitongues recording —
//      and a Commons window must also be clearly not English (p < 0.05) and not
//      confidently any language Whisper does know (top p < 0.5).
//   3. Giveaways — the window's transcript (FLEURS: its own transcription) must not
//      contain the language's name, endonym or aliases, or the extra words in AVOID.
//   4. Encode — ffmpeg (ffmpeg-static, already a dev dependency): trim to the window,
//      high-pass, loudness-normalise, short fades, mono 24 kHz MP3 at 48 kb/s. Named by
//      content hash, so the URL says nothing about the answer and caches forever.
//
// Whisper results are cached in scripts/geography/voices.verified.json (committed),
// so a rebuild needs the Python venv only for new candidates:
//   python3 -m venv .cache/langid-venv && .cache/langid-venv/bin/pip install faster-whisper
// Downloads are cached in .cache/voices (gitignored).
//
// Output (committed, nothing fetched at runtime from anyone else):
//   public/geography/voices/<hash>.mp3
//   src/geography/data/voices.generated.json
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'
import { VOICES } from './voices.source.mjs'
import { LANGUAGES, languageById, fold } from '../../src/geography/data/languages.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = path.join(ROOT, 'public/geography/voices')
const OUT_JSON = path.join(ROOT, 'src/geography/data/voices.generated.json')
const VERIFIED = path.join(ROOT, 'scripts/geography/voices.verified.json')
const CACHE = path.join(ROOT, '.cache/voices')
const PY = path.join(ROOT, '.cache/langid-venv/bin/python')
const UA = 'TriviverseBuild/1.0 (https://triviverse.com; build-time audio curation)'
const MODEL = 'medium'
const CLIP = 20 // seconds: the full reveal
const MIN_CLIP = 13.6 // the 13 s stage must fit inside the clip
const STAGES = [1.5, 3, 5, 8, 13] // then the whole clip
const MIN_PROB = 0.6
// Languages Whisper has too little data to identify reliably: on Commons a window
// passes if Whisper hears this language *or a close relative* (Belarusian heard as
// Russian, Uzbek as Kazakh) and nothing English.
const WEAK = new Set(['hausa', 'sundanese', 'luxembourgish', 'tajik', 'uzbek', 'belarusian', 'maltese', 'assamese', 'pashto', 'javanese', 'breton', 'occitan'])
// The languages each one's speakers most often switch into (Whisper codes). A clip
// with a stretch confidently heard as one of these is rejected — the Breton speaker
// who drifts into French, the Ukrainian clip with a sentence of Russian.
const CONTACT = {
  breton: ['fr'], occitan: ['fr', 'ca'], basque: ['es', 'fr', 'it'], catalan: ['es'], galician: ['es', 'pt'], welsh: [], 'scottish-gaelic': [],
  luxembourgish: ['de', 'fr'], belarusian: ['ru'], ukrainian: ['ru'], tajik: ['ru', 'fa'], uzbek: ['ru'], kazakh: ['ru'], kyrgyz: ['ru'], mongolian: ['ru'],
  pashto: ['ur', 'fa'], guarani: ['es'], quechua: ['es'], maltese: ['it'], 'haitian-creole': ['fr'], javanese: ['id'], sundanese: ['id'], wolof: ['fr'], kurdish: ['ar', 'tr'],
}
const WH_FAM = new Map(LANGUAGES.filter(l => l.wh).map(l => [l.wh, l.fam]))
const BARS = 72
const LIST = process.argv.includes('--list')
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null // try a few languages without writing outputs

const OK_LICENCE = /^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?([- ][a-z-]+)?|public domain|pd[- ]?\w*)$/i

// Words that would name the answer in a FLEURS sentence (country / people names in
// the language itself). The language's own names and aliases are always checked.
const AVOID = {
  ja_jp: ['日本'], cmn_hans_cn: ['中国', '中文', '汉语'], yue_hant_hk: ['香港', '中國', '廣東', '粵'], vi_vn: ['việt'],
  cs_cz: ['česk', 'čech'], sk_sk: ['slovensk'], da_dk: ['danmark', 'dansk'], bg_bg: ['българ'], sr_rs: ['србиј', 'srbij', 'српск'],
  hr_hr: ['hrvat'], sl_si: ['slovenij', 'slovensk'], mk_mk: ['македон'], ga_ie: ['éire', 'gael'], gl_es: ['galic'],
  am_et: ['ኢትዮጵያ', 'አማር'], so_so: ['soomaal'], om_et: ['oromo', 'itoophiyaa'], ig_ng: ['igbo', 'naịjịrịa', 'naijiria'], wo_sn: ['senegaal', 'wolof'],
  zu_za: ['zulu', 'ningizimu afrika'], xh_za: ['xhosa', 'mzantsi'], sn_zw: ['zimbabwe'], ln_cd: ['kongo'], mi_nz: ['māori', 'maori', 'aotearoa'],
  ceb_ph: ['sugbo', 'cebu', 'pilipinas'], ky_kg: ['кыргыз'], ckb_iq: ['کورد'], pa_in: ['ਪੰਜਾਬ'], mr_in: ['महाराष्ट्र', 'मराठी'], gu_in: ['ગુજરાત'],
  ko_kr: ['한국', '대한'], th_th: ['ไทย'], lo_la: ['ລາວ'], km_kh: ['ខ្មែរ', 'កម្ពុជា'], my_mm: ['မြန်မာ'], ar_eg: ['مصر', 'عرب'], oc_fr: ['occitan', 'occitània'],
  fr_fr: ['france', 'français'], de_de: ['deutsch'], it_it: ['itali'], es_419: ['españ', 'méxic'], pt_br: ['brasil', 'portug'], en_us: ['america', 'english'],
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const sha = (s, n = 12) => createHash('sha256').update(s).digest('hex').slice(0, n)
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
const plain = (html = '') => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
for (const d of ['raw', 'wav', 'fleurs']) mkdirSync(path.join(CACHE, d), { recursive: true })

async function get(url, as = 'json') {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(180_000) })
      if (res.ok) return as === 'json' ? res.json() : as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer())
    } catch { /* timeout or network: retry */ }
    await sleep(1500 * (attempt + 1))
  }
  throw new Error(`fetch failed: ${url}`)
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'buffer', maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} failed: ${r.stderr?.toString().slice(-400)}`)
  return r.stdout
}

const toWav16k = (src, dest) => { if (!existsSync(dest)) run(ffmpeg, ['-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', dest]) }

// ── Commons ───────────────────────────────────────────────────────────────────
const commonsMeta = new Map()
async function fetchCommons(files) {
  const need = [...new Set(files)].filter(f => !commonsMeta.has(f))
  for (let i = 0; i < need.length; i += 40) {
    const batch = need.slice(i, i + 40)
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', prop: 'videoinfo',
      viprop: 'url|size|mime|extmetadata|derivatives',
      viextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|NonFree|ObjectName',
      titles: batch.map(f => `File:${f}`).join('|'),
    })
    const data = await get(`https://commons.wikimedia.org/w/api.php?${q}`)
    const alias = new Map((data.query.normalized || []).map(n => [n.to, n.from]))
    for (const page of data.query.pages) commonsMeta.set((alias.get(page.title) || page.title).replace(/^File:/, ''), page)
    await sleep(300)
  }
}

// The smallest rendition that still has the audio: an audio-only derivative if
// Commons made one, else the lowest-resolution video transcode, else the original.
function pickDerivative(info) {
  const ds = (info.derivatives || []).filter(d => d.src)
  const audio = ds.filter(d => /^audio\//.test(d.type))
  if (audio.length) return audio.find(d => /mpeg|mp3/.test(d.type)) || audio[0]
  const video = ds.filter(d => /^video\/webm/.test(d.type) && d.width).sort((a, b) => a.width - b.width)
  return video[0] || { src: info.url, type: info.mime }
}

async function prepareCommons(cand) {
  await fetchCommons([cand.commons])
  const page = commonsMeta.get(cand.commons)
  const info = page?.videoinfo?.[0]
  if (!info) return { fail: 'not on Commons' }
  const meta = info.extmetadata || {}
  const licence = plain(meta.LicenseShortName?.value)
  if (meta.NonFree?.value || !OK_LICENCE.test(licence)) return { fail: `licence "${licence || 'unknown'}" not accepted` }
  const d = pickDerivative(info)
  const ext = (d.src.split('?')[0].match(/\.(\w+)$/) || [, 'bin'])[1]
  const raw = path.join(CACHE, 'raw', `${sha(cand.commons, 16)}.${ext}`)
  if (!existsSync(raw)) { writeFileSync(raw, await get(d.src, 'buffer')); await sleep(400) }
  const wav = path.join(CACHE, 'wav', `${sha(cand.commons, 16)}.wav`)
  toWav16k(raw, wav)
  const artist = (plain(meta.Artist?.value) || plain(meta.Credit?.value) || 'Unknown').slice(0, 90)
  return {
    items: [{ key: `commons:${cand.commons}`, wav, media: raw, minSpeech: 0.72, skip: cand.skip ?? 4 }],
    credit: {
      title: cand.commons.replace(/\.\w+$/, '').replace(/^WIKITONGUES-?\s*/i, ''),
      author: artist, licence, licenceUrl: meta.LicenseUrl?.value || null,
      source: info.descriptionurl, collection: /wikitongues/i.test(cand.commons + artist) ? 'Wikitongues via Wikimedia Commons' : cand.read ? 'Spoken Wikipedia via Wikimedia Commons' : 'Wikimedia Commons',
    },
  }
}

// ── FLEURS ────────────────────────────────────────────────────────────────────
// Hugging Face's dataset viewer serves FLEURS row by row (transcription, length and
// a per-utterance WAV), so only the few utterances we might use are downloaded —
// never the multi-hundred-MB per-language archives. Validation (dev) split only.
async function prepareFleurs(cand, lang) {
  const cfg = cand.fleurs
  const bad = giveaways(lang, AVOID[cfg])
  const rowsPath = path.join(CACHE, 'fleurs', `${cfg}.rows.json`)
  let rows = readJson(rowsPath, null)
  if (!rows) {
    rows = []
    for (let offset = 0; offset < 1000 && rows.length < 5; offset += 100) {
      const q = new URLSearchParams({ dataset: 'google/fleurs', config: cfg, split: 'validation', offset: String(offset), length: '100' })
      const data = await get(`https://datasets-server.huggingface.co/rows?${q}`)
      const seen = new Set(rows.map(r => r.text))
      for (const { row } of data.rows) {
        if (rows.length >= 5) break
        // files carry a few seconds of silence around the sentence
        if (row.num_samples < (MIN_CLIP + 5) * 16000 || hasGiveaway(row.raw_transcription, bad) || seen.has(row.raw_transcription)) continue
        seen.add(row.raw_transcription)
        rows.push({ file: path.basename(row.path), text: row.raw_transcription, url: row.audio?.[0]?.src })
      }
      if (offset + 100 >= data.num_rows_total) break
      await sleep(300)
    }
    writeFileSync(rowsPath, JSON.stringify(rows.map(({ url, ...r }) => r), null, 1))
  }
  if (!rows.length) return { fail: 'no long, clean utterances' }
  const dir = path.join(CACHE, 'fleurs', cfg)
  mkdirSync(dir, { recursive: true })
  const items = []
  for (const r of rows) {
    const wav = path.join(dir, r.file)
    if (!existsSync(wav)) {
      if (!r.url) continue // cached row list without URLs and no audio: refetch by deleting rows.json
      writeFileSync(wav, await get(r.url, 'buffer'))
      await sleep(200)
    }
    items.push({ key: `fleurs:${cfg}:${r.file}`, wav, media: wav, minSpeech: 0.65, skip: 0, text: r.text })
  }
  if (!items.length) return { fail: 'download failed' }
  return {
    items,
    credit: {
      title: `FLEURS ${cfg} (dev)`, author: 'Google FLEURS contributors', licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'https://huggingface.co/datasets/google/fleurs', collection: 'Google FLEURS',
    },
  }
}

// ── Checks ────────────────────────────────────────────────────────────────────
// The language's name as transcripts actually spell it (other scripts, romanised
// endonyms Whisper produces) on top of its catalogue names.
const SAID = {
  mandarin: ['中文', '汉语', '漢語', '国语', '國語', '华语', '華語'], cantonese: ['廣東話', '广东话', '粵語', '粤语'],
  tamil: ['thamizh', 'tamizh'], telugu: ['तेल्गु', 'तेलुगु', 'telugu'], italian: ['italiano'], persian: ['farsi', 'فارسی'],
  'scottish-gaelic': ['galic', 'gaelic', 'gaidhlig', 'gàidhlig'], malayalam: ['malayalam', 'मलयालम'], kannada: ['kannada', 'कन्नड'], bengali: ['bangla', 'বাংলা'],
}
function giveaways(lang, extra = []) {
  const l = languageById(lang)
  return [l.name, l.end, ...l.alias, ...(SAID[lang] || []), ...extra].map(fold).filter(k => k.length >= 2 && (k.length >= 3 || /[^\x00-\x7f]/.test(k)))
}
function hasGiveaway(text, keys) {
  const t = fold(text || '')
  return keys.some(k => (/^[a-z ]+$/.test(k) ? new RegExp(`(^|[^a-z])${k}`).test(t) : t.includes(k)))
}

// Runs the Python checker over new candidates, saving each result as it arrives so
// an interrupted run resumes where it stopped.
async function verify(items) {
  const cache = readJson(VERIFIED, {})
  // complete = has the per-chunk check; an older entry with a window only needs the
  // chunks re-run on that window (its transcript is kept)
  const todo = items.filter(it => !cache[it.ckey]?.chunks || cache[it.ckey].error)
  if (!todo.length) return cache
  if (!existsSync(PY)) throw new Error(`${todo.length} new candidates need language checks — set up the venv (see the header of this file).`)
  process.stderr.write(`  · checking ${todo.length} recording(s) with Whisper ${MODEL}…\n`)
  const save = () => writeFileSync(VERIFIED, JSON.stringify(Object.fromEntries(Object.entries(cache).sort()), null, 1) + '\n')
  await new Promise((resolve, reject) => {
    const py = spawn(PY, [path.join(ROOT, 'scripts/geography/voices_verify.py')], { env: { ...process.env, HF_HOME: path.join(ROOT, '.cache/hf') } })
    let buf = '', err = '', n = 0
    py.stdout.on('data', chunk => {
      buf += chunk
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1)
        if (!line.trim()) continue
        const { id, ...r } = JSON.parse(line)
        cache[id] = { ...r, text: r.text ?? cache[id]?.text ?? null, model: MODEL }
        save()
        process.stderr.write(`    ${++n}/${todo.length}\r`)
      }
    })
    py.stderr.on('data', c => { err += c })
    py.on('close', code => (code === 0 ? resolve() : reject(new Error(`verifier failed: ${err.slice(-800)}`))))
    py.stdin.end(JSON.stringify({
      model: MODEL,
      items: todo.map(it => {
        const old = cache[it.ckey]
        const recheck = old && !old.error && Number.isFinite(old.start)
        return { id: it.ckey, wav: it.wav, expect: it.expect, clip: CLIP, min: MIN_CLIP, speech: it.minSpeech, skip: it.skip, ...(recheck ? { start: old.start, notext: true } : {}) }
      }),
    }))
  })
  return cache
}

function judge(it, r, lang) {
  if (!r || r.error) return r?.error || 'not checked'
  const l = languageById(lang)
  if (r.dur < MIN_CLIP) return `too short (${r.dur}s)`
  if (r.speech < it.minSpeech) return `too little speech (${Math.round(r.speech * 100)}%)`
  const chunks = r.chunks || []
  if (lang !== 'english') {
    if ((r.en ?? 1) >= 0.05) return `may contain English (p=${r.en})`
    if (chunks.some(([c, p]) => c === 'en' && p >= 0.5)) return 'a stretch of it sounds English'
  }
  // Code-switching is a risk in conversation, not in FLEURS's labelled read sentences
  // (where Whisper hearing Tajik as Persian is only its own confusion).
  const contact = new Set(it.key.startsWith('commons:') ? CONTACT[lang] || [] : [])
  const switched = chunks.find(([c, p]) => contact.has(c) && p >= 0.5)
  if (switched) return `a stretch of it sounds like ${switched[0]} (${switched[1]})`
  const kin = (code) => code === l.wh || (WH_FAM.get(code) && WH_FAM.get(code) === l.fam)
  if (it.key.startsWith('commons:')) {
    if (l.wh && !WEAK.has(lang)) {
      // Whisper knows this language well: it must hear it, from the first seconds on.
      if (r.top[0][0] !== l.wh) return `Whisper hears ${r.top[0][0]} (${r.top[0][1]}), not ${l.wh}`
      if (r.prob < MIN_PROB) return `language ID unsure (${r.prob})`
      if (chunks[0]?.[0] !== l.wh) return `opening heard as ${chunks[0]?.[0]}`
      if (chunks.filter(([c]) => c === l.wh).length * 2 < chunks.length) return 'language ID wavers across the clip'
      const stray = chunks.find(([c, p]) => !kin(c) && p >= 0.75)
      if (stray) return `a stretch of it sounds like ${stray[0]} (${stray[1]})`
    } else {
      // Weak or unknown to Whisper: trust the recording's own single-language label,
      // but only if nothing in it sounds like an unrelated language Whisper knows well.
      if (!kin(r.top[0][0]) && r.top[0][1] >= 0.5) return `sounds like ${r.top[0][0]} (${r.top[0][1]})`
      if (!kin(chunks[0]?.[0]) && chunks[0]?.[1] >= 0.6) return `opening sounds like ${chunks[0][0]}`
      // with no positive confirmation, even a hesitant English stretch is too many
      if (lang !== 'english' && chunks.some(([c, p]) => c === 'en' && p >= 0.25)) return 'a stretch of it may be English'
    }
  }
  // FLEURS: the dataset's label is the answer; only the English and giveaway checks apply.
  if (hasGiveaway(r.text ?? it.text, giveaways(lang))) return 'speaker names the language'
  return null
}

// ── Encode ────────────────────────────────────────────────────────────────────
function encode(media, start, dur) {
  const fadeOut = Math.max(0, dur - 0.45).toFixed(2)
  const tmp = path.join(CACHE, 'tmp.mp3')
  run(ffmpeg, ['-v', 'error', '-y', '-ss', String(start), '-t', String(dur), '-i', media, '-vn',
    '-af', `highpass=f=70,loudnorm=I=-17:TP=-1.5:LRA=11,afade=t=in:d=0.03,afade=t=out:st=${fadeOut}:d=0.45`,
    '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', tmp])
  const data = readFileSync(tmp)
  // Real loudness envelope of the encoded clip, for the waveform.
  const pcm = run(ffmpeg, ['-v', 'error', '-i', tmp, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'])
  const f = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4))
  const per = f.length / BARS
  const rms = Array.from({ length: BARS }, (_, i) => {
    let s = 0; const a = Math.floor(i * per), b = Math.floor((i + 1) * per)
    for (let j = a; j < b; j++) s += f[j] * f[j]
    return Math.sqrt(s / Math.max(1, b - a))
  })
  const max = Math.max(...rms) || 1
  const peaks = rms.map(v => Math.round(Math.pow(v / max, 0.7) * 35).toString(36)).join('')
  const probe = spawnSync(ffmpeg, ['-i', tmp], { encoding: 'utf8' }).stderr
  const m = probe.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const real = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : dur
  return { data, peaks, dur: Math.min(dur, +real.toFixed(2)) }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const known = new Set(LANGUAGES.map(l => l.id))
  for (const v of VOICES) if (!known.has(v.lang)) throw new Error(`unknown language "${v.lang}"`)

  // Round-robin by preference: round k tries the k-th candidate of every puzzle
  // still unresolved, so fallbacks are only downloaded when they're needed.
  const state = VOICES.filter(v => !ONLY || ONLY.has(v.lang)).map((v, i) => ({ v, i, next: 0, done: null, log: [] }))
  for (let round = 0; state.some(s => !s.done && s.next < s.v.try.length); round++) {
    const batch = []
    for (const s of state.filter(s => !s.done && s.next < s.v.try.length)) {
      const cand = s.v.try[s.next++]
      const prep = cand.commons ? await prepareCommons(cand).catch(e => ({ fail: e.message })) : await prepareFleurs(cand, s.v.lang).catch(e => ({ fail: e.message }))
      const label = cand.commons || `FLEURS ${cand.fleurs}`
      if (prep.fail) { s.log.push(`${label}: ${prep.fail}`); continue }
      for (const it of prep.items) batch.push({ s, cand, prep, it: { ...it, ckey: `${it.key}#${s.v.lang}`, expect: languageById(s.v.lang).wh } })
    }
    const results = await verify(batch.map(b => b.it))
    for (const s of state) {
      const mine = batch.filter(b => b.s === s)
      if (!mine.length || s.done) continue
      const ok = []
      for (const b of mine) {
        const r = results[b.it.ckey]
        const why = judge(b.it, r, s.v.lang)
        if (why) s.log.push(`${b.cand.commons || b.it.key}: ${why}`)
        else ok.push({ ...b, r })
      }
      ok.sort((a, b) => b.r.prob - a.r.prob)
      if (ok.length) s.done = ok[0]
    }
  }

  mkdirSync(OUT_DIR, { recursive: true })
  if (ONLY) {
    for (const s of state) console.error(s.done ? `  ✓ ${s.v.lang} p=${s.done.r.prob} start=${s.done.r.start} “${(s.done.r.text || '').slice(0, 140)}”` : `  ✗ ${s.v.lang}: ${s.log.join(' | ')}`)
    return
  }
  const clips = [], failed = []
  for (const s of state) {
    if (!s.done) { failed.push(`${s.v.lang}: ${s.log.join(' | ')}`); continue }
    const { cand, prep, it, r } = s.done
    const { data, peaks, dur } = encode(it.media, r.start, Math.min(CLIP, r.dur))
    const hash = sha(data)
    writeFileSync(path.join(OUT_DIR, `${hash}.mp3`), data)
    const credit = { ...prep.credit }
    if (cand.fleurs) credit.title = `FLEURS ${cand.fleurs} · ${path.basename(it.key.split(':').pop(), '.wav')}`
    clips.push({
      id: sha(it.ckey, 8),
      lang: s.v.lang,
      ...(cand.variety ? { variety: cand.variety } : {}),
      src: `/geography/voices/${hash}.mp3`,
      dur,
      stages: [...STAGES.filter(x => x < dur - 0.5), dur],
      peaks,
      kind: cand.fleurs || cand.read ? 'read' : 'conversation',
      credit: { ...credit, excerpt: `${r.start.toFixed(1)}–${(r.start + dur).toFixed(1)} s` },
      // how the language was established: Whisper confirmed it / Whisper heard it or a
      // close relative / the source's own label (FLEURS, or a language Whisper lacks)
      check: { model: `whisper-${MODEL}`, rule: languageById(s.v.lang).wh && r.top[0][0] === languageById(s.v.lang).wh && r.prob >= MIN_PROB ? 'whisper' : cand.fleurs || !languageById(s.v.lang).wh ? 'label' : 'family', p: languageById(s.v.lang).wh ? r.prob : null, speech: r.speech },
      kb: Math.round(data.length / 1024),
    })
    process.stderr.write(`  ✓ ${s.v.lang.padEnd(15)} ${String(Math.round(data.length / 1024)).padStart(3)} KB  p=${languageById(s.v.lang).wh ? r.prob : 'n/a'}  ${cand.commons || cand.fleurs}\n`)
    if (LIST) process.stderr.write(`      “${r.text?.slice(0, 160) || it.text?.slice(0, 160)}”\n`)
  }

  const keep = new Set(clips.map(c => path.basename(c.src)))
  for (const f of readdirSync(OUT_DIR)) if (!keep.has(f)) unlinkSync(path.join(OUT_DIR, f))

  const totalKb = clips.reduce((a, c) => a + c.kb, 0)
  writeFileSync(OUT_JSON, JSON.stringify({
    meta: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString().slice(0, 10),
      source: 'Speech: Wikitongues via Wikimedia Commons (CC BY-SA 4.0 / CC BY 3.0 / CC0, per clip) and Google FLEURS (CC BY 4.0). Excerpts trimmed, loudness-normalised and re-encoded; adapted CC BY-SA clips are shared under CC BY-SA 4.0.',
      count: clips.length, languages: new Set(clips.map(c => c.lang)).size, totalKb,
    },
    clips: clips.map(({ kb, ...c }) => c),
  }, null, 1) + '\n')

  console.error(`\n${clips.length} clips · ${new Set(clips.map(c => c.lang)).size} languages · ${(totalKb / 1024).toFixed(2)} MB · avg ${Math.round(totalKb / clips.length)} KB`)
  if (failed.length) console.error(`\nNo usable recording for ${failed.length}:\n  ` + failed.join('\n  '))
}

main().catch(e => { console.error(e); process.exit(1) })
