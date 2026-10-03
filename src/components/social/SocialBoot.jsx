import { useEffect } from 'react'
import { bootSocial } from '../../social/results' // also registers the recordResult listener
import { loadJson } from '../../social/store'

// Mounted once in App: seeds the results log for existing players, retries
// queued league submissions and settles the streak. Renders nothing.
export default function SocialBoot() {
  useEffect(() => { bootSocial(loadJson('ftg-stats-v1', {})) }, [])
  return null
}
