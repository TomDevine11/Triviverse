import { flagOf } from './unfurl'

// Unfurl's bundled flag artwork (../flags, official proportions), emitted by Vite as
// static assets under opaque names and fetched one at a time.
const FILES = import.meta.glob('../flags/*.svg', { eager: true, query: '?no-inline', import: 'default' })
export const flagUrl = (code) => FILES[`../flags/${flagOf(code)?.file}`] || null
