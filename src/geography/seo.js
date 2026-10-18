// Triviverse Geography's search metadata: one record per route, read by the
// client <GeoSeo> head manager and by scripts/geography/prerender.mjs (which bakes
// the same tags and crawlable copy into static HTML). Independent of the football
// SEO config.
import { GUIDES } from './guides.js'

export const SITE_URL = 'https://triviverse.com'
export const BRAND = 'Triviverse Geography'

const ROUTES = [
  {
    path: '/geography',
    name: 'Triviverse Geography',
    title: 'Triviverse Geography — Free Daily Geography Games',
    description: 'Free daily geography games: guess where a photo was taken, pin where history happened, name a language from a voice, play geography higher or lower, name a country from its outline, connect two countries by land, guess the flag, and restore the countries missing from the world map.',
    h1: 'Triviverse Geography — daily geography games',
    tagline: 'Daily map puzzles. One shared puzzle a day for everyone.',
    about: 'Triviverse Geography is a home for daily geography games. Every game gives everyone the same puzzle each day, takes a couple of minutes, and keeps your streak in your browser — no account, no download. Postcard shows you a photograph of a real place and asks you to drop a pin where it was taken; Milestone asks where famous moments in history happened; Earshot plays a voice and asks which language it is speaking; Outrank asks whether one country’s population, area, density or life expectancy is higher or lower than another’s; Borderline asks you to name a country from its outline; Overland asks you to travel between two countries by land, one border at a time; Unfurl uncovers a flag tile by tile; Patchwork cuts seven countries out of the world map for you to put back.',
    faq: [
      { q: 'What is Triviverse Geography?', a: 'A collection of free daily geography games from Triviverse. Everyone gets the same puzzles each day, and they refresh at midnight UK time.' },
      { q: 'Do I need an account?', a: 'No. Your progress and streaks are saved in your browser.' },
      { q: 'Is it the same as Triviverse Football?', a: 'It is a sister site: same makers and the same daily format, but every game here is about geography rather than football.' },
    ],
    schema: 'WebSite',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/geography/postcard',
    name: 'Postcard',
    title: 'Postcard — Guess Where the Photo Was Taken | Triviverse Geography',
    description: 'Postcard is a free daily geography game: study a photograph of a real place, drop a pin on the world map, and score up to 5,000 points for how close you get.',
    h1: 'Postcard — guess where the photo was taken',
    tagline: 'One photo, one pin. How close can you get?',
    about: 'Postcard is a daily photo geography game. Every day a photograph of a real place appears — a famous landmark, a city street, a waterfall, a desert, a mountain — and you drop a single pin on the world map where you think it was taken. When you lock in your guess the answer is revealed with the great-circle distance between your pin and the real spot, and you score up to 5,000 points: the closer you are, the more you get. Score 2,500 or more — roughly within 1,000 km — to win the day. Everyone gets the same photo each day.',
    howTo: [
      'Study the photograph — architecture, landscape, vegetation, signs and light are all clues. Tap the expand button to see it full screen.',
      'Pan and zoom the world map, then tap or click to drop your pin. Tap somewhere else to move it, as often as you like.',
      'Lock in your guess to see the real location, the distance between the two, and your score.',
      'Come back tomorrow for a new photo.',
    ],
    sections: [
      {
        h2: 'How scoring works',
        body: [
          'Your score depends only on the distance between your pin and the place in the photo, measured along the surface of the Earth (the great-circle distance). A pin within 1 km scores the full 5,000 points; after that the score falls smoothly — about 4,670 at 100 km, 2,570 at 1,000 km and 180 at 5,000 km. Distances are measured on the globe, not the flat map, so they are correct across the Pacific and far from the equator.',
        ],
      },
      {
        h2: 'The photographs',
        body: [
          'Every photo is a real photograph from Wikimedia Commons, used under its free licence (public domain, CC0, CC BY or CC BY-SA). The photographer and licence are credited on the photo, with a link to the original after you guess. Places are located using the coordinates of their Wikipedia articles, and the collection spans every inhabited continent — from world-famous monuments to remote canyons, crater lakes and island chains.',
        ],
      },
    ],
    faq: [
      { q: 'What is Postcard?', a: 'A free daily geography game: you see a photo of a real place and drop a pin on the world map where you think it was taken.' },
      { q: 'How many guesses do I get?', a: 'One pin per day. You can move it as often as you like before you lock it in.' },
      { q: 'How do I win the daily?', a: 'Score at least 2,500 out of 5,000 — that means a pin within roughly 1,000 km of the real spot.' },
      { q: 'Is it the same photo for everyone?', a: 'Yes. Everyone gets the same photo each day, refreshed at midnight UK time.' },
      { q: 'Where do the photos come from?', a: 'Wikimedia Commons, under free licences. Each photo credits its photographer and licence.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/milestone',
    name: 'Milestone',
    title: 'Milestone — Where Did It Happen? History Map Quiz | Triviverse Geography',
    description: 'Milestone is a free daily history and geography game: read about a famous discovery, invention or event, drop a pin where it happened, and score up to 5,000 points across five questions.',
    h1: 'Milestone — where in the world did it happen?',
    tagline: 'Five moments in history. Pin where each one happened.',
    about: 'Milestone is a daily history map quiz. Each question describes a real moment — the discovery of penicillin, the first powered flight, the first modern Olympics, a treaty, an expedition, a sporting first — and you drop a pin on the map where you think it happened. The map opens on a region chosen for each question, from a single country to the whole world. Every daily challenge has five questions, the same for everyone, each worth up to 1,000 points; score 3,500 or more out of 5,000 to reach the day’s milestone. Unlimited mode serves question after question with a running score whenever you want more.',
    howTo: [
      'Read the clue — the year and category are hints too.',
      'Pan and zoom the map, then tap or click to drop your pin. Tap somewhere else to move it.',
      'Lock in your guess to see where it really happened, how far away you were and why.',
      'Answer all five daily questions and score 3,500 or more to win — or switch to Unlimited and keep going.',
    ],
    sections: [
      {
        h2: 'How scoring works',
        body: [
          'Each question is worth up to 1,000 points and depends only on how far your pin is from the real location, measured along the Earth’s surface. Each question has its own precision: a pin within that distance scores full marks — roughly the size of a town for a single building, wider for events spread over a region — and the score falls away smoothly beyond it.',
        ],
      },
      {
        h2: 'The questions',
        body: [
          'Questions cover science, inventions, historic firsts, exploration, archaeology, engineering, sport, politics and culture, from every inhabited continent. Each is checked against its sources, and the answer location is taken from the coordinates of the site’s Wikipedia article. Where something happened in more than one place — invented in one city and patented in another — the clue says exactly which one it means.',
        ],
      },
    ],
    faq: [
      { q: 'What is Milestone?', a: 'A free daily history and geography game: read about a famous event, discovery or invention and drop a pin on the map where it happened.' },
      { q: 'How do I win the daily?', a: 'Score at least 3,500 out of 5,000 across the five daily questions.' },
      { q: 'What is Unlimited mode?', a: 'Questions keep coming, one after another, with a running total and average score. It never shows you that day’s daily questions.' },
      { q: 'Is it the same for everyone?', a: 'Yes. The five daily questions and their order are the same for every player, refreshed at midnight UK time.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/earshot',
    name: 'Earshot',
    title: 'Earshot — Guess the Language from a Voice | Triviverse Geography',
    description: 'Earshot is a free daily language-guessing game: hear a real person speaking for 1.5 seconds and name the language. Every wrong guess unlocks more of the recording — six guesses to get it.',
    h1: 'Earshot — guess the language from a voice',
    tagline: 'Hear a voice. Name the language. Six guesses.',
    about: 'Earshot is a daily listening game in the spirit of Heardle, but for languages. Each puzzle is a short recording of a real person speaking — mostly unscripted, everyday conversation from oral-history projects, plus some read speech. You hear just the first 1.5 seconds and guess the language; every wrong guess or skip unlocks a longer stretch of the same recording, up to the full clip on your sixth guess. Guess a language from the right family — another Romance or Bantu language, say — and the row turns amber. Everyone hears the same voice each day, and Unlimited mode plays clip after clip with a running score and streak.',
    howTo: [
      'Press play to hear the opening 1.5 seconds. Replay it as often as you like.',
      'Type a language and pick it from the list — names in English, in the language itself and common alternatives all work.',
      'A wrong guess or a skip unlocks more of the same recording: 3, 5, 8, 13 seconds and then the whole clip.',
      'Name it within six guesses. Amber means you picked the right language family.',
    ],
    sections: [
      {
        h2: 'The recordings',
        body: [
          'Clips come from openly licensed speech collections: Wikitongues oral histories on Wikimedia Commons (CC BY-SA 4.0, CC BY 3.0 or CC0) and Google’s FLEURS dataset (CC BY 4.0). Each clip is a short excerpt, checked at build time with a speech language-identification model to make sure it really is the labelled language and that the speaker never names it. Every clip is credited, with its licence and a link to the original, after you play and on the Audio credits list.',
        ],
      },
      {
        h2: 'Languages, not countries',
        body: [
          'Earshot asks for the language, not where the speaker is from. Varieties count as their language — a Levantine or Iraqi Arabic speaker is answered “Arabic”, a Québécois speaker “French” — and the reveal names the variety. Closely related but separate languages, such as Hindi and Urdu, Malay and Indonesian or Croatian and Serbian, are not interchangeable: the amber row tells you that you are in the right family.',
        ],
      },
    ],
    faq: [
      { q: 'What is Earshot?', a: 'A free daily game where you hear someone speaking and guess the language, with more of the recording unlocked after each wrong guess.' },
      { q: 'How many guesses do I get?', a: 'Six. The first hears 1.5 seconds; the sixth hears the whole clip.' },
      { q: 'Is it the same clip for everyone?', a: 'Yes. Everyone hears the same recording each day, refreshed at midnight UK time. Unlimited mode never plays that day’s clip.' },
      { q: 'Where do the recordings come from?', a: 'Wikitongues oral histories on Wikimedia Commons and Google’s FLEURS speech dataset, under Creative Commons licences. Each clip credits its source.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/outrank',
    name: 'Outrank',
    title: 'Outrank — Geography Higher or Lower: Compare Countries | Triviverse Geography',
    description: 'Outrank is a free daily geography higher or lower game: is one country’s population, land area, population density or life expectancy higher or lower than another’s? Up to ten face-offs a day — one wrong answer ends it — plus an endless streak mode.',
    h1: 'Outrank — geography higher or lower',
    tagline: 'Higher or lower? One wrong answer ends it.',
    about: 'Outrank is a geography higher or lower game. Two countries face off on one statistic — population, land area, population density or life expectancy. You can see the first country’s figure; decide whether the second country’s is higher or lower. The daily challenge is up to ten comparisons, the same for everyone, starting with clear-cut match-ups and finishing with close calls. One wrong answer ends the day: get five in a row to win, and all ten for a perfect day. Unlimited mode is an endless chain: every right answer moves the new country into the first seat and brings in another, and one wrong answer ends your streak. All figures come from the World Bank and are for the same year.',
    howTo: [
      'Read the statistic at the top, then look at the first country’s figure.',
      'Decide whether the second country’s figure is higher or lower, and tap Higher or Lower (on a keyboard, ↑ and ↓ work too).',
      'Both figures are revealed with how far apart they are. In the daily, one wrong answer ends the day — five in a row wins, ten is perfect; in Unlimited, keep the streak alive as long as you can.',
      'Share your daily grid — it shows how you did without giving the answers away.',
    ],
    sections: [
      {
        h2: 'A run, start to finish',
        body: [
          'The very first daily, Outrank #1, shows how a run builds. It opened on population: New Zealand, 5.29 million, against Spain. Spain is plainly bigger, so the answer is higher, and the reveal shows 48.8 million, 9.2 times as many. Spain then moves into the first seat and Lebanon comes in: lower, at 5.81 million. Then the statistic switches to land area, Lebanon’s 10,230 km² against Burkina Faso: higher, at 273,600 km². The early questions are meant to be clear-cut like this.',
          'The later ones are not. Question seven asked whether Croatia is more densely populated than China, with its 150 people per km². It is not: Croatia has 69. The last question asked whether Mauritius is more densely populated than the Netherlands, at 534 people per km². Most people say lower, but Mauritius has 623, 17% more. Under the daily’s sudden-death rule, a slip on that last question still leaves nine in a row and a comfortable win. The same slip on question four ends the day at three, one short of the five you need.',
        ],
      },
      {
        h2: 'Getting better at Outrank',
        body: [
          'Each statistic needs a different instinct. Population follows what you know about big countries, but it is easy to underrate fast-growing ones in Africa and Asia. Land area catches people out because the familiar world map stretches countries far from the equator, so northern countries look much bigger than they are. Density is the hardest, because it combines the two: small places with crowded cities top the list, which is why an island like Mauritius beats the Netherlands. Life expectancy tends to split richer and poorer countries, with Japan, at 84.0 years, near the very top.',
          'Look at the first figure before you think about the second country. A first country with an unusually high or low figure makes the answer close to certain, and the danger is in the middle of the range. In the daily, every answer becomes the next question’s first figure, so a mistake never carries over, but each new statistic needs a fresh look rather than momentum.',
        ],
      },
      {
        h2: 'The daily challenge',
        body: [
          'Every day there are ten comparisons, the same for everyone and in the same order, refreshed at midnight UK time. The countries form a chain — each comparison’s second country becomes the next one’s first — and the statistic changes as you go, so a single day mixes population, land area, density and life expectancy. The first questions are clear-cut; the last few are close calls between countries you might never have thought to compare. You get one guess per comparison, and the first wrong answer ends the day: five in a row counts as a win, and all ten is a perfect day.',
        ],
      },
      {
        h2: 'Sources and methodology',
        id: 'methodology',
        body: [
          'Every figure comes from the World Bank’s World Development Indicators (licence CC BY 4.0) and is for the same reference year, 2024, so no comparison ever mixes years or definitions. Population (indicator SP.POP.TOTL) is the mid-year estimate of everyone living in the country, whatever their citizenship, from the UN World Population Prospects and national statistics offices. Land area (AG.LND.TOTL.K2, from the UN Food and Agriculture Organization) excludes inland water such as lakes and major rivers — which is why the United States has more land than Canada, even though Canada is larger in total area.',
          'Population density (EN.POP.DNST) is people per square kilometre of land area, as published by the World Bank rather than recomputed: for Georgia and Moldova the population figure excludes territory outside government control, and the published density divides by the matching land area. Life expectancy (SP.DYN.LE00.IN) is life expectancy at birth — how long a newborn would live if the current year’s death rates held throughout their life.',
          'The game covers 198 places: the 193 UN member states, Palestine and Kosovo, plus Hong Kong, Macau and Puerto Rico. Dependent territories with fewer than 500,000 people are left out, and a country only appears for a statistic the World Bank publishes for it — Nicaragua and Kosovo have no 2024 land area, so they never appear in land-area or density questions. A few places are not covered by the World Bank at all, including Taiwan, Vatican City and Western Sahara. Values are compared at the precision shown on screen; two figures that read the same would count as a tie, accepting either answer, but the game never deliberately serves one.',
        ],
      },
    ],
    faq: [
      { q: 'What is Outrank?', a: 'A free geography higher or lower game: guess whether one country’s population, land area, population density or life expectancy is higher or lower than another’s.' },
      { q: 'How does the daily work?', a: 'Up to ten comparisons, the same for everyone each day, with one guess each. The first wrong answer ends the day; your score is how many you got in a row.' },
      { q: 'How do I win the daily?', a: 'Get at least five in a row before your first wrong answer. All ten is a perfect day.' },
      { q: 'What is Unlimited mode?', a: 'An endless streak: keep answering correctly to keep going, and one wrong answer ends the run. Pick a single statistic or play Mixed. Your best streak is saved in your browser.' },
      { q: 'Where do the numbers come from?', a: 'The World Bank’s World Development Indicators, all for 2024. Population and life expectancy are UN estimates; land area comes from the UN Food and Agriculture Organization.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/borderline',
    name: 'Borderline',
    // Descriptive first: the query family is "guess the country (by shape)" / "country
    // guessing game", and an unrelated game already uses the name "Borderline"
    // (borderlinequiz.com). Evidence and alternatives: docs/seo/borderline.md.
    title: 'Guess the Country by Its Shape: Daily & Unlimited | Borderline',
    description: 'Free country guessing game: name the country from its silhouette in six guesses, with distance and direction clues. A new country daily, plus unlimited play.',
    ogTitle: 'Borderline — guess the country by its shape',
    image: '/og/geography-borderline.png',
    imageAlt: 'Borderline: guess the country by its shape. A white country silhouette on a purple background.',
    h1: 'Borderline — guess the country by its shape',
    tagline: 'A country guessing game: name the country from its outline in six guesses.',
    about: 'Borderline is a daily geography puzzle. Every day the outline of one country or territory appears on the board, and you have six guesses to name it. After each wrong guess you are told how far away your country is from the answer, which compass direction to head, and how close you are as a percentage — so even a wild first guess narrows the map. Everyone gets the same country each day, and Unlimited mode serves random countries whenever you want more.',
    howTo: [
      'Study the silhouette — every country is scaled to fill the board, so size is not a clue.',
      'Type a country and pick it from the suggestions.',
      'Each guess shows the distance between the two countries’ centres, an arrow pointing towards the answer, and a closeness percentage.',
      'Use the clues to close in, and find the country within six guesses.',
    ],
    sections: [
      {
        h2: 'How the clues are worked out',
        body: [
          'Distance is the great-circle distance between the centre of your guess and the centre of the answer, measured over the curve of the Earth. Neighbouring countries can still be hundreds of kilometres apart, because it is measured centre to centre rather than border to border.',
          'The arrow is the compass bearing from your country towards the answer, as you would read it on a normal world map. Closeness runs from 0% for a country on the opposite side of the planet to 100% for the answer itself.',
        ],
      },
      {
        h2: 'Where the outlines come from',
        body: [
          'Country shapes come from Natural Earth, a public-domain map dataset. Far-flung overseas territories are left off the outline (French Guiana is not drawn with France, for example) so the shape you see is the one you would recognise on a map, while nearby islands such as Corsica, Crete or Tasmania are kept.',
        ],
      },
    ],
    faq: [
      { q: 'What is Borderline?', a: 'A free daily geography game where you identify a country from its silhouette in six guesses, using distance, direction and proximity clues.' },
      { q: 'Is it the same country for everyone?', a: 'Yes. Everyone gets the same country each day, and it changes at midnight UK time.' },
      { q: 'How is the distance calculated?', a: 'It is the great-circle distance between the centres of the two countries, so even bordering countries show a distance.' },
      { q: 'Can I play more than one a day?', a: 'Yes — Unlimited mode gives you a random country as often as you like without affecting your daily streak.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/overland',
    name: 'Overland',
    title: 'Overland — Connect Two Countries by Land, Daily | Triviverse Geography',
    description: 'Overland is a free daily geography game: get from one country to another by land, naming the countries in between. Colour clues show how close each guess is to the shortest route.',
    h1: 'Overland — connect two countries by land',
    tagline: 'Name the countries between two others, one land border at a time.',
    about: 'Overland is a daily route-finding geography puzzle. You are given a start and a destination, and you have to name the countries that link them over land. Guess in any order: each country appears on the map coloured by how close it is to a shortest route. When the countries you have named form an unbroken land chain from start to destination, you have arrived. You get the shortest route\u2019s length plus four guesses, and three hints if you are stuck.',
    howTo: [
      'Read today\u2019s start and destination.',
      'Name any country you think lies between them — in any order.',
      'Green is on a shortest route; yellow is one country off it, orange two, red far away.',
      'Arrive by linking start to destination through land borders before your guesses run out.',
    ],
    sections: [
      {
        h2: 'Which borders count',
        body: [
          'Only land borders count, taken from Natural Earth\u2019s country boundaries. Countries that face each other across a strait or a sea are not neighbours, however close (Spain and Morocco do border, though — at Ceuta and Melilla). Overseas territories are left out, so France does not border Brazil, while exclaves count: Russia borders Poland through Kaliningrad. Disputed areas follow Natural Earth\u2019s de facto boundaries, so Kosovo and Western Sahara are countries on the route.',
        ],
      },
      {
        h2: 'Hints',
        body: [
          'Three hints are available, once each: the outline of the next country you need, every border on the map, and the initials of the countries on a shortest route. Hints are counted in your shared result.',
        ],
      },
    ],
    faq: [
      { q: 'What is Overland?', a: 'A free daily geography puzzle where you connect two countries by naming the countries that lie between them over land.' },
      { q: 'How many guesses do I get?', a: 'The number of countries on the shortest route plus four.' },
      { q: 'Do I have to find the shortest route?', a: 'No — any unbroken land route wins. Your result shows how many guesses you used compared with the shortest route.' },
      { q: 'Is it the same puzzle for everyone?', a: 'Yes. Everyone gets the same start and destination each day, refreshed at midnight UK time, and Unlimited mode serves random routes.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/unfurl',
    name: 'Unfurl',
    title: 'Unfurl — Guess the Flag, Daily Flag Game | Triviverse Geography',
    description: 'Unfurl is a free daily flag game: the flag starts hidden under six tiles and every wrong guess uncovers another, with distance and direction clues. Six guesses.',
    h1: 'Unfurl — guess the country from its flag',
    tagline: 'One tile of the flag to start; every wrong guess uncovers more.',
    about: 'Unfurl is a daily flag puzzle. The day\u2019s flag is hidden under six tiles with just one uncovered, and you have six guesses to name the country. Every wrong guess lifts another tile and tells you how far your guess is from the answer, which way to head and how close you are as a percentage — so the flag and the map close in together. Everyone gets the same flag each day, and Unlimited mode serves random flags.',
    howTo: [
      'Study the uncovered part of the flag.',
      'Type a country and pick it from the suggestions.',
      'A wrong guess uncovers another tile and shows the distance, direction and closeness to the answer.',
      'Name the country within six guesses — the whole flag is revealed at the end either way.',
    ],
    sections: [
      {
        h2: 'Where the flags come from',
        body: [
          'Flags are drawn at their official proportions — square for Switzerland, the double pennant of Nepal, Qatar\u2019s long 11:28 — from public-domain artwork on Wikimedia Commons, so emblems, coats of arms and stars are shown in full detail when the last tile lifts.',
        ],
      },
    ],
    faq: [
      { q: 'What is Unfurl?', a: 'A free daily flag-guessing game: identify the country from a flag hidden under six tiles, with one more tile and a distance clue after each wrong guess.' },
      { q: 'How many guesses do I get?', a: 'Six. One tile is uncovered at the start and each wrong guess uncovers another, so your last guess sees the whole flag.' },
      { q: 'Is it the same flag for everyone?', a: 'Yes. Everyone gets the same flag each day, refreshed at midnight UK time.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/geography/patchwork',
    name: 'Patchwork',
    title: 'Patchwork — Name the Missing Countries on the Map | Triviverse Geography',
    description: 'Patchwork is a free daily geography game: seven countries are cut out of the world map. Name them to restore each one in green, with as few misses as you can.',
    h1: 'Patchwork — restore the missing countries',
    tagline: 'Seven countries are missing from the world map. Put them back.',
    about: 'Patchwork is a daily map puzzle. Every day seven countries are cut out of the world map — two from Africa, two from Europe, and one each from Asia, the Americas and Oceania. Name a missing country and its exact shape returns in green, islands and all. There are no lives and no clock: find all seven to restore the map, and try to do it with as few misses as possible. Tap a numbered gap to zoom in on it.',
    howTo: [
      'Look for the gaps — each missing country is a dashed, numbered hole in the map.',
      'Type a country and pick it from the suggestions.',
      'If it is missing, it returns to the map in green; if it is already on the map, that counts as a miss.',
      'Restore all seven countries to complete the map.',
    ],
    sections: [
      {
        h2: 'The map',
        body: [
          'The map is drawn from Natural Earth\u2019s public-domain country boundaries on a Mercator projection, the same geography used across Triviverse Geography. Restoring a country brings back every part of it, so restoring France also restores French Guiana and Réunion. Countries too small to see on a world map are never removed, and you can tap any gap to zoom in on it.',
        ],
      },
    ],
    faq: [
      { q: 'What is Patchwork?', a: 'A free daily geography puzzle: seven countries are missing from the world map, and you name them to put them back.' },
      { q: 'Is there a guess limit?', a: 'No. Wrong guesses are counted as misses and shown in your result, but you can keep going until the map is whole — or reveal the answers if you are stuck.' },
      { q: 'Is it the same map for everyone?', a: 'Yes. Everyone gets the same missing countries each day, refreshed at midnight UK time, and Unlimited mode gives you a fresh set whenever you like.' },
    ],
    schema: 'VideoGame',
    priority: '0.7',
    changefreq: 'daily',
  },
]

// The long-form guides (./guides.js) replace a route's copy fields where given.
export const GEO_ROUTES = ROUTES.map(r => ({ ...r, ...GUIDES[r.path] }))

export const geoRoute = (path) => GEO_ROUTES.find(r => r.path === path) || GEO_ROUTES[0]
export const absolute = (path) => SITE_URL + path

export function metaTags(route) {
  const url = absolute(route.path)
  // Social titles can lead with the game's name; the <title> leads with what searchers type.
  const ogTitle = route.ogTitle || route.title
  const image = route.image ? absolute(route.image) : null
  return [
    { name: 'description', content: route.description },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: BRAND },
    { property: 'og:title', content: ogTitle },
    { property: 'og:description', content: route.description },
    { property: 'og:url', content: url },
    ...(image ? [
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: route.imageAlt || route.ogTitle || route.title },
    ] : []),
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: ogTitle },
    { name: 'twitter:description', content: route.description },
    ...(image ? [{ name: 'twitter:image', content: image }] : []),
  ]
}

export function jsonLd(route) {
  const url = absolute(route.path)
  const blocks = []
  if (route.schema === 'VideoGame') {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'VideoGame', name: route.name, url,
      description: route.description, genre: ['Puzzle', 'Geography', 'Trivia'],
      gamePlatform: 'Web browser', applicationCategory: 'GameApplication', operatingSystem: 'Any',
      inLanguage: 'en-GB', isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: 'Triviverse', url: SITE_URL },
      ...(route.image ? { image: absolute(route.image) } : {}),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
    })
    blocks.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: BRAND, item: absolute('/geography') },
        { '@type': 'ListItem', position: 2, name: route.name, item: url },
      ],
    })
  } else {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'ItemList', name: `${BRAND} games`,
      itemListElement: GEO_ROUTES.filter(r => r.schema === 'VideoGame').map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: absolute(r.path) })),
    })
  }
  if (route.faq?.length) {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: route.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }
  return blocks
}
