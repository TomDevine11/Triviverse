// ─────────────────────────────────────────────────────────────────────────
// GEOGRAPHY GUIDES — the long-form, game-specific copy under each page.
//
// Written 2026-10-16 before Triviverse Geography went live, with AdSense's
// "low-value content" rejection of the football pages (2026-10-06) in mind:
// short pages of templated how-to text are what failed review. Every guide here
// is about one game only — a worked example built from the game's real data,
// the exact rules, how to get better, and where the content comes from. Every
// number was checked against the game code and data on that date. If you change
// a rule (guess counts, thresholds, scoring curves), change the guide too.
//
// seo.js merges these over GEO_ROUTES: `about`, `howTo`, `sections` and `faq`
// replace the route's own fields when given.
// ─────────────────────────────────────────────────────────────────────────

export const GUIDES = {
  '/geography': {
    about: 'Triviverse Geography is a free set of eight daily geography games. Each one tests a different kind of world knowledge: recognising a place from a photograph, placing a moment from history on the map, naming a language from a few seconds of speech, comparing countries’ populations and sizes, identifying a country from its outline or its flag, finding an overland route between two countries, and putting missing countries back on the world map. Everyone gets the same puzzles each day, a new set starts at midnight UK time, and every game runs in the browser with no account and nothing to download.',
    sections: [
      {
        h2: 'Eight ways to know the world',
        body: [
          'Most geography quizzes test one thing, usually capitals or flags. The games here are built so that each one rewards a different skill. Postcard and Milestone are about place: where a photograph was taken, and where a discovery, battle or first happened. Borderline, Unfurl and Patchwork are about recognition: the outline of a country, its flag, and where it sits among its neighbours. Overland is about connection, meaning which countries actually share a land border. Outrank is about scale, meaning which country has more people, more land or longer lives. Earshot is the odd one out, a game you play with your ears, where the clue is a recording of someone speaking.',
          'Someone who aces the flag game can struggle badly with the route game, and a strong history reader can be lost when the clue is a voice. That spread is the point. Playing all eight each day covers a surprising amount of the world, and the gaps in what you know show up quickly.',
        ],
      },
      {
        h2: 'One shared puzzle a day',
        body: [
          'Every game has a daily puzzle that is the same for everyone and changes at midnight UK time. You get one attempt at it. Your progress is saved as you go, so closing the tab halfway through does not lose anything, but finishing locks the daily to your result. That way the score you share is the score you actually got, and a friend comparing results is comparing the same puzzle.',
          'Each daily has a clear line between winning and losing, and the game tells you what it is before you start: name the country within six guesses, score 3,500 of 5,000 points, get five in a row, restore the map before your sixth miss. Winning keeps your streak for that game going. Losing ends it, so a long streak means something.',
          'Seven of the eight games also have an Unlimited mode for practice. Unlimited serves as many rounds as you like, never shows you that day’s daily, and never affects your streaks or league points. Postcard is the exception. It has no Unlimited mode, because every extra photo shown would be one less for a future daily.',
        ],
      },
      {
        h2: 'Streaks, perfect days and leagues',
        body: [
          'Each game keeps its own day streak, and the hub shows your longest live one. Play all eight dailies in a day and it counts as a perfect day, which doubles that day’s league points. Base Camp is your record: your streaks, how often you win each game, your best scores and a calendar of the last sixteen weeks.',
          'Leagues are private weekly tables for friends, family or colleagues. Start one, share the code, and everyone’s geography dailies count towards the table. Scoring is 10 points for each daily played, 25 for each win, 5 more for every day of a game’s streak (up to 25), and a perfect day doubles the lot. Tables reset every Monday. Leagues are separate from Triviverse Football’s, although you keep the same nickname on both.',
          'None of this needs an account. Streaks and results are stored in your own browser. Joining a league stores a nickname and your daily results on the server so that the other members can see the table. The Privacy Policy explains what is kept and for how long.',
        ],
      },
      {
        h2: 'Where the content comes from',
        body: [
          'Every puzzle is built from published sources, and each game’s page says which. Country outlines, borders and the world map come from Natural Earth, a public-domain map dataset. Flags are public-domain artwork from Wikimedia Commons, drawn at their official proportions. Photographs are from Wikimedia Commons under free licences, credited to the photographer on the page. The history questions were written for Milestone, and each answer’s location is checked against the place’s Wikipedia article, with the sources linked after you answer. Earshot’s recordings come from the Wikitongues project and Google’s FLEURS speech dataset, under Creative Commons licences. Outrank’s figures are the World Bank’s World Development Indicators, all for the same year.',
          'Where the real world is messy, the games say how they handle it. Disputed borders follow Natural Earth’s de facto lines. Overseas territories are not drawn as part of their mainland country in the outline game. Countries the World Bank does not publish a figure for are left out of that statistic, not guessed at. If something looks wrong, the Contact page is the place to report it. Corrections are made in the underlying data, so they fix every game that uses it.',
        ],
      },
      {
        h2: 'Which game to start with',
        body: [
          'If you want something quick and familiar, start with Unfurl or Borderline. They are six-guess games where each wrong answer still tells you which way to look. If you like maps, Patchwork and Overland reward knowing where countries sit and what they border. If you prefer stories, Milestone puts history on the map one question at a time. Postcard is a single, careful guess with a photograph. Outrank is fast and slightly addictive, since a run can end on the first question or carry on for all ten. Earshot is the hardest to fake, because you either recognise the sound of a language or you work it out from its family, one longer listen at a time.',
        ],
      },
    ],
    faq: [
      { q: 'What is Triviverse Geography?', a: 'A free collection of eight daily geography games from Triviverse. Everyone gets the same puzzles each day, refreshed at midnight UK time.' },
      { q: 'Do I need an account?', a: 'No. Your progress and streaks are saved in your browser. A nickname is only needed if you join a league.' },
      { q: 'What counts as a perfect day?', a: 'Playing all eight dailies in the same UK day. A perfect day doubles that day’s league points.' },
      { q: 'Is it the same as Triviverse Football?', a: 'It is a sister site with the same makers and the same daily format, but every game is about geography. Leagues and points are kept separately.' },
      { q: 'Is it free?', a: 'Yes. Every game is free to play. The site is supported by advertising.' },
    ],
  },

  '/geography/postcard': {
    about: 'Postcard is a daily photo geography game. Each day a photograph of a real place appears, which might be a famous landmark, a city street, a waterfall, a desert or a mountain range, and you drop a single pin on the world map where you think it was taken. When you lock in your guess, the real location is revealed with the distance between your pin and the spot, and you score up to 5,000 points. The closer you are, the more you get, and 2,500 points (a pin within roughly 1,000 km) wins the day. Everyone gets the same photo each day.',
    howTo: [
      'Study the photograph. Architecture, landscape, vegetation, road markings, signs and the angle of the light are all clues. Tap the expand button to see it full screen.',
      'Pan and zoom the world map, then tap or click to drop your pin. Tap somewhere else to move it, as often as you like.',
      'Lock in your guess. The real location appears with a line to your pin, the distance between them and your score.',
      'Score 2,500 or more to win the day and keep your streak. Then read about the place and come back tomorrow for a new photo.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Say the photo shows an enormous column of orange-red rock rising straight out of flat green jungle, with terraced gardens and the remains of a stone staircase at its foot. The light is hard and tropical, and there are palms in the foreground. Nothing in the frame is written down. The vegetation says the tropics. The rock and the ruined gardens say an ancient royal site, and the lowland jungle rules out the mountains of Southeast Asia. A careful player thinks of South Asia and zooms in on Sri Lanka.',
          'That is Sigiriya, the fifth-century rock fortress in Sri Lanka’s Central Province. A pin near Kandy, 75 km away, scores 4,755. A pin in Colombo, 151 km away, still scores 4,520. Someone who guesses southern India and pins Chennai is 572 km off and scores about 3,400, which is still a comfortable win. Mumbai is 1,500 km away and scores about 1,840, a loss. Bangkok, the obvious guess for anyone thinking of Thai temples, is 2,250 km away and scores about 1,100. Getting the right region is worth far more than getting the exact spot.',
        ],
      },
      {
        h2: 'How scoring works',
        body: [
          'Your score depends only on the distance between your pin and the place in the photo, measured along the surface of the Earth (the great-circle distance). A pin within 1 km scores the full 5,000 points. After that the score falls away smoothly: about 4,970 at 10 km, 4,670 at 100 km, 3,580 at 500 km, 2,570 at 1,000 km, 1,320 at 2,000 km and 180 at 5,000 km. Distances are measured on the globe, not on the flat map, so they are correct across the Pacific and near the poles, where a flat map badly stretches things.',
          'The curve is generous near the target and harsh far from it. Getting the right country usually matters far more than getting the right street, so it is worth spending most of your time working out the region before you fine-tune the pin.',
          'The daily is won with 2,500 points or more. In practice that means placing the photo within about 1,000 km, roughly the distance from London to Berlin. Your result card shows the verdict, the distance, the score and how far short of 2,500 you were if you missed it.',
        ],
      },
      {
        h2: 'Reading a photograph',
        body: [
          'Start with what cannot lie. Vegetation tells you climate: palms and dense green for the tropics, conifers for the north, scrub and bare rock for deserts. The sun’s height and the length of shadows say something about latitude. Water matters too. A turquoise lagoon inside a reef suggests the tropical Pacific or Indian Ocean, while a grey sea under cliffs suggests the North Atlantic.',
          'Then look at what people made. Building materials and roof shapes vary by region in ways that are easy to learn: whitewashed walls and blue doors around the Mediterranean, carved wooden temples in East Asia, adobe in the Andes and the Sahel. Scripts on signs narrow things down at once, even when you cannot read them. Telling Cyrillic from Greek, or Devanagari from Thai, is often enough to win the day.',
        ],
      },
      {
        h2: 'The photographs',
        body: [
          'There are 133 places in the collection, spread across every inhabited continent. They range from world-famous monuments such as Angkor Wat, Petra, Chichén Itzá and the Acropolis to natural sites many people have never heard of, like Caño Cristales in Colombia, the Chocolate Hills of Bohol and the Champagne Pool in New Zealand. Every photo is a real photograph from Wikimedia Commons, used under its free licence (public domain, CC0, CC BY or CC BY-SA). The photographer and licence are credited on the photo itself, with a link to the original.',
          'Each place is located using the coordinates of its Wikipedia article, and after you guess the result card tells you a little about it, with a link to read more. The photos are chosen so the place can be worked out from what is in the frame. There are no close-ups of a wall, no anonymous beaches and no photos with the name written on them.',
        ],
      },
    ],
    faq: [
      { q: 'What is Postcard?', a: 'A free daily geography game: you see a photo of a real place and drop a pin on the world map where you think it was taken.' },
      { q: 'How many guesses do I get?', a: 'One pin per day. You can move it as often as you like before you lock it in.' },
      { q: 'How do I win the daily?', a: 'Score at least 2,500 out of 5,000. That means a pin within roughly 1,000 km of the real spot.' },
      { q: 'Is there an Unlimited mode?', a: 'No. Every photo shown in Unlimited would be one less for a future daily, so Postcard is a once-a-day game.' },
      { q: 'Is it the same photo for everyone?', a: 'Yes. Everyone gets the same photo each day, refreshed at midnight UK time.' },
      { q: 'Where do the photos come from?', a: 'Wikimedia Commons, under free licences. Each photo credits its photographer and licence, with a link to the original.' },
    ],
  },

  '/geography/milestone': {
    about: 'Milestone is a daily history map quiz. Each question describes a real moment, such as a discovery, an invention, a battle, a sporting first or an ancient site, and you drop a pin on the map where you think it happened. Every daily has five questions, the same for everyone, each worth up to 1,000 points, and 3,500 out of 5,000 reaches the day’s milestone and wins. After each answer you learn what happened there, with sources. Unlimited mode serves one question after another whenever you want more.',
    howTo: [
      'Read the clue. It describes what happened and when, and tells you whether you are looking for a town, a building or a wider area.',
      'The map opens on a region chosen for the question. Pan and zoom, then tap to drop your pin.',
      'Lock it in to see the real location, the distance, your points and a short explanation with its sources.',
      'Answer all five. A total of 3,500 or more wins the day.',
    ],
    sections: [
      {
        h2: 'A question, start to finish',
        body: [
          'One question reads: “Orville and Wilbur Wright made the first powered, controlled aeroplane flights on 17 December 1903. Where?” The map opens over North America. Many people know “Kitty Hawk”, but fewer know where it is. It is on the Outer Banks, the long chain of barrier islands off the coast of North Carolina. The flights actually took place at Kill Devil Hills, a few kilometres south of the village.',
          'A pin on the Outer Banks scores close to the full 1,000. A pin in Dayton, Ohio, the brothers’ home town where they built the aircraft, is about 850 km away and scores under 100. That is the trap the question sets. After you answer, the card explains why they chose the site (wind and soft sand dunes) and that the first flight lasted 12 seconds, with a link to the Wikipedia articles used to check the location.',
        ],
      },
      {
        h2: 'How scoring works',
        body: [
          'Each question has its own precision, a radius within which a pin scores the full 1,000 points. It is small for a single building or battlefield (from 12 km) and wider for events spread over a region (up to 80 km). Beyond that radius the score decays smoothly with distance. For a typical 20 km question, a pin 100 km away scores about 780, 250 km about 490, 500 km about 220 and 1,000 km under 50. The radius for the question in front of you is shown on screen.',
          'Five questions make a maximum of 5,000, and 3,500 reaches the milestone. That works out at an average of 700 per question, so you can afford one bad miss if the rest are close, but not two. Distances are measured along the surface of the Earth, so they are correct anywhere on the globe.',
        ],
      },
      {
        h2: 'Getting better at it',
        body: [
          'Read the whole clue before touching the map. Questions usually carry more than one hint: a name, a date, a nationality, a nearby landmark. “Founded by Fatima al-Fihri in 859” points to the medieval Islamic world. “Recognised as the oldest continually operating university” narrows it to Fez, in Morocco.',
          'Use the opening view. The map starts zoomed on the region the question is about, which can be a single country or the whole world. It is not the answer, but it frames the search. If the map opens on East Africa, the question is not about Peru. Then zoom in before you commit. At world scale the width of a fingertip covers hundreds of kilometres, which can cost several hundred points on a tight question.',
        ],
      },
      {
        h2: 'The questions',
        body: [
          'The library has 172 questions across ten categories: history, archaeology, science, invention, sport, firsts, exploration, nature, engineering and culture. They run from 3300 BC to 2023. Each one was written for Milestone. The answer’s coordinates were checked against the place’s Wikipedia article, and the article links are shown after you answer, so you can read the full story.',
          'Every daily draws five questions in a fixed order, the same for everyone. Unlimited mode serves the rest of the library one question at a time, with a running score and average, and always holds back that day’s five so practising can never spoil the daily.',
        ],
      },
    ],
    faq: [
      { q: 'What is Milestone?', a: 'A free daily history and geography quiz: read about a famous moment and drop a pin on the map where it happened.' },
      { q: 'How do I win the daily?', a: 'Score at least 3,500 out of 5,000 across the five daily questions.' },
      { q: 'How precise do I need to be?', a: 'Each question has its own radius, from 12 km for a single site to 80 km for a wider area. Inside it you score the full 1,000, and the score falls away smoothly beyond it.' },
      { q: 'Can I play more than five?', a: 'Yes. Unlimited mode serves questions one after another, with a running score, and never shows you that day’s daily questions.' },
      { q: 'How are the answers checked?', a: 'Each location is checked against the place’s Wikipedia article, and those sources are linked after you answer.' },
    ],
  },

  '/geography/earshot': {
    about: 'Earshot is a daily language-guessing game. You hear a real recording of someone speaking and have six guesses to name the language. The first guess hears only the opening second and a half. Every wrong guess, or a skip, unlocks a longer stretch of the same recording, until the last guess hears all of it. A guess in the right language family turns amber, so even a miss tells you where to look. Everyone gets the same voice each day, and Unlimited mode plays clip after clip with a running score.',
    howTo: [
      'Press play to hear the first 1.5 seconds of today’s recording.',
      'Type a language and pick it from the list, or press Skip to hear more without guessing.',
      'Each wrong guess or skip unlocks a longer stretch: 3, 5, 8 and 13 seconds, then the whole clip on your last guess.',
      'Name the language within six guesses to win. Amber means you have the right family.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Press play and you hear a second and a half of a woman’s voice: soft, with a lot of “sh” sounds and vowels that seem to disappear into the nose. It sounds Romance, maybe. A reasonable first guess is French. It comes back amber, which means right family (Romance), wrong language. The clip now runs to three seconds. The nasal vowels are still there, but the rhythm is looser than French and the ends of words are swallowed. You try Catalan. Amber again, still Romance, but not it.',
          'At five seconds you catch a word ending in a nasal “-ão” and a run of “-ções”, which only one Romance language really does. You guess Portuguese, and it goes green. Your result shows three guesses and how much you needed to hear, 5 seconds. The share grid shows only the colours, so it gives nothing away.',
        ],
      },
      {
        h2: 'What the colours mean',
        body: [
          'Green is the right language. Amber is a language from the same family as the answer: Spanish and Italian are both Romance, Polish and Czech are both Slavic, Finnish and Hungarian are both Uralic, and Amharic and Arabic are both Semitic. Red is a different family entirely. A skip is shown in grey and costs a guess, but it buys more audio without spending a guess on a language you do not believe in.',
          'The families are deliberately narrower than the big textbook groupings. Indo-European, for example, is split into Romance, Germanic, Slavic, Celtic, Indo-Aryan, Iranian and others, so an amber result really does narrow things down. In all, the 159 languages you can guess from are sorted into 36 families.',
        ],
      },
      {
        h2: 'Listening like a linguist',
        body: [
          'Listen for sounds before words. Clicks point to southern and eastern Africa. A dense run of consonants suggests the Caucasus or Slavic languages. Tones, where the pitch of a syllable changes its meaning, are the mark of Mandarin, Cantonese, Vietnamese, Thai and many West African languages. Vowel harmony and long agglutinated words suggest Turkish, Hungarian or Finnish.',
          'Rhythm helps too. Some languages give each syllable roughly the same length, as Spanish, Japanese and Yoruba do. Others squash unstressed syllables between stressed ones, as English, Russian and Dutch do. Even when you cannot place a single word, telling these patterns apart is often enough to get into the right family by your second guess.',
        ],
      },
      {
        h2: 'The recordings',
        body: [
          'The bank has 83 recordings in 81 languages, from widely spoken ones such as English, Mandarin, Spanish and Arabic to languages you may never have heard, like Lingala, Wolof, Cebuano, Twi and Luxembourgish. Every clip is a short excerpt of a real person speaking naturally, not reading a word list. They are trimmed, loudness-matched and re-encoded so that every clip plays at the same volume.',
          'The recordings come from two sources. Wikitongues is a non-profit that records speakers of every language, shared under Creative Commons licences. FLEURS is a multilingual speech dataset published by Google researchers under CC BY 4.0. Each clip is credited with its source and licence on the page. The daily never plays the same language two days running, and Unlimited never plays that day’s daily clip.',
        ],
      },
      {
        h2: 'Unlimited mode',
        body: [
          'Unlimited plays one clip after another, each with the same six-stage reveal. Naming a language on the first stage scores 6 points, on the second 5, and so on down to 1 point on the last. A miss scores nothing. Your session score, the number of rounds and your solved-in-a-row streak are shown at the top, and you can start a fresh session whenever you like.',
        ],
      },
    ],
    faq: [
      { q: 'What is Earshot?', a: 'A free daily game where you hear a recording of someone speaking and name the language in six guesses.' },
      { q: 'How much of the recording do I hear?', a: 'The first 1.5 seconds to start. Each wrong guess or skip unlocks more: 3, 5, 8 and 13 seconds, then the whole clip on your sixth guess.' },
      { q: 'What does amber mean?', a: 'Your guess is in the same language family as the answer, for example Spanish on an Italian clip.' },
      { q: 'How do I win the daily?', a: 'Name the language within six guesses. Skips count as guesses.' },
      { q: 'Where are the recordings from?', a: 'The Wikitongues project and Google’s FLEURS dataset, both under Creative Commons licences. Each clip is credited on the page.' },
    ],
  },

  '/geography/borderline': {
    about: 'Borderline is a free country guessing game: guess the country by its shape. Each day the silhouette of one country appears on the board, and you have six guesses to name it. After each wrong guess you are told how far your country is from the answer, which compass direction to head and how close you are as a percentage, so even a wild first guess narrows the map. Everyone gets the same country each day, and Unlimited mode serves a random country whenever you want another, without touching your daily streak.',
    howTo: [
      'Study the silhouette. Every country is scaled to fill the board, so size is not a clue, but the shape of coastlines and borders is.',
      'Type a country and pick it from the suggestions.',
      'Each wrong guess shows the distance between the two countries, an arrow towards the answer and a closeness percentage.',
      'Use the clues to close in. Name the country within six guesses to win.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The shape on the board is long and narrow, running from top to bottom, with a smooth coastline down its right-hand side and a ragged inland edge that hooks around something on its upper left. Without a sense of scale it could be anywhere, so you open with a probe in the middle of a continent, Chad. The clue comes back as 4,062 km away, head south-east, 79% close. South-east of Chad and about 4,000 km off means southern or eastern Africa.',
          'A long eastern coastline in that part of the world suggests the Indian Ocean. You try Kenya. Now it says 1,988 km away, head south, 90%. Directly south of Kenya, past Tanzania, the coast belongs to a long, thin country whose border wraps around Malawi in exactly that hook. Third guess, Mozambique, solved. Two wrong guesses, and each one did a lot of work.',
        ],
      },
      {
        h2: 'How the clues are worked out',
        body: [
          'Distance is the great-circle distance between the centre of your guess and the centre of the answer, measured over the curve of the Earth. Neighbouring countries can still be hundreds of kilometres apart, because it is measured from centre to centre, not border to border. France and Germany, which share a long border, are 762 km apart by this measure.',
          'The arrow is the compass heading from your country towards the answer, as you would read it on an ordinary world map, to the nearest of eight points. Closeness runs from 0% for a country on the exact opposite side of the planet to 100% for the answer itself, falling evenly with distance. The arrow tells you which way to go, and closeness tells you how far. Using both together is the whole skill of the game.',
        ],
      },
      {
        h2: 'A good first guess',
        body: [
          'A first guess is a probe, not a shot at the answer. Unless you recognise the shape outright, pick a large, central country whose distance and direction will tell you the most. Countries in the middle of a landmass, such as Chad, Kazakhstan or Brazil, are good probes, because from there the arrow can point almost anywhere.',
          'Then read the shape again with the clue in mind. Once you know you are looking in Southeast Asia, a long S-shaped silhouette is Vietnam, while a shape split in two by the sea is Malaysia. Lean on coastlines. Borders drawn along rivers wiggle, borders drawn by treaty run straight, and islands give a shape away almost at once.',
        ],
      },
      {
        h2: 'Where the outlines come from',
        body: [
          'Country shapes come from Natural Earth, a public-domain map dataset used by cartographers and newsrooms. Far-flung overseas territories are left off the outline, so French Guiana is not drawn with France and Hawaii is not drawn with the United States. The shape you see is the one you would recognise on a map. Nearby islands such as Corsica, Crete, Sicily or Tasmania are kept, because they belong to the shape.',
          'There are 198 countries and territories that can be the daily answer, from the large and obvious to places such as Puerto Rico, Greenland, Jersey and Hong Kong. You can guess any of 238, so even a guess that cannot be the answer still returns a useful clue. The daily works through all 198 in a shuffled order before any of them comes round again.',
        ],
      },
    ],
    faq: [
      { q: 'What is Borderline?', a: 'A free daily geography game where you identify a country from its silhouette in six guesses, using distance, direction and closeness clues.' },
      { q: 'Is it the same country for everyone?', a: 'Yes. Everyone gets the same country each day, and it changes at midnight UK time.' },
      { q: 'How is the distance calculated?', a: 'It is the great-circle distance between the centres of the two countries, so even bordering countries show a distance.' },
      { q: 'Is size a clue?', a: 'No. Every country is scaled to fill the board, so Russia and Malta appear the same size. Only the shape matters.' },
      { q: 'Can I play more than one a day?', a: 'Yes. Unlimited mode gives you a random country as often as you like without affecting your daily streak.' },
      { q: 'Is Borderline the same as Worldle?', a: 'No. Borderline is made independently by Triviverse and is not affiliated with Worldle or any other game. It uses a similar idea, naming a country from its outline with distance and direction clues, and is part of Triviverse Geography, so your daily result also scores points in leagues with friends. It has its own Unlimited mode for extra rounds.' },
    ],
  },

  '/geography/overland': {
    about: 'Overland is a daily route-finding puzzle. You are given a start country and a destination, and you have to name the countries that link them over land. Guess in any order. Each country you name appears on the map, coloured by how close it is to a shortest route. When the countries you have named form an unbroken land chain from start to destination, you have arrived. You get the shortest route’s length plus four guesses, and three hints if you get stuck.',
    howTo: [
      'Read today’s start and destination.',
      'Name any country you think lies between them, in any order.',
      'Green is on a shortest route. Yellow is one country off it, orange two, and red is further or not connected by land at all.',
      'Arrive by linking start to destination through land borders before your guesses run out.',
    ],
    sections: [
      {
        h2: 'A route, start to finish',
        body: [
          'Take a short one first: France to Poland. The shortest route has a single country in between, Germany, so you get five guesses. Name Germany and it goes green, the chain France–Germany–Poland is complete and you have arrived in one guess, a perfect score. Suppose instead you had opened with the Czech Republic. It goes yellow, one country off a shortest route, because France–Germany–Czech Republic–Poland is one step longer than it needs to be. Austria would come back orange. Spain would be orange too, since getting there and back costs two extra countries.',
          'A longer daily might ask for Portugal to Greece, where the shortest route has seven countries in between: Spain, France, Italy, Slovenia, Croatia, Montenegro and Albania. That gives eleven guesses. The route along the Adriatic is not the only one of that length, and any unbroken chain counts. A player who goes through Switzerland and Austria instead, or detours into Serbia, still arrives. They just use more of their guesses.',
        ],
      },
      {
        h2: 'Which borders count',
        body: [
          'Only land borders count, taken from Natural Earth’s country boundaries. Countries that face each other across a strait or a sea are not neighbours, however close they are. The United Kingdom and France do not border each other in Overland, despite the Channel Tunnel. Spain and Morocco do, at Ceuta and Melilla. Overseas territories are left out, so France does not border Brazil through French Guiana. Exclaves do count, so Russia borders Poland and Lithuania through Kaliningrad.',
          'Disputed areas follow Natural Earth’s de facto boundaries, so Kosovo and Western Sahara are countries you can route through. Island countries with no land border at all, such as Japan, Iceland or New Zealand, are never a start or a destination. There are 4,348 possible start-and-destination pairs, and every daily is checked to have a route.',
        ],
      },
      {
        h2: 'Hints',
        body: [
          'Three hints are available, each once per puzzle. “Next outline” draws the outline of the next country you need on the map, without naming it. “All borders” draws every country’s outline, which helps when you are unsure what lies between two places. “Initials” shows the first letter of each country on a shortest route.',
          'Hints do not cost guesses, but they are counted in your shared result, so a friend can see whether you found the route on your own.',
        ],
      },
      {
        h2: 'Planning a route',
        body: [
          'Before guessing, trace the route in your head from both ends. Name the country next to the start, then the country next to the destination, and meet in the middle. A colour tells you more than whether you were right. Yellow means the country is close to a good route, so its neighbours are worth a look. Red often means you have crossed water in your head.',
          'Watch for the borders people forget. Small countries in the middle of a route, like Liechtenstein, Andorra and Luxembourg, or the Balkan states, are often the difference between a short route and a long one. Big countries can be shortcuts: the Democratic Republic of the Congo borders nine countries, and Russia fourteen.',
        ],
      },
      {
        h2: 'Reading your result',
        body: [
          'Every win is scored against the shortest route. Arriving using exactly as many guesses as the shortest route has countries is a perfect run, shown with a sparkle in your shared result. Each extra guess counts as one over, from +1 up to +4, the most the guess limit allows. The chart on your result card shows how often you have finished at each of those marks, so over a few weeks it shows whether your routes are getting tighter.',
          'The share text shows one coloured square per guess, in the order you made them, so a friend can see whether you went straight down the route or wandered off it first, without learning which countries you named. It also shows how many hints you used. If you run out of guesses, the result card shows a shortest route in full, so you can see which link you were missing.',
        ],
      },
    ],
    faq: [
      { q: 'What is Overland?', a: 'A free daily geography puzzle where you connect two countries by naming the countries that lie between them over land.' },
      { q: 'How many guesses do I get?', a: 'The number of countries on the shortest route, plus four.' },
      { q: 'Do I have to find the shortest route?', a: 'No. Any unbroken land route wins. Your result shows how many guesses you used compared with the shortest route.' },
      { q: 'How do I win the daily?', a: 'Complete a land route from start to destination before your guesses run out.' },
      { q: 'Do sea crossings count?', a: 'No. Only land borders count, so the United Kingdom does not border France, but Spain does border Morocco.' },
    ],
  },

  '/geography/unfurl': {
    about: 'Unfurl is a daily flag puzzle. The day’s flag is hidden under six tiles with just one uncovered, and you have six guesses to name the country. Every wrong guess lifts another tile and tells you how far your guess is from the answer, which way to head and how close you are as a percentage. The flag and the map close in together. Everyone gets the same flag each day, and Unlimited mode serves random flags.',
    howTo: [
      'Study the uncovered tile of the flag: its colours, stripes and any part of an emblem.',
      'Type a country and pick it from the suggestions.',
      'A wrong guess uncovers another tile and shows the distance, direction and closeness to the answer.',
      'Name the country within six guesses to win. The whole flag is revealed at the end either way.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The one open tile shows a corner of bright green, cut off by a diagonal edge. Green on its own could be half the flags in Africa or the Islamic world, so you guess Nigeria, whose flag is green and white. Wrong. The clue reads 3,446 km away, head south-east, 82% close. A second tile lifts and shows a broad black band edged in yellow, running diagonally across the flag.',
          'Black, yellow and green together suggest Jamaica, but Jamaica’s stripes form an X, and Jamaica is on the far side of the Atlantic. The clue puts the answer in Africa, south-east of Nigeria. A single diagonal band in black and yellow, with green above it, in East Africa can only be Tanzania. You name it with your second guess, and the whole flag unfurls, including the blue triangle in the bottom-right corner. A good flag round mixes recognition with map reasoning, and neither alone gets you there as fast.',
        ],
      },
      {
        h2: 'How the tiles and clues work',
        body: [
          'The flag sits under a grid of six tiles, two rows of three. One tile is open at the start, and every wrong guess opens one more in a fixed order, so by your sixth and final guess you can see five sixths of the flag. Win or lose, the full flag is revealed at the end.',
          'Each wrong guess is scored exactly as it is in Borderline: the great-circle distance between the centres of the two countries, the compass direction from your guess towards the answer, and a closeness percentage that runs from 0% at the opposite side of the planet to 100% at the answer.',
        ],
      },
      {
        h2: 'Getting better at flags',
        body: [
          'Learn the families of flags rather than flags one by one. The pan-African colours of red, gold and green run through Ghana, Senegal, Mali, Cameroon, Ethiopia and many more. The pan-Arab red, white, black and green appear across the Middle East and North Africa. The Nordic cross belongs to Denmark, Norway, Sweden, Finland and Iceland. Pan-Slavic red, white and blue run through Russia, Serbia, Slovakia and Slovenia. One tile is often enough to place a flag in its family, and the distance clue does the rest.',
          'Use proportions as well. Most flags are 2:3, but Switzerland and Vatican City are square, Nepal’s is a double pennant, and Qatar’s is unusually long at 11:28. When a tile shows a flag running off the edge sooner than you expect, that is a clue in itself.',
        ],
      },
      {
        h2: 'Where the flags come from',
        body: [
          'Flags are drawn at their official proportions from public-domain artwork on Wikimedia Commons, so emblems, coats of arms and stars are shown in full detail when the last tile lifts. There are 197 flags in the daily pool. A flag that is identical to another answer’s is never used as the answer, because that would leave the round to a coin toss. New Caledonia, which flies the French tricolour, is the one excluded for that reason.',
          'The daily works through the whole pool in a shuffled order before any flag repeats. Unlimited mode picks a random flag each round and never affects your daily streak.',
        ],
      },
      {
        h2: 'Using the flag and the map together',
        body: [
          'The two kinds of clue work best side by side. The flag narrows the answer to a family of similar flags, and the distance clue picks one country from that family. A flag that is red over white could be Indonesia or Monaco, which are almost identical apart from their proportions. A clue that points thousands of kilometres east towards Southeast Asia, rather than to the Mediterranean, settles it at once.',
          'So it can be worth spending an early guess on a country you know is wrong, if it sits somewhere that will give a clear direction. A central guess like Egypt or Kazakhstan gives an arrow that means something wherever the answer is. A guess on the edge of the map, like New Zealand, mostly tells you that the answer is somewhere else.',
        ],
      },
    ],
    faq: [
      { q: 'What is Unfurl?', a: 'A free daily flag-guessing game: identify the country from a flag hidden under six tiles, with one more tile and a distance clue after each wrong guess.' },
      { q: 'How many guesses do I get?', a: 'Six. One tile is uncovered at the start and each wrong guess uncovers another.' },
      { q: 'How do I win the daily?', a: 'Name the country within six guesses.' },
      { q: 'Is it the same flag for everyone?', a: 'Yes. Everyone gets the same flag each day, refreshed at midnight UK time.' },
      { q: 'Are the flags accurate?', a: 'Yes. They are drawn at their official proportions from public-domain artwork on Wikimedia Commons.' },
    ],
  },

  '/geography/patchwork': {
    about: 'Patchwork is a daily map puzzle. Every day seven countries are cut out of the world map: two from Africa, two from Europe, and one each from Asia, the Americas and Oceania. Name a missing country and its exact shape returns in green, islands and all. You have six lives. A country that is already on the map counts as a miss, and the sixth miss ends the day. Restore all seven first to win, and try to do it with as few misses as possible.',
    howTo: [
      'Look for the gaps. Each missing country is a dashed, numbered hole in the map. Tap a number to zoom in on it.',
      'Type a country and pick it from the suggestions.',
      'If it is missing, it returns to the map in green. If it is already on the map, that counts as a miss.',
      'Restore all seven before your sixth miss to win.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The map opens with seven numbered gaps. Say gap 1 is a big, blocky hole on the Atlantic coast of north-west Africa, below Western Sahara and above Senegal. Mali comes to mind first, so you name it. But Mali is already on the map, just to the east, so that is one miss and the first red dot on the miss tracker. Looking again, the gap touches the ocean, and Mali has no coastline. The coastal country between Western Sahara and Senegal is Mauritania, and it snaps back in green.',
          'Gap 5 is a small, landlocked hole in Central Asia, wedged between Kazakhstan to the north, China to the east and Tajikistan to the south. You tap the number to zoom in. The shape is wide and mountainous, with a long, narrow arm reaching west into the Fergana Valley. That is Kyrgyzstan. The rest of the map goes the same way: zoom in, read the neighbours, and name the country only once the coastline and borders agree.',
        ],
      },
      {
        h2: 'Lives and scoring',
        body: [
          'There is no clock. You have six lives, and only wrong guesses cost one: naming a country that is already on the map. The sixth miss ends the puzzle and reveals the countries you had not found. Restore all seven first and you win. Your result counts how many misses it took, from a flawless zero to five.',
          'If you are completely stuck you can reveal the answers yourself, which ends the day as a loss. Your share grid shows each guess as a green or red square in order, so it shows how you got there without naming any countries.',
        ],
      },
      {
        h2: 'How the countries are chosen',
        body: [
          'Each region keeps its own list. Africa has 53 eligible countries, Europe 39, Asia 46, the Americas 30 and Oceania 8. Each list is shuffled, and a country does not come back until the rest of its region has been used. The two African and two European gaps are drawn from their lists in the same way. Regions follow the UN’s geographic groupings.',
          'Countries too small to see on a world map are never removed. Monaco, Vatican City, Singapore and most Caribbean and Pacific micro-states would be a single pixel, so there is nothing to find. Every gap that does appear can be zoomed into until its coastline is clear.',
        ],
      },
      {
        h2: 'The map',
        body: [
          'The map is drawn from Natural Earth’s public-domain country boundaries, the same geography used across Triviverse Geography. Restoring a country brings back every part of it, so restoring France also restores French Guiana and Réunion. The view is a standard Mercator projection, which keeps shapes recognisable but makes countries far from the equator look larger than they are.',
        ],
      },
      {
        h2: 'Getting better at Patchwork',
        body: [
          'Read each gap by its neighbours, not its shape. A hole on the map is surrounded by countries you can see, and naming them in your head usually leaves only one candidate. Whether a gap touches the sea is the quickest test: if it does, every landlocked country is ruled out, and if it does not, every coastal one is.',
          'Spend misses carefully. With six lives and seven countries to find, a couple of wrong guesses are affordable, but not on every gap. If two countries fit a gap equally well, zoom in before guessing. Coastlines, lakes and islands at full zoom usually settle it. Start with the gaps you are sure of, because every restored country also fixes the borders around the harder gaps next to it.',
        ],
      },
    ],
    faq: [
      { q: 'What is Patchwork?', a: 'A free daily geography puzzle. Seven countries are missing from the world map, and you name them to put them back.' },
      { q: 'How many misses do I get?', a: 'Six lives. The sixth miss ends the puzzle and reveals the missing countries.' },
      { q: 'How do I win the daily?', a: 'Restore all seven countries before your sixth miss.' },
      { q: 'Which countries can be missing?', a: 'Two from Africa, two from Europe, and one each from Asia, the Americas and Oceania, never including micro-states too small to see on a world map.' },
      { q: 'Is it the same map for everyone?', a: 'Yes. Everyone gets the same missing countries each day, refreshed at midnight UK time, and Unlimited mode gives you a fresh set whenever you like.' },
    ],
  },
}
