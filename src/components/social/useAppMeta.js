import { useEffect } from 'react'

// Head tags for app-only screens (/me, /leagues): a title and noindex. These
// pages have no SEO route (they're personal), so Seo.jsx doesn't manage them.
export function useAppMeta(title) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} — Triviverse`
    let robots = document.querySelector('meta[name="robots"]')
    const prevRobots = robots?.getAttribute('content')
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots) }
    robots.setAttribute('content', 'noindex, nofollow')
    return () => {
      document.title = prev
      if (prevRobots) robots.setAttribute('content', prevRobots)
    }
  }, [title])
}
