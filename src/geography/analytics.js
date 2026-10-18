// Triviverse Geography gameplay analytics, on top of the site-wide GA4 wrapper
// (../utils/analytics — inert without VITE_ANALYTICS_ID, so this is too).
//
// One event name per action across every game, told apart by `game`: the same
// convention as football's `game_complete` and `share`, so a single `game`
// custom dimension serves the whole site. Never send what a player typed, which
// country they guessed, or the answer. Taxonomy, triggers and tests:
// docs/seo/borderline.md#analytics.
import { track } from '../utils/analytics'

export const GEO_EVENTS = {
  start: 'game_start',            // first guess of a round (not a page view)
  guess: 'guess_submitted',       // every guess; guess_number is 1…max
  complete: 'game_complete',      // once per finished round
  share: 'share',                 // result shared or copied successfully
  mode: 'game_mode_select',       // player switched Daily ↔ Unlimited
  related: 'related_game_click',  // player followed a link to another geography game
}

export function geoTrack(event, game, params = {}) {
  track(event, { game, ...params })
}

// '/geography/borderline' → 'borderline'; the hub is 'hub'.
export const gameIdFromPath = (path) => path.replace(/^\/geography\/?/, '').split('/')[0] || 'hub'
