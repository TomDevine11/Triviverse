// PL-history scraper — shared fetch + parse helpers.
import { execFileSync } from 'node:child_process'
import * as cheerio from 'cheerio'
import { UA, RETRIES, BASE, COMPETITION } from './config.mjs'

// Fetch a URL via curl (works from a normal machine; node fetch/undici gets
// blocked by Transfermarkt more readily). Returns HTML string, with retries.
export function fetchHtml(url) {
  let lastErr
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return execFileSync('curl', ['-s', '-L', '-m', '30', '-A', UA, url], { maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' })
    } catch (e) { lastErr = e }
  }
  throw new Error(`fetch failed after ${RETRIES} tries: ${url}\n${lastErr?.message || ''}`)
}

// Player national-team page (/nationalmannschaft/spieler/{id}) → senior caps +
// goals for the player's national side. The per-tournament breakdown table is a
// JS-hydrated web component (<tm-player-national-team-career>) and is NOT in the
// static curl HTML — but the senior total lives in the static data-header:
//   <li class="data-header__label">Caps/Goals:
//     <a ... href=".../verein_id/{teamId}">137 </a>/ <a ...>71 </a></li>
//   <li class="data-header__label">Current/Former International: <a href="/…/verein/{teamId}">Germany</a></li>
// Returns { team, teamId, caps, goals } (null team/0 when no international career).
export function parseNationalTeam(html) {
  const $ = cheerio.load(html)
  const num = (t) => { const n = parseInt(String(t).replace(/[^\d]/g, ''), 10); return Number.isNaN(n) ? 0 : n }
  const labels = $('.data-header__label').toArray()
  const labelText = (el) => $(el).text().replace(/\s+/g, ' ').trim()

  // Caps/Goals: two highlighted anchors; teamId from the verein_id in the href.
  let caps = 0, goals = 0, teamId = null
  const cg = labels.find(el => /Caps\/Goals:/i.test(labelText(el)))
  if (cg) {
    const nums = $(cg).find('a.data-header__content--highlight').map((_, a) => num($(a).text())).get()
    caps = nums[0] || 0; goals = nums[1] || 0
    teamId = $(cg).find('a[href*="/verein_id/"]').attr('href')?.match(/verein_id\/(\d+)/)?.[1] || null
  }

  // National side name (+ id) from the "Current/Former International:" label.
  let team = null
  const intl = labels.find(el => /International:/i.test(labelText(el)))
  if (intl) {
    const a = $(intl).find('a[href*="/verein/"]').first()
    if (a.length) { team = a.attr('title')?.trim() || a.text().trim() || null; teamId = teamId || a.attr('href')?.match(/\/verein\/(\d+)/)?.[1] || null }
  }
  return { team, teamId, caps, goals }
}

// Enumerate the clubs in a competition-season → [{ id, slug }].
// Works for a league table (startseite) AND the CL participants page
// (/teilnehmer/), which lists clubs the same way.
export function parseCompetitionClubs(html) {
  const $ = cheerio.load(html)
  const clubs = new Map()
  $('a[href*="/startseite/verein/"], a[href*="/kader/verein/"], a[href*="/spielplan/verein/"]').each((i, a) => {
    const href = $(a).attr('href') || ''
    const m = href.match(/\/([^/]+)\/(?:startseite|spielplan|kader)\/verein\/(\d+)/)
    if (!m) return
    const id = m[2]
    const name = ($(a).attr('title') || $(a).text().trim() || '').trim() // English display name
    const existing = clubs.get(id)
    if (!existing) clubs.set(id, { id, slug: m[1], name })
    else if (!existing.name && name) existing.name = name
  })
  return [...clubs.values()]
}

// Competition-scoped club-season performance page URL.
export function clubSeasonUrl({ slug, id }, season) {
  return `${BASE}/${slug}/leistungsdaten/verein/${id}/reldata/${COMPETITION.id}%26${season}/plus/1`
}
export function competitionUrl(season) {
  if (COMPETITION.enumerate === 'teilnehmer') // cups: participants page lists the clubs
    return `${BASE}/${COMPETITION.slug}/teilnehmer/pokalwettbewerb/${COMPETITION.id}/saison_id/${season}`
  return `${BASE}/${COMPETITION.slug}/startseite/wettbewerb/${COMPETITION.id}/saison_id/${season}`
}

const toInt = (t) => { const n = parseInt(String(t).replace(/[.,]/g, '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0 }

// Transfermarkt position string → GK / DEF / MID / FWD (the buckets shown as
// dropdown badges). Wingers/second strikers bucket as FWD, per Transfermarkt.
export function bucketPosition(p = '') {
  const s = String(p).toLowerCase()
  if (s.includes('keeper')) return 'GK'
  if (s.includes('back') || s.includes('defender') || s.includes('centre-back') || s.includes('sweeper')) return 'DEF'
  if (s.includes('midfield')) return 'MID'
  if (s.includes('winger') || s.includes('forward') || s.includes('striker') || s.includes('attack')) return 'FWD'
  return null
}

// Extract a player's primary position from their Transfermarkt profile page.
export function parseProfilePosition(html) {
  const $ = cheerio.load(html)
  let pos = ''
  $('.info-table__content').each((i, s) => {
    const label = $(s).prev().text().trim()
    if (/^position/i.test(label) && !pos) pos = $(s).text().trim()
  })
  return bucketPosition(pos)
}

// Parse a club-season performance page → per-player { id, name, nat, apps, goals }.
// Column map (validated): [0]# [1]player [2]age [3]nat [4]in-squad [5]apps [6]goals …
export function parseClubSeason(html) {
  const $ = cheerio.load(html)
  const out = []
  $('#yw1 table tbody').children('tr').each((i, tr) => {
    const $tr = $(tr)
    const tds = $tr.children('td')
    if (tds.length < 8) return // skip responsive/phantom rows
    const a = $tr.find('.hauptlink a').first()
    const href = a.attr('href') || ''
    const idm = href.match(/\/spieler\/(\d+)/)
    if (!idm) return
    const name = a.text().trim()
    const nat = $(tds[3]).find('img.flaggenrahmen').first().attr('title') || ''
    const pos = bucketPosition($tr.find('.inline-table tr').last().find('td').text().trim())
    const apps = toInt($(tds[5]).text())
    const goals = toInt($(tds[6]).text())
    out.push({ id: idm[1], name, nat, pos, apps, goals })
  })
  return out
}
