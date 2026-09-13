// Caption strategy for TikTok. PRIMARY GOAL: drive traffic to triviverse.com — every caption ends
// with the "link in bio" CTA. The video itself carries the comment/share mechanic, so captions stay
// short and format-specific. Hashtags are kept few and are appended to the `title` (TikTok has only
// one text field and matches inline #tags), but tracked separately so they're easy to tune later.
const CTA = 'Play more football trivia → triviverse.com — link in bio ⚽️'

const HOOK = {
  'who-am-i': 'Think you know football? 👀',
  'winner-stays-on': 'How long would your streak last? 🔥',
  'career-path': 'Could you name the player from this career? 👀',
  'guess-the-club': 'Can you spot the missing club? 👀',
  'played-alongside': 'Can you name a player who played alongside all of them? 🧠',
  'football-pointless': 'What answer would you have given? 👀',
  'player-between-clubs': 'Can you name the player? 👀',
}

const TAGS = {
  'who-am-i': ['#football', '#footballquiz', '#guesstheplayer'],
  'winner-stays-on': ['#football', '#footballquiz', '#higherorlower'],
  'career-path': ['#football', '#footballquiz', '#careerpath'],
  'guess-the-club': ['#football', '#footballquiz', '#guesstheclub'],
  'played-alongside': ['#football', '#footballquiz', '#footballtrivia'],
  'football-pointless': ['#football', '#footballquiz', '#pointless'],
  'player-between-clubs': ['#football', '#footballquiz', '#transfers'],
}

// Build the caption + hashtags for a video's metadata. Returns { caption, hashtags, title }.
// `title` is what we send to TikTok: the two-line caption, then the hashtags on their own line.
export function buildCaption(meta) {
  const format = meta.format
  const hook = HOOK[format] || 'Think you know football? 👀'
  const hashtags = TAGS[format] || ['#football', '#footballquiz']
  const caption = `${hook}\n${CTA}`
  const title = `${caption}\n\n${hashtags.join(' ')}`
  return { caption, hashtags, title }
}
