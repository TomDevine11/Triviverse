// Short share links (/c/ABC1234) for challenge payloads. The long /s/…?c= link
// always works (it carries everything); the short one just reads better in a
// chat. Codes are cached per payload so the same result keeps the same link.

import { useEffect, useState } from 'react'
import { loadJson, saveJson } from './store'
import { shortLink } from './api'

const KEY = 'ftg-links-v1'
const origin = () => (typeof window !== 'undefined' ? window.location.origin : 'https://triviverse.com')

const cached = (payload) => (loadJson(KEY, {}) || {})[payload] || null
function remember(payload, code) {
  const all = loadJson(KEY, {}) || {}
  all[payload] = code
  const keys = Object.keys(all)
  if (keys.length > 60) for (const k of keys.slice(0, keys.length - 60)) delete all[k]
  saveJson(KEY, all)
}

// Returns the short URL once known, else the long one.
export function useShortUrl(longUrl, payload) {
  const [code, setCode] = useState(() => cached(payload))
  useEffect(() => {
    if (!payload || cached(payload)) return
    let alive = true
    shortLink(payload).then(res => {
      if (res?.code) { remember(payload, res.code); if (alive) setCode(res.code) }
    })
    return () => { alive = false }
  }, [payload])
  const known = code && cached(payload) === code ? code : cached(payload)
  return known ? `${origin()}/c/${known}` : longUrl
}
