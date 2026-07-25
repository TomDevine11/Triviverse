/**
 * Football 501 — Stats Server
 *
 * Stat lookup hierarchy:
 *   Tier 1 — Wikipedia all-time top-scorer lists (~195 players, preloaded, instant).
 *   Tier 2 — StatMuse /fc/ask/ endpoint (Opta-powered, accurate per-competition,
 *             covers virtually any player, ~400 ms, then cached permanently).
 *   Tier 3 — Wikipedia per-player career-stats parsing (international goals only
 *             and fallback; StatMuse doesn't cover national-team records).
 */

import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_PATH = path.join(__dirname, 'cache.json')

let cache = {}
try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) } catch {}

// Cache writes are debounced + async so a burst of new lookups under load
// doesn't trigger a synchronous full-file rewrite (and write race) per request.
let saveTimer = null
const saveCache = () => {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), () => {})
  }, 2000)
}

const WIKI_UA    = { 'User-Agent': 'Football501Game/1.0 (open educational project)' }
const BROWSER_UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }

// ── Outbound request concurrency limiter ─────────────────────────
// Caps how many requests are in flight to StatMuse/Wikipedia/TheSportsDB at
// once, so a burst of players guessing simultaneously can't hammer those
// sites hard enough to get our server's IP rate-limited or blocked.
class Semaphore {
  constructor(max) { this.max = max; this.active = 0; this.queue = [] }
  async run(fn) {
    if (this.active >= this.max) await new Promise(resolve => this.queue.push(resolve))
    this.active++
    try { return await fn() }
    finally {
      this.active--
      const next = this.queue.shift()
      if (next) next()
    }
  }
}
const externalLimiter = new Semaphore(5)
const limitedFetch = (url, opts) => externalLimiter.run(() => fetch(url, opts))

// ── In-flight request de-duplication ──────────────────────────────
// If many players guess the same name at the same time, share one lookup
// instead of firing off a duplicate scrape per request.
const inFlight = new Map()
function dedupe(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key)
  const p = Promise.resolve().then(fn).finally(() => inFlight.delete(key))
  inFlight.set(key, p)
  return p
}

// ── Classic objectives (Tier-1 preload) ──────────────────────────
const OBJECTIVES = {
  'ucl-career-goals':       { page: 'List_of_UEFA_Champions_League_top_scorers',                            tableIndex: 0, label: 'UCL all-time goals' },
  'prem-career-goals':      { page: 'List_of_footballers_with_100_or_more_Premier_League_goals',            tableIndex: 0, label: 'Premier League all-time goals' },
  'laliga-career-goals':    { page: 'List_of_La_Liga_top_scorers',                                          tableIndex: 0, label: 'La Liga all-time goals' },
  'international-goals':    { page: "List_of_men's_footballers_with_50_or_more_international_goals",        tableIndex: 1, label: 'International goals (50+)' },
  'bundesliga-career-goals':{ page: 'List_of_Bundesliga_top_scorers',                                       tableIndex: 0, label: 'Bundesliga all-time goals' },
}

// ── Competition → StatMuse slug ──────────────────────────────────
const COMP_SLUGS = {
  'prem':       'premier-league',
  'ucl':        'champions-league',
  'laliga':     'la-liga',
  'bundesliga': 'bundesliga',
  'seriea':     'serie-a',
  'ligue1':     'ligue-1',
}

// ── Category question definitions ────────────────────────────────
// statTypes array: each type fetched from StatMuse, values summed
// filters: nationality, position, continent (all must pass)
// Each question now combines TWO eligibility filters (e.g. nationality +
// position, or continent + position) plus one or more summed stat types,
// so the challenge title can spell out every criterion.
const CATEGORY_QUESTIONS = {
  // Premier League
  'pl-eu-gk-clean-sheets':       { competition:'prem',  statTypes:['clean-sheets'],     filters:{ continent:'Europe',       position:'goalkeeper' } },
  'pl-eu-mid-goals-assists':     { competition:'prem',  statTypes:['goals','assists'],  filters:{ continent:'Europe',       position:'midfielder' } },
  'pl-french-fwd-goals-assists': { competition:'prem',  statTypes:['goals','assists'],  filters:{ nationality:'France',     position:'forward' } },
  'pl-dutch-fwd-goals':          { competition:'prem',  statTypes:['goals'],            filters:{ nationality:'Netherlands',position:'forward' } },
  // Champions League
  'ucl-spanish-fwd-goals':         { competition:'ucl', statTypes:['goals'],                  filters:{ nationality:'Spain',       position:'forward' } },
  'ucl-european-mid-apps-assists': { competition:'ucl', statTypes:['appearances','assists'],  filters:{ continent:'Europe',        position:'midfielder' } },
  'ucl-european-fwd-goals':        { competition:'ucl', statTypes:['goals'],                  filters:{ continent:'Europe',        position:'forward' } },
  'ucl-south-am-fwd-goals':        { competition:'ucl', statTypes:['goals'],                  filters:{ continent:'South America', position:'forward' } },
  // Foreign Leagues
  'laliga-brazilian-mid-goals-assists': { competition:'laliga',     statTypes:['goals','assists'], filters:{ nationality:'Brazil',    position:'midfielder' } },
  'laliga-argentine-fwd-goals':         { competition:'laliga',     statTypes:['goals'],           filters:{ nationality:'Argentina', position:'forward' } },
  'bundesliga-german-fwd-goals':        { competition:'bundesliga', statTypes:['goals'],           filters:{ nationality:'Germany',   position:'forward' } },
  'bundesliga-european-fwd-goals':      { competition:'bundesliga', statTypes:['goals'],           filters:{ continent:'Europe',      position:'forward' } },
  'seriea-italian-fwd-goals':           { competition:'seriea',     statTypes:['goals'],           filters:{ nationality:'Italy',     position:'forward' } },
  'ligue1-french-fwd-goals-assists':    { competition:'ligue1',     statTypes:['goals','assists'], filters:{ nationality:'France',    position:'forward' } },
  // International (national-team stats only — no club competitions)
  'intl-african-fwd-goals':   { competition:'international', statTypes:['goals'], filters:{ continent:'Africa',        position:'forward' } },
  'intl-south-am-fwd-goals':  { competition:'international', statTypes:['goals'], filters:{ continent:'South America', position:'forward' } },
  'intl-european-fwd-goals':  { competition:'international', statTypes:['goals'], filters:{ continent:'Europe',        position:'forward' } },
  'intl-asian-fwd-goals':     { competition:'international', statTypes:['goals'], filters:{ continent:'Asia',          position:'forward' } },
}

// ── Continent map ────────────────────────────────────────────────
const CONTINENT_NATIONS = {
  'Africa': new Set(['Algeria','Angola','Benin','Burkina Faso','Cameroon','Cape Verde','DR Congo','Egypt','Equatorial Guinea','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast',"Côte d'Ivoire",'Kenya','Liberia','Libya','Madagascar','Mali','Morocco','Mozambique','Nigeria','Rwanda','Senegal','Sierra Leone','Somalia','South Africa','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe']),
  'South America': new Set(['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Paraguay','Peru','Uruguay','Venezuela']),
  'Asia': new Set(['Bahrain','China','India','Indonesia','Iran','Iraq','Japan','Jordan','Kuwait','Malaysia','North Korea','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Thailand','UAE','United Arab Emirates','Uzbekistan','Vietnam']),
  'Europe': new Set(['Albania','Armenia','Austria','Azerbaijan','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czech Republic','Czechia','Denmark','England','Estonia','Finland','France','Georgia','Germany','Greece','Hungary','Iceland','Ireland','Republic of Ireland','Italy','Kosovo','Latvia','Lithuania','Luxembourg','Moldova','Montenegro','Netherlands','North Macedonia','Northern Ireland','Norway','Poland','Portugal','Romania','Russia','Scotland','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Turkey','Ukraine','Wales']),
  'CONCACAF': new Set(['Canada','Costa Rica','Cuba','El Salvador','Guatemala','Honduras','Jamaica','Mexico','Panama','Trinidad and Tobago','United States']),
}

function getContinent(nationality) {
  if (!nationality) return null
  for (const [continent, nations] of Object.entries(CONTINENT_NATIONS)) {
    if (nations.has(nationality)) return continent
  }
  return null
}

// ── StatMuse slug helpers ─────────────────────────────────────────
function toStatMuseSlug(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''ʼ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const normName = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/gi,'').toLowerCase().trim()

function descriptionMatchesPlayer(desc, playerName) {
  const m = desc.match(/^([^.]+?)\s+(?:had|has|scored|tallied|kept|made|recorded)\b/i)
  if (!m) return false
  const subject = normName(m[1])
  const searched = normName(playerName)
  const searchedWords = searched.split(/\s+/).filter(w => w.length > 1)
  const subjectWords  = subject.split(/\s+/)
  return searchedWords.every(sw => subjectWords.some(dw => dw === sw || dw.startsWith(sw) || sw.startsWith(dw)))
}

async function fetchCategoryStatFromStatMuse(playerName, compSlug, statType) {
  const slug = `${toStatMuseSlug(playerName)}-${compSlug}-${statType}`
  const url  = `https://www.statmuse.com/fc/ask/${slug}`
  try {
    const res = await limitedFetch(url, { headers: BROWSER_UA })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<meta name="description" content="([^"]+)"/)
    if (!m) return null
    const desc = m[1]
    if (!descriptionMatchesPlayer(desc, playerName)) {
      console.log(`  StatMuse: rejected mismatch for "${playerName}" [${statType}]: ${desc.slice(0,80)}`)
      return null
    }
    if (/\b(?:had|scored|kept|made)\s+no\b/i.test(desc)) return 0
    const nums = desc.match(/\b(\d+)\b/)
    return nums ? parseInt(nums[1]) : null
  } catch (err) {
    console.warn(`  StatMuse error for "${playerName}" [${statType}]: ${err.message}`)
    return null
  }
}

async function fetchMultiStat(playerName, competition, statTypes) {
  const compSlug = COMP_SLUGS[competition]
  if (!compSlug) return { total: null, breakdown: {} }
  const breakdown = {}
  let total = 0
  let anyFound = false
  for (const st of statTypes) {
    const v = await fetchCategoryStatFromStatMuse(playerName, compSlug, st)
    const val = v ?? 0
    breakdown[st] = val
    total += val
    if (v !== null) anyFound = true
  }
  return { total: anyFound ? total : null, breakdown }
}

// ── Wikipedia helpers ────────────────────────────────────────────
async function fetchWikiHTML(pageTitle) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action',        'parse')
  url.searchParams.set('page',          pageTitle)
  url.searchParams.set('prop',          'text')
  url.searchParams.set('format',        'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('disabletoc',    '1')
  const res  = await limitedFetch(url.toString(), { headers: WIKI_UA })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.info)
  return json.parse?.text ?? ''
}

async function wikiSearch(playerName) {
  const candidates = []

  // Exact title match (following redirects) — usually the right page,
  // but for short/ambiguous names (e.g. "Xavi") this can land on a
  // given-name disambiguation article with no infobox.
  const checkUrl = new URL('https://en.wikipedia.org/w/api.php')
  checkUrl.searchParams.set('action',    'query')
  checkUrl.searchParams.set('titles',    playerName)
  checkUrl.searchParams.set('format',    'json')
  checkUrl.searchParams.set('prop',      '')
  checkUrl.searchParams.set('redirects', '1')
  const checkRes  = await limitedFetch(checkUrl.toString(), { headers: WIKI_UA })
  const checkData = await checkRes.json()
  const pages = Object.values(checkData?.query?.pages ?? {})
  if (pages.length && !pages[0].missing) candidates.push({ title: pages[0].title })

  // Always also fetch full-text search results as fallback candidates,
  // in case the exact title is a disambiguation page with no infobox.
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action',      'query')
  url.searchParams.set('list',        'search')
  url.searchParams.set('srsearch',    `${playerName} footballer career statistics`)
  url.searchParams.set('format',      'json')
  url.searchParams.set('srlimit',     '3')
  url.searchParams.set('srprop',      '')
  url.searchParams.set('srnamespace', '0')
  const res  = await limitedFetch(url.toString(), { headers: WIKI_UA })
  const data = await res.json()
  for (const r of data?.query?.search ?? []) {
    if (!candidates.some(c => c.title === r.title)) candidates.push(r)
  }
  return candidates
}

async function wikiArticleHTML(title) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action',        'parse')
  url.searchParams.set('page',          title)
  url.searchParams.set('prop',          'text')
  url.searchParams.set('format',        'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('disabletoc',    '1')
  url.searchParams.set('redirects',     '1')
  const res  = await limitedFetch(url.toString(), { headers: WIKI_UA })
  const data = await res.json()
  return data?.parse?.text ?? ''
}

// ── Table grid builder (handles rowspan/colspan) ─────────────────
function buildTableGrid($, table) {
  const rows = $(table).find('tr').toArray()
  const grid = []
  const occupied = {}
  rows.forEach((tr, r) => {
    if (!grid[r]) grid[r] = []
    let c = 0
    $(tr).find('th, td').each((_, cell) => {
      while (occupied[`${r},${c}`] !== undefined) { grid[r][c] = occupied[`${r},${c}`]; c++ }
      const cs   = parseInt($(cell).attr('colspan') || '1')
      const rs   = parseInt($(cell).attr('rowspan') || '1')
      const text = $(cell).text().replace(/\[\w+\]/g, '').replace(/\s+/g, ' ').trim()
      for (let dc = 0; dc < cs; dc++) {
        grid[r][c + dc] = text
        for (let dr = 1; dr < rs; dr++) {
          if (!grid[r + dr]) grid[r + dr] = []
          occupied[`${r + dr},${c + dc}`] = text
          grid[r + dr][c + dc] = text
        }
      }
      c += cs
    })
    while (occupied[`${r},${c}`] !== undefined) { grid[r][c] = occupied[`${r},${c}`]; c++ }
  })
  return grid
}

// ── Player attribute helpers ──────────────────────────────────────
const BROAD_POS_MAP = [
  ['goalkeeper', ['goalkeeper','goaltender','keeper']],
  ['defender',   ['defender','back','sweeper','libero','centre-back','center-back']],
  ['midfielder', ['midfield','midfielder']],
  ['forward',    ['forward','striker','wing','attacker','centre-forward','center-forward']],
]

function broadenPosition(raw) {
  if (!raw) return null
  const lc = raw.toLowerCase()
  for (const [broad, variants] of BROAD_POS_MAP) {
    if (variants.some(v => lc.includes(v))) return broad
  }
  return null
}

function normalizeNationality(nat) {
  if (!nat) return null
  const overrides = {
    'the netherlands':'Netherlands','holland':'Netherlands',
    'republic of ireland':'Ireland','czechia':'Czech Republic',
    'south korea':'South Korea','usa':'United States',
    'united states of america':'United States',
    'ivory coast':"Côte d'Ivoire",
  }
  return overrides[nat.toLowerCase().trim()] ?? nat.trim()
}

// Extract position from Wikipedia infobox
function positionFromWikiHTML(html) {
  const $ = cheerio.load(html)
  let position = null
  $('.infobox tr').each((_, row) => {
    const th = $(row).find('th').text().trim().toLowerCase()
    if (th === 'position' || th === 'position(s)' || th === 'positions') {
      const td = $(row).find('td').clone()
      td.find('style, script').remove()
      // Wikipedia infoboxes list multiple positions with the primary one
      // first (e.g. "Striker, Winger" or one <li> per line) — take the
      // first listed entry as the player's most common position.
      const items = td.find('li').toArray().map(li => $(li).text().trim()).filter(Boolean)
      const text = td.text().trim()
      const candidates = items.length ? items : text.split(/[,/\n]| or /i).map(s => s.trim()).filter(Boolean)
      for (const c of candidates) {
        position = broadenPosition(c)
        if (position) break
      }
      if (!position) position = broadenPosition(text)
      return false
    }
  })
  return position
}

// Extract nationality from infobox national-team row
function nationalityFromWikiHTML(html) {
  const $ = cheerio.load(html)
  let nationality = null
  $('.infobox tr').each((_, row) => {
    const th = $(row).find('th').text().trim().toLowerCase()
    if (th.includes('national team') && !nationality) {
      const teamText = $(row).find('td a').first().attr('title') || $(row).find('td').text().trim()
      if (teamText) {
        const nat = teamText.replace(/\s+national\s+(?:football|soccer|association\s+football)\s+team.*/i, '').trim()
        if (nat && nat.length > 1) nationality = normalizeNationality(nat)
      }
      return false
    }
  })
  return nationality
}

// Extract senior international goals from the infobox "International career"
// section — sums goals across all senior-team rows, skipping youth teams
// (e.g. "England U21").
function internationalGoalsFromWikiHTML(html) {
  const $ = cheerio.load(html)
  const header = $('.infobox-header').filter((_, el) => /international career/i.test($(el).text())).first()
  if (!header.length) return null

  let total = 0, found = false
  let row = header.closest('tr').next()
  while (row.length && !row.find('.infobox-header').length) {
    const team      = row.find('.infobox-data-a').text().trim()
    const goalsText = row.find('.infobox-data-c').text().trim()
    if (team && !/u-?\d{2}\b/i.test(team)) {
      const m = goalsText.match(/\((\d+)\)/)
      if (m) { total += parseInt(m[1]); found = true }
    }
    row = row.next()
  }
  return found ? total : null
}

// Extract clubs from career stats table (first column across all season rows)
function clubsFromWikiHTML(html) {
  const $ = cheerio.load(html)
  const clubs = new Set()
  $('table.wikitable').each((_, table) => {
    const grid = buildTableGrid($, table)
    if (grid.length < 3) return
    const headers = (grid[0] || []).map(h => (h || '').toLowerCase().replace(/\[\w+\]/g, '').trim())
    if (!headers.some(h => h === 'club' || h === 'team')) return
    for (const row of grid.slice(2)) {
      if (!row || !/\d{4}/.test(row[1] ?? '')) continue
      const club = (row[0] ?? '').replace(/\[\w+\]/g, '').replace(/\(.*?\)/g, '').trim()
      if (club && club.length > 1 && !/^total$|^career$/i.test(club)) clubs.add(club)
    }
    return false // stop at first career-stats table
  })
  return [...clubs]
}

function normalizeClub(name) {
  return name.replace(/\bF\.?C\.?\b/gi,'').replace(/\bA\.?F\.?C\.?\b/gi,'')
             .replace(/\bS\.?C\.?\b/gi,'').toLowerCase()
             .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
}

function clubMatches(playerClubs, required) {
  const req = normalizeClub(required)
  return playerClubs.some(c => {
    const n = normalizeClub(c)
    return n.includes(req) || req.includes(n)
  })
}

// Fetch & cache nationality + position + clubs for a player
async function fetchPlayerAttrs(playerName, { needClubs = false } = {}) {
  const cacheKey = `attrs:${normName(playerName)}`
  if (cache[cacheKey]) {
    const cached = cache[cacheKey]
    // Don't trust a cached entry with no position — likely a transient
    // Wikipedia lookup failure that got cached alongside a successful
    // nationality lookup. Retry rather than permanently sticking with it.
    if (cached.position != null && (!needClubs || cached.clubs !== undefined)) return cached
  }

  return dedupe(`${cacheKey}:${needClubs}`, () => fetchPlayerAttrsUncached(playerName, needClubs))
}

async function fetchPlayerAttrsUncached(playerName, needClubs) {
  const cacheKey = `attrs:${normName(playerName)}`
  let nationality = null, position = null, clubs = undefined
  let needWikiPos = false, needWikiNat = false

  // ── TheSportsDB ──────────────────────────────────────────────────
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`
    const res  = await limitedFetch(url, { headers: BROWSER_UA, signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const data = await res.json()
      const sp   = (data.player || []).find(p => (p.strSport || '').toLowerCase() === 'soccer')
      if (sp) {
        nationality = normalizeNationality(sp.strNationality)
        position    = broadenPosition(sp.strPosition)
        if (!position) needWikiPos = true
      } else {
        needWikiNat = true
        needWikiPos = true
      }
    }
  } catch (err) {
    console.warn(`  TSDB error for "${playerName}": ${err.message}`)
    needWikiNat = needWikiPos = true
  }

  // ── Wikipedia infobox + career-stats fallback ────────────────────
  if (needWikiNat || needWikiPos || needClubs) {
    try {
      const results = await wikiSearch(playerName)
      // Try candidates in order until we find a page with a usable infobox
      // (the exact-title match can land on a disambiguation/given-name
      // article with no infobox, e.g. "Xavi" vs "Xavi (footballer, born 1980)")
      for (const r of results.slice(0, 3)) {
        const html = await wikiArticleHTML(r.title)
        const wikiPosition    = positionFromWikiHTML(html)
        const wikiNationality = nationalityFromWikiHTML(html)
        if (!position)    position    = wikiPosition
        if (!nationality) nationality = wikiNationality
        if (needClubs && clubs === undefined) clubs = clubsFromWikiHTML(html)
        if ((position || !needWikiPos) && (nationality || !needWikiNat) && (!needClubs || clubs?.length)) break
      }
    } catch (err) {
      console.warn(`  Wiki attrs error for "${playerName}": ${err.message}`)
    }
  }

  if (!nationality && !position) return null

  const attrs = { nationality, position, ...(clubs !== undefined ? { clubs } : {}) }
  cache[cacheKey] = attrs
  saveCache()
  return attrs
}

function checkFilters(attrs, filters) {
  if (filters.nationality) {
    const got = (attrs.nationality || '').toLowerCase()
    const req = filters.nationality.toLowerCase()
    if (got !== req) {
      const why = attrs.nationality ? `their nationality is ${attrs.nationality}` : 'nationality unknown'
      return { pass: false, reason: `Not ${filters.nationality} — ${why}` }
    }
  }
  if (filters.continent) {
    const playerContinent = getContinent(attrs.nationality)
    if (playerContinent !== filters.continent) {
      const why = attrs.nationality
        ? `${attrs.nationality} is ${playerContinent ? `in ${playerContinent}` : 'not in that group'}`
        : 'nationality unknown'
      return { pass: false, reason: `Not from ${filters.continent} — ${why}` }
    }
  }
  if (filters.position) {
    const got = (attrs.position || '').toLowerCase()
    const req = filters.position.toLowerCase()
    if (got !== req) {
      const why = attrs.position ? `they play as ${attrs.position}` : 'position unknown'
      return { pass: false, reason: `Not a ${filters.position} — ${why}` }
    }
  }
  if (filters.club) {
    const clubs = attrs.clubs || []
    if (!clubMatches(clubs, filters.club)) {
      const sample = clubs.slice(0, 3).join(', ') || 'unknown clubs'
      return { pass: false, reason: `Never played for ${filters.club} (found: ${sample})` }
    }
  }
  return { pass: true }
}

// ── Classic stat lookup (Tier-1 list) ────────────────────────────
const WIKI_COMP = {
  'prem-career-goals':         { headerLabels:['League'],                divisionFilter:['Premier League','Prem Lg','English Premier League'] },
  'laliga-career-goals':       { headerLabels:['League'],                divisionFilter:['La Liga','Primera División','Primera Division','Liga BBVA'] },
  'bundesliga-career-goals':   { headerLabels:['League','Bundesliga'],   divisionFilter:['Bundesliga','1. Bundesliga'] },
  'ucl-career-goals':          null,
  'international-goals':       null,
}

function extractCareerGoals(html, objectiveId) {
  const cfg = WIKI_COMP[objectiveId]
  if (!cfg) return null
  const $ = cheerio.load(html)
  let result = null
  $('table.wikitable').each((_, table) => {
    const grid = buildTableGrid($, table)
    if (grid.length < 4) return
    const row0 = grid[0] || [], row1 = grid[1] || []
    let goalCol = -1, divisionCol = -1
    for (const label of cfg.headerLabels) {
      const gc = row0.findIndex((v, i) => v.toLowerCase().includes(label.toLowerCase()) && /^goals?$/i.test(row1[i]))
      if (gc >= 0) {
        goalCol = gc
        if (cfg.divisionFilter) {
          divisionCol = row0.findIndex((v, i) => v.toLowerCase().includes('league') && /^division$/i.test(row1[i]))
        }
        break
      }
    }
    if (goalCol < 0) return
    if (cfg.divisionFilter && divisionCol < 0) return
    let total = 0, hasData = false
    for (const row of grid.slice(2)) {
      if (!row || !/\d{4}/.test(row[1] ?? '')) continue
      if (cfg.divisionFilter && divisionCol >= 0) {
        const div = (row[divisionCol] ?? '').toLowerCase()
        if (!cfg.divisionFilter.some(f => div.includes(f.toLowerCase()))) continue
      }
      const g = parseInt((row[goalCol] ?? '').replace(/\D/g,'')) || 0
      if (g > 0 && g <= 80) { total += g; hasData = true }
    }
    if (hasData) { result = total; return false }
  })
  return result
}

async function fetchStatFromWikipedia(playerName, objectiveId) {
  if (!WIKI_COMP[objectiveId]) return null
  try {
    const results = await wikiSearch(playerName)
    for (const r of results.slice(0, 2)) {
      const html  = await wikiArticleHTML(r.title)
      const goals = extractCareerGoals(html, objectiveId)
      if (goals !== null) {
        console.log(`  Wikipedia ✓ "${playerName}" / ${objectiveId}: ${goals}`)
        return goals
      }
    }
    return null
  } catch (err) {
    console.warn(`  Wikipedia error for "${playerName}": ${err.message}`)
    return null
  }
}

// Fallback for players with fewer than 50 international goals (not on the
// Tier-1 list) — parse their senior international goal tally directly from
// their Wikipedia infobox.
async function fetchInternationalGoals(playerName) {
  try {
    const results = await wikiSearch(playerName)
    for (const r of results.slice(0, 3)) {
      const html  = await wikiArticleHTML(r.title)
      const goals = internationalGoalsFromWikiHTML(html)
      if (goals !== null) {
        console.log(`  Wikipedia ✓ international goals "${playerName}": ${goals}`)
        return goals
      }
    }
    return null
  } catch (err) {
    console.warn(`  International goals Wikipedia error for "${playerName}": ${err.message}`)
    return null
  }
}

// Tier-1 list fetching & parsing
const STATMUSE_COMP = {
  'ucl-career-goals':          'champions-league-goals',
  'prem-career-goals':         'premier-league-goals',
  'laliga-career-goals':       'la-liga-goals',
  'bundesliga-career-goals':   'bundesliga-goals',
  'international-goals':       null,
}

async function fetchStatFromStatMuse(playerName, objectiveId) {
  const compSlug = STATMUSE_COMP[objectiveId]
  if (!compSlug) return null
  const slug = `${toStatMuseSlug(playerName)}-${compSlug}`
  const url  = `https://www.statmuse.com/fc/ask/${slug}`
  try {
    const res = await limitedFetch(url, { headers: BROWSER_UA })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<meta name="description" content="([^"]+)"/)
    if (!m) return null
    const desc = m[1]
    if (!descriptionMatchesPlayer(desc, playerName)) {
      console.log(`  StatMuse: rejected mismatch for "${playerName}": ${desc}`)
      return null
    }
    if (/\bno goals?\b/i.test(desc)) return 0
    const nums = desc.match(/\b(\d+)\b/)
    return nums ? parseInt(nums[1]) : null
  } catch (err) {
    console.warn(`  StatMuse error for "${playerName}": ${err.message}`)
    return null
  }
}

function parseGoalsTable(html, tableIndex) {
  const $ = cheerio.load(html)
  const tables = $('table.wikitable')
  if (tableIndex >= tables.length) throw new Error(`Table ${tableIndex} out of range`)
  const table = tables.eq(tableIndex)
  const result = {}
  const headerCells = table.find('tr').first().find('th, td')
  let playerCol = -1, goalCol = -1
  headerCells.each((i, cell) => {
    const text = $(cell).text().replace(/\[\d+\]/g,'').trim().toLowerCase()
    if (playerCol === -1 && /^player$|^name$/.test(text)) playerCol = i
    if (goalCol   === -1 && /^goals?$/.test(text))         goalCol   = i
  })
  if (playerCol === -1 || goalCol === -1) {
    const heads = []; headerCells.each((_,c) => heads.push($(c).text().trim()))
    throw new Error(`No Player/Goals columns. Headers: ${JSON.stringify(heads)}`)
  }
  table.find('tr').each((rowIdx, row) => {
    if (rowIdx === 0) return
    const cells = $(row).find('th, td')
    if (cells.length <= Math.max(playerCol, goalCol)) return
    const playerCell = cells.eq(playerCol)
    const playerLink = playerCell.find('a[title]').filter((_,a) => !$(a).closest('.flagicon,.flag-icon,.mw-flag').length).first()
    const name = playerLink.attr('title')?.trim() ?? playerCell.text().replace(/\[\d+\]/g,'').trim()
    if (!name || name.length < 2 || /^\d/.test(name)) return
    if (/national\s+(football|soccer)\s+team/i.test(name)) return
    const stat = parseInt(cells.eq(goalCol).text().replace(/[^\d]/g,''), 10)
    if (!isNaN(stat) && stat > 0) result[name] = stat
  })
  return result
}

async function preloadAll() {
  for (const [id, { page, tableIndex, label }] of Object.entries(OBJECTIVES)) {
    const key = `data:${id}`
    if (cache[key] && Object.keys(cache[key]).length > 5) {
      console.log(`  ✓ ${label}: ${Object.keys(cache[key]).length} players (cached)`)
      continue
    }
    try {
      process.stdout.write(`  ↓ ${label}… `)
      const html = await fetchWikiHTML(page)
      const data = parseGoalsTable(html, tableIndex)
      if (Object.keys(data).length < 5) throw new Error(`Only ${Object.keys(data).length} rows`)
      cache[key] = data
      saveCache()
      console.log(`${Object.keys(data).length} players ✓`)
    } catch (err) {
      console.error(`FAILED — ${err.message}`)
    }
  }
}

// ── Name normalisation ────────────────────────────────────────────
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[''ʼ]/g,"'").toLowerCase().trim()
const indexes = {}
function getIndex(id) {
  if (!indexes[id]) {
    indexes[id] = {}
    for (const [name, stat] of Object.entries(cache[`data:${id}`] ?? {})) {
      indexes[id][norm(name)] = { stat, canonical: name }
    }
  }
  return indexes[id]
}

// ── Express app ───────────────────────────────────────────────────
const app = express()
// Behind Cloudflare/Render's reverse proxy — trust X-Forwarded-For so
// rate limiting keys on the real client IP, not the proxy's.
app.set('trust proxy', 1)

// ── Canonical-domain 301 redirect (opt-in) ───────────────────────
// Sends the old onrender subdomain and the www host to the primary domain so
// links/SEO consolidate on one URL. OFF by default to avoid any outage while
// the custom domain's DNS/SSL is still propagating — enable it in Render only
// AFTER https://triviverse.com is confirmed live, by setting:
//   REDIRECT_TO_CANONICAL=1   (and optionally CANONICAL_HOST, default below)
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'triviverse.com'
if (process.env.REDIRECT_TO_CANONICAL === '1') {
  app.use((req, res, next) => {
    const hostname = (req.headers.host || '').split(':')[0]
    // Never redirect local dev, health checks without a host, or the canonical host itself.
    if (!hostname || hostname === CANONICAL_HOST || hostname === 'localhost' || hostname === '127.0.0.1') return next()
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`)
  })
}

// Serve the built frontend (npm run build → dist/) if it exists, so the
// whole app can be hosted from this single server/port.
const DIST_DIR = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST_DIR)) {
  // index:false so static never auto-serves index.html — the SPA fallback below
  // controls HTML routing and serves the per-route prerendered file. redirect:false
  // avoids 301s that would add trailing slashes (and diverge from canonical URLs).
  app.use(express.static(DIST_DIR, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Hashed build assets are immutable — cache them hard so a chunk fetched
      // once is never re-requested (and can't 404 against a later deploy).
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (filePath.endsWith('.html')) {
        // HTML must always revalidate so a page load references the CURRENT
        // build's chunk hashes, never a stale set from a previous deploy.
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))
}

// Per-IP rate limit on the API — generous enough for normal gameplay
// (a guess triggers ~1-2 calls), but stops a single client from hammering
// external APIs and degrading the experience for everyone else.
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
}))

// ── Classic /api/stat (kept for backwards compat) ────────────────
app.get('/api/stat', async (req, res) => {
  const { playerName, objectiveId } = req.query
  if (!playerName || !objectiveId) return res.status(400).json({ error: 'missing params' })
  if (!OBJECTIVES[objectiveId])    return res.status(400).json({ error: `unknown objective: ${objectiveId}` })

  const t1 = cache[`data:${objectiveId}`]
  if (t1?.[playerName] !== undefined) return res.json({ stat: t1[playerName] })
  const t1hit = getIndex(objectiveId)[norm(playerName)]
  if (t1hit) return res.json({ stat: t1hit.stat })

  const pKey = `player:${objectiveId}:${norm(playerName)}`
  if (cache[pKey] !== undefined) {
    const v = cache[pKey]
    return res.json(v > 0 ? { stat: v } : { stat: 0, notInList: true })
  }

  const result = await dedupe(pKey, async () => {
    if (STATMUSE_COMP[objectiveId]) {
      console.log(`  → StatMuse lookup: "${playerName}" / ${objectiveId}`)
      const smStat = await fetchStatFromStatMuse(playerName, objectiveId)
      if (smStat !== null && smStat > 0) { cache[pKey] = smStat; saveCache(); return { stat: smStat } }
      if (smStat === 0) return { stat: 0, notInList: true }
    }

    console.log(`  → Wikipedia lookup: "${playerName}" / ${objectiveId}`)
    const wikiStat = await fetchStatFromWikipedia(playerName, objectiveId)
    if (wikiStat !== null && wikiStat > 0) { cache[pKey] = wikiStat; saveCache(); return { stat: wikiStat } }
    return { stat: 0, notInList: true }
  })
  return res.json(result)
})

// ── Category stat ─────────────────────────────────────────────────
app.get('/api/category-stat', async (req, res) => {
  const { playerName, questionId } = req.query
  if (!playerName || !questionId) return res.status(400).json({ error: 'missing params' })

  const question = CATEGORY_QUESTIONS[questionId]
  if (!question) return res.status(400).json({ error: `unknown question: ${questionId}` })

  const { competition, statTypes, filters } = question
  const needClubs = Boolean(filters.club)

  console.log(`  [cat] "${playerName}" / ${questionId}`)

  // ── Filter validation ────────────────────────────────────────────
  const hasFilters = Object.keys(filters).length > 0
  if (hasFilters) {
    const attrs = await fetchPlayerAttrs(playerName, { needClubs })
    if (!attrs) {
      return res.json({ stat: null, filterMatch: false, reason: `Couldn't verify ${playerName} — player not found in database` })
    }
    console.log(`  [cat] attrs: nat=${attrs.nationality}, pos=${attrs.position}, cont=${getContinent(attrs.nationality)}`)
    const check = checkFilters(attrs, filters)
    if (!check.pass) return res.json({ stat: null, filterMatch: false, reason: check.reason })
  }

  // ── Stat lookup ──────────────────────────────────────────────────
  const pKey = `cat:${questionId}:${norm(playerName)}`
  if (cache[pKey] !== undefined) {
    return res.json({ stat: cache[pKey].stat, breakdown: cache[pKey].breakdown, filterMatch: true, fromCache: true })
  }

  let stat, breakdown

  if (competition === 'international') {
    // Tier-1: Wikipedia 50+ international goals list (instant)
    const t1 = cache['data:international-goals'] ?? {}
    const hit = t1[playerName] ?? getIndex('international-goals')[norm(playerName)]?.stat
    if (hit !== undefined) {
      stat = hit
    } else {
      // Tier 3: player has fewer than 50 — parse their actual tally from Wikipedia
      stat = await dedupe(pKey, () => fetchInternationalGoals(playerName)) ?? 0
    }
    breakdown = { goals: stat }
  } else {
    const multi = await dedupe(pKey, () => fetchMultiStat(playerName, competition, statTypes))
    stat      = multi.total ?? 0
    breakdown = multi.breakdown
  }

  console.log(`  [cat] stat=${stat}, breakdown=${JSON.stringify(breakdown)}`)

  if (stat > 0) { cache[pKey] = { stat, breakdown }; saveCache() }

  return res.json({ stat, breakdown, filterMatch: true })
})

// ── Position lookup (used to backfill badges for any player) ─────
app.get('/api/position', async (req, res) => {
  const { playerName } = req.query
  if (!playerName) return res.status(400).json({ error: 'missing playerName' })
  try {
    const attrs = await fetchPlayerAttrs(playerName)
    res.json({ position: attrs?.position ?? null })
  } catch (err) {
    console.warn(`  /api/position error for "${playerName}": ${err.message}`)
    res.json({ position: null })
  }
})

app.get('/api/questions', (_req, res) => {
  res.json({ questions: Object.keys(CATEGORY_QUESTIONS) })
})

app.get('/api/health', (_req, res) => {
  const t1 = {}, t2 = {}
  for (const id of Object.keys(OBJECTIVES)) {
    const d = cache[`data:${id}`]
    t1[id] = d ? `${Object.keys(d).length} players` : 'not loaded'
  }
  for (const key of Object.keys(cache)) {
    if (!key.startsWith('player:')) continue
    const [,id] = key.split(':')
    t2[id] = (t2[id] ?? 0) + 1
  }
  res.json({ ok: true, tier1: t1, per_player_cached: t2 })
})

app.get('/api/data/:id', (req, res) => {
  const data = cache[`data:${req.params.id}`]
  if (!data) return res.status(404).json({ error: 'not loaded' })
  res.json({ count: Object.keys(data).length, players: Object.fromEntries(Object.entries(data).sort(([,a],[,b]) => b - a)) })
})

// SPA fallback — serve the prerendered HTML for the requested route (each route
// has its own dist/<path>/index.html with unique SEO head + crawlable content),
// falling back to the home shell for anything unrecognised.
if (fs.existsSync(DIST_DIR)) {
  const HOME = path.join(DIST_DIR, 'index.html')
  app.get(/^(?!\/api).*/, (req, res) => {
    // A request that reached here with a file extension is a static asset that
    // express.static did NOT find — e.g. a hashed chunk from a previous deploy.
    // Return 404, never the HTML shell: serving text/html for a .js request is
    // exactly what triggers the browser's "expected a JavaScript module" error.
    if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found')

    const clean = req.path.replace(/\/+$/, '').replace(/^\/+/, '')
    res.setHeader('Cache-Control', 'no-cache') // navigations must always get fresh chunk refs
    if (clean) {
      const candidate = path.join(DIST_DIR, clean, 'index.html')
      // guard against path traversal, then serve the prerendered route if present
      if (candidate.startsWith(DIST_DIR + path.sep) && fs.existsSync(candidate)) {
        return res.sendFile(candidate)
      }
    }
    res.sendFile(HOME)
  })
}

const PORT = process.env.PORT || 3002
app.listen(PORT, async () => {
  console.log(`\nFootball 501 stats server → http://localhost:${PORT}`)
  console.log('Loading tier-1 Wikipedia data…')
  await preloadAll()
  console.log('\nReady.\n')
})
