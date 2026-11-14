// GA4 tag for the plain static pages (articles, About, Contact, Privacy, Terms).
// These pages ship no app JavaScript, so without this their visits are
// invisible in GA4. Same measurement id and the same behaviour as the app
// (src/utils/analytics.js): inert when VITE_ANALYTICS_ID is unset at build time.
const ID = process.env.VITE_ANALYTICS_ID || ''
const VALID = /^G-[A-Z0-9]+$/

export function analyticsSnippet(id = ID) {
  if (!VALID.test(id)) return ''
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');</script>`
}

// Adds the tag before </head>, once.
export function withAnalytics(html, id = ID) {
  const tag = analyticsSnippet(id)
  if (!tag || html.includes('googletagmanager.com/gtag/js')) return html
  return html.replace('</head>', `${tag}\n</head>`)
}
