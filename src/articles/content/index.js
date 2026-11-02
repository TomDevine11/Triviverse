// The editorial section. Rendered to static HTML by scripts/articles/build.mjs.
// Never import this from app code: it is the full article text, and would add
// it all to the bundle. The app uses src/articles/index.js instead.
import { FOOTBALL } from './football.js'
import { GEOGRAPHY } from './geography.js'

// Byline. Triviverse is run by one person (see /about). Change this to a
// Person with a real name if Tom chooses to put his name to the articles.
export const AUTHOR = { type: 'Organization', name: 'Triviverse' }

export const CATEGORIES = { football: 'Football', geography: 'Geography' }

export const ARTICLES = [...FOOTBALL, ...GEOGRAPHY]
