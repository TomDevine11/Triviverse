// The site's only route to About, Contact, Privacy and Terms.
//
// Those four pages existed but nothing linked to them, so they were reachable
// only by typing the URL. That fails two separate external requirements: AdSense
// reviewers navigate a site looking for a privacy policy, and TikTok's app review
// guidelines require the Privacy Policy and Terms links to be visible on the site
// "without having to open a menu".
//
// They are static files in public/, not app routes, so these are plain anchors —
// a react-router <Link> would try to resolve them client-side and land on the SPA
// fallback instead of the real page.
export default function SiteFooter() {
  const links = [
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/privacy', 'Privacy'],
    ['/terms', 'Terms'],
  ]
  return (
    <footer className="mt-12 border-t border-border pt-6 pb-10">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {links.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="text-muted hover:text-brand-bright transition-colors text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bright rounded"
          >
            {label}
          </a>
        ))}
      </nav>
      <p className="text-faint text-xs text-center mt-4">
        Free daily football trivia. No account, no download.
      </p>
    </footer>
  )
}
