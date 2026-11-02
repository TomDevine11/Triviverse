// Shared styling for the visible guide copy baked into prerendered HTML
// (scripts/prerender.mjs, scripts/geography/prerender.mjs). See the note on
// staticBody in scripts/prerender.mjs for why it is visible rather than clipped.
export const STATIC_PROSE = 'max-width:42rem;margin:3rem auto 0;text-align:left;color:#c9c6d6;line-height:1.65;font-size:1rem'
export const STATIC_CSS = '<style>#root .static-prose h2{color:#fff;font-size:1.2rem;margin:2rem 0 .5rem}#root .static-prose a{color:#a78bfa}#root .static-prose dt{color:#e9e7f2;font-weight:600;margin-top:1rem}#root .static-prose dd{margin:.25rem 0 0}#root .static-prose ol,#root .static-prose ul{padding-left:1.25rem;text-align:left}#root .static-prose li{margin:.25rem 0}</style>'
