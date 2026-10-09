// ─────────────────────────────────────────────────────────────────────────
// GAME GUIDES — the long-form, game-specific copy under each game.
//
// Written 2026-10-09 after AdSense rejected the site for "low-value content":
// the game pages carried 265–730 words each, most of it the same how-to/FAQ
// template with the game's name swapped in. Each guide here is about one game
// only: a worked example of a real round, what the scoring actually does, how
// to get better at it and where the answers come from. Every rule stated here
// was checked against the game code on that date. If you change a rule, change
// the guide (lives, clocks, skips and guess counts are the usual suspects).
//
// seoConfig.js merges these over its routes: `howTo` and `sections` replace the
// route's own; `faq` replaces it when given, `faqExtra` appends to it.
// ─────────────────────────────────────────────────────────────────────────

export const GUIDES = {
  '/': {
    about: 'Triviverse is a free collection of eleven daily football trivia games: Football Wordle, Tenable, Pointless, Connections, Tic-Tac-Toe, Bingo, Higher or Lower, Football 501, Career Path, Guess the Footballer and Contexto. Each one is a different way of testing what you know about players, clubs and records, and every game is free to play in your browser on a phone or computer with no sign-up and nothing to download.',
    sections: [
      {
        h2: 'Eleven football games, one matchday',
        body: [
          'Triviverse is a set of eleven football trivia games that all run on the same daily clock. At midnight UK time a new matchday starts for everyone at once: a new Wordle surname, a new Tenable list, a new Connections board, a new Tic-Tac-Toe grid and so on across all eleven. Each daily can be played once. Finish it and it locks to your result, so the score you share is the score you actually got.',
          'Every game also has an Unlimited mode for when one round is not enough. Unlimited rounds never touch your streaks or your matchday points, so you can practise as much as you like without risking anything.',
        ],
      },
      {
        h2: 'Which game to start with',
        body: [
          'If you like word games, start with Football Wordle, which gives you six tries to find a footballer’s surname from coloured letter clues. If you are a stats person, Football 501 and Higher or Lower are built on real career numbers. Football 501 has you count down from 501 by naming players, darts style. Higher or Lower asks whether one player scored, played or cost more than another.',
          'For pure recall, Football Tenable asks you to name a top ten and Football Pointless asks for the answer nobody else would think of. Career Path, Guess the Footballer and Football Contexto each hide one player and give you a different kind of clue: his clubs in order, the teammates he played alongside, or how close each of your guesses is to him. Football Tic-Tac-Toe, Football Bingo and Football Connections are about categories, meaning clubs, countries and trophies, and which players sit where two of them meet.',
        ],
      },
      {
        h2: 'Streaks, points and leagues',
        body: [
          'Playing a daily earns matchday points, winning earns more, and keeping a run of days going adds a streak bonus. Clear every daily in a day and the day’s points double. Points reset every Monday, so a new week is a fresh table. You can set up a private league with friends or colleagues, share the code, and see everyone’s week side by side, and the world table ranks everyone playing the dailies.',
          'None of this needs an account. Your progress is kept on your device. Joining a league or the world table stores a nickname and your daily results so that other players can see the table. The Privacy Policy sets out exactly what is kept.',
        ],
      },
      {
        h2: 'Built from real football records',
        body: [
          'The questions are not written by hand. They are generated from a single database of football records covering squads, transfers, league appearances and goals, international caps and honours, mostly drawn from Transfermarkt’s data. The same records then check your answers. That is why a loan spell you remember from twenty years ago counts, and why a player who never actually played for a club does not, however much it feels like he should have.',
          'Every player who can be an answer clears a recognisability threshold, based on how much he played and where. The games are hard because of the questions, not because of obscure names.',
        ],
      },
    ],
  },

  '/wordle': {
    howTo: [
      'The row of tiles shows how many letters the surname has. Every answer is at least five letters long.',
      'Type any surname of that length and press Enter. It does not have to be a real player, so a guess can be used purely to test letters.',
      'Green means the letter is in the right place. Yellow means it is in the surname but somewhere else. Grey means it is not in the surname at all.',
      'You have six rows. Solve it and the full name is revealed. Run out and the answer is shown anyway.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Say the board shows six tiles and the answer is ROONEY. You open with MORATA. The O lights green in second place, the R goes yellow because there is an R somewhere else in the name, and everything else is grey. So you know the second letter is O, the name contains an R that is not third, and there is no M, A or T.',
          'Next you try COOPER. Now both Os and the E are green, and the R is yellow again, this time in sixth place. The pattern is _OO_E_ with an R that is neither third nor sixth, which leaves the first slot. ROO_E_ narrows quickly to ROONEY, solved in three.',
        ],
      },
      {
        h2: 'Footballer surnames are not English words',
        body: [
          'The usual Wordle advice about starting words only half applies, because the answers come from every footballing country. Surnames carry their nationality in their endings, and that is the best clue you get early on. A yellow Z near the end of a long name often means a Spanish or Argentine -EZ (Fernández, Hernández). A run like INHO points to Brazil. SKI suggests Poland, IC or OVIC the Balkans, SEN or SSON Scandinavia, and a double consonant in the middle Italy.',
          'Length is a clue too. Five- and six-letter answers are often short English or Dutch names. Nine letters or more usually means a compound or a Slavic or Iberian name, and filling the vowels quickly matters more than the consonants.',
        ],
      },
      {
        h2: 'Use a guess to buy information',
        body: [
          'Because any combination of letters is accepted, you are never forced to guess a plausible name. If two greens leave dozens of possibilities, spend a row on five or six letters you have not tried yet, even if the result is not a real surname. Players who solve consistently in four or five tend to do this on their second guess, not their fifth.',
          'Accents are stripped, so MÜLLER is typed MULLER and MODRIĆ is MODRIC. Players known by two names are filed under the last word of their name.',
        ],
      },
      {
        h2: 'Who can be the answer',
        body: [
          'The daily answer comes from a curated list of famous footballers, past and present, with each surname used once. The list leans on players a regular football fan would know, from the Premier League, Europe’s other big leagues and major international tournaments. Obscure squad players are left out on purpose. The difficulty should come from the letters, not from a name you have never heard of.',
        ],
      },
    ],
    faq: [
      { q: 'What is Football Wordle?', a: "Football Wordle is a daily word game where you guess a famous footballer's surname in six tries, using green and yellow colour clues just like Wordle." },
      { q: 'How many guesses do I get?', a: 'Six. The number of tiles in each row tells you how many letters the surname has.' },
      { q: 'Does my guess have to be a real name?', a: 'No. Any letters of the right length are accepted, which means you can use a guess purely to test which letters are in the name.' },
      { q: 'Does the footballer change every day?', a: 'Yes. A new footballer is selected each day and refreshes at midnight UK time, the same for everyone.' },
      { q: 'Is Football Wordle the same as Footdle?', a: "Yes. Football Wordle is a footballer Wordle, sometimes searched as Footdle or soccer Wordle: guess the mystery footballer's surname in six tries using green and yellow letter clues." },
      { q: "How do I see today's Football Wordle answer?", a: "Today's answer is revealed the moment you finish the daily, whether you solve it or use all six guesses. If you would rather not wait, Unlimited mode gives you a new footballer to guess instantly." },
      { q: 'Is there a Daily and an Unlimited mode?', a: 'Yes. Daily gives everyone the same footballer each day and tracks your win streak. Unlimited serves random players for endless practice without affecting your stats.' },
    ],
  },

  '/tictactoe': {
    howTo: [
      'Every row and column is a football category: a club, a league, a nationality or a trophy.',
      'Pick a square and name a player who fits BOTH its row and its column.',
      'A player can only be used once per grid.',
      'Daily: fill all nine squares before you lose three lives. 1v1: take turns with a friend, and the first to three in a row wins.',
    ],
    sections: [
      {
        h2: 'Reading a square',
        body: [
          'Each square is where two categories meet. If the row is "Played for Real Madrid" and the column is "Brazil international", you need a Brazilian who played for Real Madrid. Roberto Carlos, Ronaldo, Marcelo, Casemiro and Vinícius Júnior all work. If the row is "Played for Arsenal" and the column is "Won the Champions League", you need someone who did both at some point in his career, not necessarily at the same club. Thierry Henry qualifies through his 2009 win with Barcelona, and Ashley Cole through Chelsea in 2012.',
          'Answers are checked against full career records rather than a short list of famous names, so a two-season spell counts as much as a ten-year one. If a player genuinely did both things, he is accepted.',
        ],
      },
      {
        h2: 'The daily grid',
        body: [
          'The daily is one grid for everyone, built so that every square has at least two well-known players who fit. Fill all nine to win. A wrong answer costs one of your three lives, and since each player can only be used once, the order you fill the squares in matters.',
          'Start with the square you find hardest. Easy squares like "Played for Chelsea" crossed with "England international" have dozens of answers, while a club crossed with a less common nationality might have only two or three. If you spend one of those few on an easy square, the hard square gets harder.',
        ],
      },
      {
        h2: 'Playing 1v1',
        body: [
          'In 1v1, two players share one device as X and O. On your turn you pick a square and name a player for it. Get it right and the square is yours. Get it wrong and the game tells you why the answer failed, then the turn passes to your opponent. Three in a row wins, exactly as in the pencil-and-paper game.',
          'Normal tic-tac-toe strategy still applies. The centre square sits on four lines (its row, its column and both diagonals), the corners sit on three and the edges on only two, so the centre is worth a harder answer. When your opponent has two in a line, block the third square even if you would rather play somewhere easier. You can also build your own grid by choosing all six categories, which is the best way to settle an argument about a particular club.',
        ],
      },
      {
        h2: 'Categories you will meet',
        body: [
          'Clubs are two dozen of the biggest in the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1, from Manchester United, Liverpool and Arsenal to Real Madrid, Juventus, Napoli, Borussia Dortmund and Paris Saint-Germain. Nationalities are a dozen major footballing countries, including England, France, Brazil, Argentina, Spain, Germany, Croatia and Uruguay. The trophies are the Champions League, the World Cup and the Ballon d’Or. League categories ("Played in Serie A") are deliberately broad, so they usually pair with a narrower club or trophy.',
        ],
      },
    ],
    faqExtra: [
      { q: 'What happens if I give a wrong answer in 1v1?', a: 'The game shows why the answer did not fit, for example that the player never played for that club, and the turn passes to your opponent.' },
      { q: 'Do loan spells count?', a: 'Yes. A club appearance is a club appearance, however short the spell. If a player genuinely played for a club, he counts for it.' },
    ],
  },

  '/teammates': {
    howTo: [
      'A well-known footballer is hidden. You are shown one real teammate of his.',
      'Guess who the mystery player is. A wrong guess, or a skip, reveals another teammate.',
      'Each new teammate tends to come from a different club or national team in his career.',
      'Find him within five guesses to win.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Suppose the hidden player is Robert Lewandowski. The first clue is Thomas Müller. That only tells you the mystery player was at Bayern Munich at some point after 2008, which leaves hundreds of options. You guess Arjen Robben, which is wrong, and the second clue appears: Mario Götze.',
          'Now things tighten. Götze played for Dortmund and Bayern, so the mystery player could well be someone who also played for both. You guess Mats Hummels, which is wrong, and the third clue is Pedri. Someone who played with Müller, with Götze and with Pedri at Barcelona narrows to one name, and Lewandowski is solved in four.',
        ],
      },
      {
        h2: 'How the clues are chosen',
        body: [
          'Every teammate shown genuinely played in the same squad as the mystery player in at least one overlapping season. The clues are spread across his career rather than all coming from one club. The game takes one from each team in turn, starting with the biggest teams he played for, so the first clue usually points to the most famous chapter of his career and later clues fill in the rest.',
          'The pool of mystery players is a few hundred well-known footballers, chosen so that a regular fan has a fair chance of knowing who each one played alongside.',
        ],
      },
      {
        h2: 'Thinking in overlaps',
        body: [
          'The useful question is never "who played with this person?" but "who played with all of these people?". One clue is a club and an era. Two clues are an intersection, and the intersection is usually small. Before you guess, picture each teammate’s career as a set of club-and-years boxes and look for the box they share.',
          'Not every clue is equally useful. A one-club player such as a long-serving captain pins you to a single club almost immediately. A well-travelled teammate who spent two seasons each at eight clubs tells you much less. International teammates are a strong nationality clue but say little about the club. When a clue is weak, it is often better to use the guess to rule out the most obvious name than to skip.',
        ],
      },
      {
        h2: 'Guess the Footballer, Career Path and Contexto',
        body: [
          'Three games here hide one player and give you different evidence. Guess the Footballer gives you the people around him. Career Path gives you his clubs in order. Football Contexto gives you nothing but a number for how close each guess is. Fans who remember squads tend to prefer this one, and fans who remember transfers usually prefer Career Path.',
        ],
      },
    ],
    faqExtra: [
      { q: 'Can I skip a clue?', a: 'Yes. Skipping reveals the next teammate but uses up one of your five guesses, exactly as a wrong guess would.' },
    ],
  },

  '/career-path': {
    howTo: [
      'A well-travelled footballer is hidden. The first club of his career is shown, with the years he was there.',
      'Guess who he is. A wrong guess reveals the next club in his career, in order.',
      'Every mystery player has at least five senior clubs, and the whole career is shown by the end.',
      'You get one guess per club in his career, so a ten-club journeyman gives you ten chances. Name him before the clubs run out.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The first card reads RSC Anderlecht, 2009–2011. A Belgian club, and a short first spell, which suggests a teenager who was sold quickly. You guess Vincent Kompany, which is wrong, because Kompany left Anderlecht for Hamburg in 2006. The next card is Chelsea, 2011–2012.',
          'Anderlecht to Chelsea in 2011 is close to a signature. The next guess is Romelu Lukaku, and it is right. If you had needed more clues, the path would have kept going: West Brom, Everton, Manchester United, Inter, Chelsea again, Inter again, Roma and Napoli.',
        ],
      },
      {
        h2: 'Read the years, not just the clubs',
        body: [
          'Each club comes with the seasons the player was there, and the years are often the stronger clue. "Chelsea" alone could be a thousand players. "Chelsea, 2004–" puts you in the first Mourinho squad. Short spells of a season or less usually mean a loan or a move that did not work out, and those are the moves fans remember least, which makes them good clues when they appear early.',
          'Watch the direction of travel as well. A path that climbs from a small club to a giant points to a star. One that goes from a giant to a series of mid-table clubs suggests a player who peaked young or a veteran winding down, and that changes who you should be guessing.',
        ],
      },
      {
        h2: 'Why journeymen are easier than legends',
        body: [
          'It feels backwards, but one-club players can never appear here, and the more clubs a player had, the more unusual his particular sequence becomes. Lots of players went from one Dutch club to the Premier League. Very few went from that Dutch club to that Premier League side in that season and then to Turkey. By the third or fourth card, a well-travelled career is usually unique.',
        ],
      },
      {
        h2: 'Where the careers come from',
        body: [
          'Careers are the clubs on each player’s record, in the order he played for them, with youth and reserve sides filtered out wherever the records identify them. The pool is around eight hundred players with at least five senior clubs, from current stars to well-known names of the last few decades.',
        ],
      },
    ],
    faqExtra: [
      { q: 'Why do some players have more than five clubs?', a: 'Every mystery player has at least five senior clubs, but the game shows the whole career, however long it is.' },
    ],
  },

  '/tenable': {
    howTo: [
      'Each day brings a new top-ten football question, such as a country’s most-capped players or a club’s record signings.',
      'Type answers one at a time. Each correct one drops into its place on the list.',
      'A wrong answer costs one of three lives.',
      'Fill all ten to win. When the round ends, the full list is revealed.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Take "Premier League — All-Time Top Goalscorers". Most people get four or five without thinking: Alan Shearer, Harry Kane, Wayne Rooney, Mohamed Salah and Thierry Henry. Those are your banked points. The rest of the list is where the game is, and the way to find it is by era and by club rather than by trying to remember the list.',
          'Ask who scored the goals for the great Manchester United side of the 1990s and you get Andy Cole. Ask the same about Liverpool and you get Robbie Fowler. Ask who scored for Manchester City’s title sides and you get Sergio Agüero. Then ask who scored a lot without being a striker, and you get Frank Lampard. The last place goes to Jermain Defoe, who scored at a steady rate across several clubs. Working through clubs and eras turns a vague list into a set of short, specific questions you can actually answer.',
        ],
      },
      {
        h2: 'The kinds of question you will get',
        body: [
          'There are around a hundred questions, and they fall into a few families. International lists cover the most-capped players and top goalscorers for countries like England, France, Germany, Spain, Italy, Brazil and Argentina. Transfer lists cover the most expensive signings of all time and each big club’s record buys. Competition lists cover the all-time top scorers and appearance makers in the Premier League, Europe’s other major leagues and the Champions League.',
          'Each family needs a different approach. Caps lists reward thinking about long careers and goalkeepers. Scoring lists reward strikers from before the Premier League era. Transfer lists reward remembering the last ten summers, because fees have climbed so quickly that most of any club’s top ten were signed recently.',
        ],
      },
      {
        h2: 'When to guess and when to stop',
        body: [
          'Three lives is not many. A wrong answer costs the same whether it was a wild guess or a near miss, so the decision is whether you are confident, not whether the name sounds right. A useful habit is to say the name with a reason before typing it: "he must be in it, he played for them for twelve years." If you cannot give the reason, the guess is probably a coin flip.',
          'There is no penalty for stopping early in Unlimited. It is a good place to learn the lists, because the answers you missed are always shown at the end.',
        ],
      },
      {
        h2: 'Football Tenaball, Teneball and footy Tenable',
        body: [
          'Lots of players know this format as Tenaball, Teneball or footy Tenaball rather than Tenable. It is the same daily top-ten football quiz whichever way you spell it, inspired by the ITV game show where contestants try to name all ten answers on a list.',
        ],
      },
    ],
  },

  '/connections': {
    howTo: [
      'Sixteen footballers are shown. They split into four hidden groups of four.',
      'Select four you think share a connection and submit.',
      'A correct group locks in and shows its category. A wrong one costs one of four lives, and if three of your four were right, the game tells you you were one away.',
      'Find all four groups before your lives run out.',
    ],
    sections: [
      {
        h2: 'What the groups can be',
        body: [
          'Every group is one of three things: players who played for the same club, players who represented the same country, or players who won the same trophy. A board might hide "Played for Borussia Dortmund", "Croatia internationals", "Won the Ballon d’Or" and "Played for Napoli", with four players for each.',
          'The groups are built so that each player on the board belongs to exactly one of them. If a puzzle has both a Croatia group and a Ballon d’Or group, Luka Modrić will never appear in it, because he would fit both. Every puzzle has a single solution.',
        ],
      },
      {
        h2: 'Where puzzles go wrong',
        body: [
          'The board is designed to make you see groups of five. A Polish striker sits next to three Dortmund players, and you assume he played there. A famous striker sits among Ballon d’Or winners and you assume he won it. The traps are your associations, not the data, so the most useful question is "do I know this, or does it just feel right?"',
          'A good order is to lock in the group where you are sure of all four players, then look at what is left. With twelve players the decoys are easier to see, and with eight it is often obvious. If you get the one-away message, swap the player you were least sure of, not the one you were most sure of.',
        ],
      },
      {
        h2: 'Who appears on the board',
        body: [
          'Every player shown is well known, chosen from a recognisability score based on where and how much he played. The puzzle is never about an obscure name. It is about knowing which of the famous names in front of you shares a dressing room, a passport or a medal with three of the others.',
        ],
      },
      {
        h2: 'Daily and Unlimited',
        body: [
          'The daily board is the same for everyone and locks to your result once you finish it, whether you solve it or not. Unlimited generates a fresh board whenever you want one and never touches your stats, which makes it a good way to learn how the decoys work.',
        ],
      },
    ],
    faqExtra: [
      { q: 'What does "one away" mean?', a: 'Three of the four players you selected belong to the same group. Swap one of them out and try again.' },
    ],
  },

  '/higher-or-lower': {
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The stat is Premier League goals. Alan Shearer is on the left with 260 shown. Wayne Rooney is on the right with his number hidden. More or fewer? Rooney scored 208, so the answer is fewer. Rooney then moves to the left with 208 showing, a new player arrives on the right, and you go again.',
          'Each right answer adds one to your streak, and one wrong answer ends the run. In the Daily, each of the fifteen questions uses a different stat, so you might go from Premier League goals to Champions League appearances to record transfer fees in three questions.',
        ],
      },
      {
        h2: 'The stats you compare',
        body: [
          'Career goals and appearances in the Premier League, La Liga, Serie A, the Bundesliga, Ligue 1 and the UEFA Champions League. International goals and caps. The most goals each player scored in a single season. League goals and appearances for more than twenty of Europe’s biggest clubs. Record transfer fees, converted to today’s money so that a 1990s fee and a 2020s fee can be compared fairly. Over sixty stats in all, across more than two thousand players.',
        ],
      },
      {
        h2: 'How to get better at it',
        body: [
          'Learn the top of each list. Once you know who leads a stat, every comparison involving that player is free, and the leaders turn up often. Know Shearer for the Premier League, Messi for La Liga, Gerd Müller for the Bundesliga and Cristiano Ronaldo for the Champions League and international goals.',
          'Appearances reward longevity more than fame. A defender who spent fifteen seasons at one club will often have more league appearances than a superstar who moved every three years. Single-season records reward strikers from high-scoring eras. Inflation-adjusted transfer fees change the order you might expect, because some 1990s records are worth far more in today’s money than they sound.',
          'Two players never have exactly the same number, so there is always a right answer.',
        ],
      },
      {
        h2: 'Daily and Unlimited',
        body: [
          'The Daily is fifteen questions, the same for everyone, and clearing all fifteen is a perfect day. It counts once whether you clear it or not. Unlimited lets you pick one stat and play for as long as your streak lasts, and it never affects your stats.',
        ],
      },
    ],
  },

  '/501': {
    howTo: [
      'Each challenge sets a stat (appearances or goals), a competition, and usually a filter such as a club, nationality or position.',
      'Name a footballer who fits. His real career total for that stat is deducted from your score, which starts at 501.',
      'A single player worth more than 180 busts that visit, and the score stays where it was.',
      'Check out by landing between 0 and −10. Go below −10 and you bust.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'Say the challenge is Premier League goals for players who played for Arsenal. Thierry Henry scored 175, under the 180 limit, so he takes you from 501 to 326. Ian Wright and Robin van Persie are big numbers too. A few heavy hitters later you are on 61, and the game changes completely.',
          'You now need a player worth between 61 and 71 to finish, or a smaller one to set up a finish next visit. A centre-back with a handful of goals is useless for a checkout but useful for leaving yourself a tidy number. The live panel shows the biggest safe answer and how many valid checkouts are left, so you can see whether the number you are leaving is a good one.',
        ],
      },
      {
        h2: 'The two halves of the game',
        body: [
          'The first half is recall: who are the big names for this question, and what are they roughly worth? The second half is arithmetic and nerve. Darts players call it setting up a finish, and the same idea applies here. Big names bring the score down fast, while the ending needs a player you are confident is worth a specific amount.',
          'The 180 cap stops one record-breaker from doing all the work. Shearer’s 260 Premier League goals are no use as a single visit, so the scoring greats have to be combined with careful mid-range answers.',
        ],
      },
      {
        h2: 'Every competition, all-time',
        body: [
          'Football 501 covers six competitions back to their founding: the Premier League (Alan Shearer’s 260 goals), La Liga (Lionel Messi’s 474), Serie A (Silvio Piola), the Bundesliga (Gerd Müller’s 365), Ligue 1 and the Champions League. A daily might be top scorers, most appearances or a narrower combination, filtered by club, nationality or position.',
        ],
      },
      {
        h2: 'Build your own question',
        body: [
          'The Build tab lets you design the question yourself. Pick what to count, such as goals, appearances, transfer fees or games two players shared, then stack filters by club, nationality, era or trophy, and play it immediately. Built questions are unlimited and never affect your daily stats.',
          'There is also local multiplayer for two to five players taking turns on one device, with the cleanest checkout winning. It works well for a group arguing about who knows Serie A best.',
        ],
      },
    ],
  },

  '/football-bingo': {
    // The bingo rules changed in PR #89/#90 (two-minute clock, unlimited skips,
    // decoys, a wrong square costs ten seconds). The old FAQ still described
    // three lives and three skips, so it is replaced wholesale here.
    faq: [
      { q: 'How do you play Football Bingo?', a: 'You get a card of twelve football categories, and footballers are dealt one at a time. Place each player on a square he qualifies for. Fill all twelve squares before the two-minute clock runs out to call bingo.' },
      { q: 'What counts as a square?', a: 'Each square is a club, a league, a nation or a trophy, for example "Played for Arsenal", "Played in Serie A", "Brazil international" or "Won the Ballon d’Or".' },
      { q: 'What happens if I place a player on the wrong square?', a: 'It costs ten seconds off the clock and the game moves on to the next player. There are no lives. Only the clock ends a card.' },
      { q: 'Can I skip a player?', a: 'Yes, as often as you like. A skipped player goes to the back of the queue and comes round again later, and skipping costs nothing except the time you spend deciding.' },
      { q: 'Does every player fit somewhere?', a: 'No. Roughly one player in four is a decoy who fits none of the squares. Decoys are always well-known players, so recognising one and skipping him is a test of knowledge, not luck.' },
      { q: 'What if a player fits more than one square?', a: 'Most do, and that is the game. A player can only fill one square, so spending a versatile name on an easy square can make a harder one tougher to fill later.' },
      { q: 'Is every card winnable?', a: 'Yes. The deal is built from the card, with several qualifying players for every square, and skipped players come back round, so a full card is always possible inside the time.' },
      { q: 'Is there a new Football Bingo every day?', a: 'Yes. A new daily card every day, the same for everyone, which locks to your result once you finish it and counts towards your streak. Unlimited cards are available any time and never affect your stats.' },
      { q: 'How is it different from Football Tic-Tac-Toe?', a: 'Tic-Tac-Toe gives you a square and asks for a player who fits two categories at once. Bingo gives you the player and asks which of twelve squares to spend him on. It tests the same football knowledge from the other direction.' },
      { q: 'Is Football Bingo free?', a: 'Completely. No sign-up, no account and no subscription.' },
    ],
  },

  '/football-pointless': {
    about: 'Football Pointless works like the TV quiz Pointless, but with footballers. Every question has hundreds of correct answers. You want the ones nobody else would think of. Each answer you give scores between 0 and 100, roughly how many of a hundred football fans would name that player for that question, and points are bad. Find a correct answer worth 0 and you score a pointless, which wins the round outright.',
    howTo: [
      'Read the question. It will have a large number of correct answers, often several hundred.',
      'Name up to five players who fit. Each one scores from 100 (everyone would say him) down to 0 (nobody would).',
      'Wrong or repeated answers cost nothing. You are told and you go again.',
      'A pointless answer worth 0 wins immediately. Otherwise, keep your five answers under 100 points in total to win.',
    ],
    sections: [
      {
        h2: 'A round, start to finish',
        body: [
          'The question is "Played for Arsenal FC". Everyone’s first thought is someone like William Saliba or Mesut Özil, and both score the full 100: correct, but exactly what everyone else would say. Go back a few years and it gets better. Sol Campbell or Andrey Arshavin score about 15 and Marouane Chamakh about 13. They are real Arsenal players who are not the first name anyone reaches for.',
          'Go further and you find the zeroes. Davor Šuker played a season at Highbury. Rami Shaaban had a spell in goal in 2002–03. Igors Stepanovs started at centre-back in that famous 6–1 at Old Trafford. Each of them is a correct answer that almost nobody gives, and any one of them is a pointless that wins the round.',
        ],
      },
      {
        h2: 'How the scores are worked out',
        body: [
          'Every correct answer to every question has a score from 0 to 100, estimated from the player’s real record for that question. That means how many appearances and goals he had in the relevant club or competition, and how recently. A long-serving star scores close to 100. A player who made a handful of league appearances fifteen years ago scores close to 0.',
          'The score is about this question, not the player in general. A player can be an obvious answer for the club he is famous for and a deep cut for a club where he spent one season on loan.',
        ],
      },
      {
        h2: 'The questions',
        body: [
          'There are more than a hundred and twenty questions in five families. Most ask who played for a particular club, such as Borussia Dortmund, Juventus, Real Madrid, Manchester City or AS Monaco. Others combine a club and a trophy ("Played for Bayern Munich and won the Bundesliga"), ask who played in two leagues ("Played in BOTH the Premier League and La Liga"), ask about a nationality in a league ("France players who appeared in Serie A"), or ask who scored in two competitions ("Scored in the Premier League AND the Champions League").',
        ],
      },
      {
        h2: 'Strategy',
        body: [
          'Think about squads, not stars. The deepest answers are the players who made a few appearances during a famous season, the backup goalkeeper, the January signing who did not settle, the youth-team player who played in a cup run. Eras before the internet are a goldmine, because those squads are the least documented in fans’ memories.',
          'Because wrong answers are free, you can try a name you are only half sure of. The real risk is a correct but obvious answer, which spends one of your five slots and adds points. If you have a guaranteed pointless in mind, play it first.',
        ],
      },
    ],
    faq: [
      { q: 'How does Football Pointless work?', a: 'Every question has many correct answers. Each answer you give scores from 0 to 100 according to how obvious it is, and points are bad. A correct answer nobody would think of scores 0, a pointless, and wins the round.' },
      { q: 'How do I win?', a: 'Name a pointless answer worth 0 and you win immediately. Otherwise, give five correct answers whose scores total less than 100.' },
      { q: 'What happens if I give a wrong answer?', a: 'Nothing. You are told it is not valid for this question and you can try again. Only correct answers use up one of your five slots.' },
      { q: 'How are the scores worked out?', a: 'From each player’s real record for that question: how many appearances and goals he had for the club or in the competition, and how recently. Household names score high and short-stay squad players score low.' },
      { q: 'Is there a new question every day?', a: 'Yes. The daily question is the same for everyone and changes at midnight UK time. Unlimited mode lets you play any of the other questions whenever you like.' },
      { q: 'Can I see the answers I missed?', a: 'Yes. When the round ends you can reveal the full list of correct answers with their scores, including every pointless one.' },
      { q: 'Is Football Pointless free?', a: 'Yes. It is free to play in your browser with no sign-up or download.' },
    ],
  },
}
