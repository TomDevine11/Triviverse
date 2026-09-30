// Anonymous identity: a random device id plus a self-chosen nickname. No
// accounts, no email. Two ids:
//   id  — private. What the social API authenticates writes with. Never shared.
//   pub — public. Goes in challenge links and league tables (safe to leak).
// A device transfer (transfer.js) carries both, so your leagues follow you.

import { loadJson, saveJson, emit } from './store'

const KEY = 'ftg-me-v1'

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  } catch { /* fall through */ }
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
}

export function getMe() {
  let me = loadJson(KEY)
  if (!me || typeof me.id !== 'string') {
    me = { id: randomId(), pub: randomId().slice(0, 12), name: '', created: Date.now() }
    saveJson(KEY, me)
  } else if (!me.pub) {
    me.pub = randomId().slice(0, 12)
    saveJson(KEY, me)
  }
  return me
}

export const deviceId = () => getMe().id
export const publicId = () => getMe().pub
export const nickname = () => getMe().name || ''

// Nicknames show up in other people's leagues and challenge banners, so keep
// them short and plain: trimmed, collapsed whitespace, no markup characters.
export function cleanName(name) {
  return String(name || '').replace(/[<>"'`\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20)
}

export function setNickname(name) {
  const me = getMe()
  me.name = cleanName(name)
  saveJson(KEY, me)
  emit({ type: 'identity' })
  return me.name
}

// Short public handle for a device id (shown next to duplicate names).
export const shortId = (id) => String(id || '').slice(0, 4).toUpperCase()
