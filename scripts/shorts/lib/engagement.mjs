// Reusable engagement primitives. Each format gets its own comment/share/follow lines, picked
// deterministically per video (by slug hash) so the feed varies without being random.
const POOLS = {
  'career-path': {
    comment: ['At which club did you get it? 👇', 'Got it before the last club?', 'How fast did you know?'],
    share: ['Send this to your football mate.', 'Your mate won\'t get this one.', 'Challenge someone who "knows ball".'],
    follow: ['New career every day →', 'Harder one tomorrow →'],
  },
  'who-am-i': {
    comment: ['Which clue gave it away? 👇', 'Did you get it before clue 3?', 'Be honest — did you know this one?'],
    share: ['Send to someone who\'d get it in 2 clues.', 'Bet your mate needs all 5.', 'Challenge a proper fan.'],
    follow: ['A new mystery player daily →', 'Tomorrow\'s is harder →'],
  },
  'played-alongside': {
    comment: ['Did you get the link? 👇', 'Name another valid answer.', 'How many clues did you need?'],
    share: ['Only a proper fan links these.', 'Send this to a football nerd.', 'Your mate has no chance.'],
    follow: ['One impossible link every day →', 'Level up tomorrow →'],
  },
  'guess-the-club': {
    comment: ['Did you spot the missing club? 👇', 'What was your guess?', 'Too easy? Name the player too.'],
    share: ['I bet your mate gets this wrong.', 'Send this to a know-it-all.', 'Challenge a real fan.'],
    follow: ['New missing-club puzzle daily →', 'Tomorrow\'s is trickier →'],
  },
  'winner-stays-on': {
    comment: ['What\'s your longest streak? 🔥', 'Did you get them all?', 'Where did you lose?'],
    share: ['Beat my streak.', 'Send this to someone who "knows ball".', 'Challenge your football mate.'],
    follow: ['New category every day →', 'Build the longest streak →'],
  },
  'football-pointless': {
    comment: ['What was your answer? 👇', 'Did you get a rare one?', 'What answer did we miss?'],
    share: ['Send this to your know-it-all mate.', 'Bet you can\'t find a rare one.', 'Challenge a proper fan.'],
    follow: ['A new one every day →', 'Can you find a low score tomorrow? →'],
  },
  'player-between-clubs': {
    comment: ['How many did you get? 👇', 'Which one did everyone forget?', 'Name one we missed.'],
    share: ['Send this to a transfer nerd.', 'Bet your mate misses half.', 'Challenge a real fan.'],
    follow: ['A new club link every day →', 'Tomorrow\'s pair is harder →'],
  },
}
const DEFAULT = POOLS['career-path']
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

export function engagementFor(format, seed) {
  const p = POOLS[format] || DEFAULT
  const pick = (arr) => arr[hash(seed) % arr.length]
  return { comment: pick(p.comment), share: pick(p.share), follow: pick(p.follow) }
}
