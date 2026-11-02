// Lightweight article index for the app ("Further reading" links under games).
// A hand-kept mirror of src/articles/content, kept small so the app bundle
// never carries article text. test/articles.test.js fails if a slug, title or
// game link here drifts from the full content.
export const ARTICLE_LINKS = [
  { slug: "premier-league-journeymen", title: "The Premier League’s great journeymen", games: ["/tictactoe","/career-path"] },
  { slug: "premier-league-one-club-men", title: "One-club men: the Premier League’s most loyal players", games: ["/teammates","/higher-or-lower"] },
  { slug: "most-premier-league-goals-in-a-season", title: "The 20 best goalscoring seasons in Premier League history", games: ["/higher-or-lower","/501"] },
  { slug: "players-who-played-for-both-rivals", title: "Crossing the divide: players who played for both rivals", games: ["/tictactoe","/connections"] },
  { slug: "top-premier-league-scorer-from-every-country", title: "The top Premier League scorer from every country", games: ["/501","/wordle"] },
  { slug: "players-who-played-in-all-big-five-leagues", title: "The four players who played in all of Europe’s big five leagues", games: ["/career-path","/tictactoe"] },
  { slug: "record-goalscorers-europes-big-five-leagues", title: "The all-time top scorers in each of Europe’s big five leagues", games: ["/501","/tenable"] },
  { slug: "history-of-the-world-transfer-record", title: "The biggest transfer of every year since 1990", games: ["/higher-or-lower","/career-path"] },
  { slug: "most-premier-league-appearances", title: "Most Premier League appearances of all time", games: ["/higher-or-lower","/football-pointless"] },
  { slug: "how-triviverse-football-puzzles-are-made", title: "How a daily football puzzle is made", games: ["/","/about"] },
  { slug: "countries-with-the-most-neighbours", title: "The countries with the most land neighbours", games: ["/geography/overland","/geography/patchwork"] },
  { slug: "longest-overland-journey-most-borders", title: "The longest journey you can make by land, counted in borders", games: ["/geography/overland"] },
  { slug: "countries-with-only-one-neighbour", title: "The countries that border only one other country", games: ["/geography/overland","/geography/borderline"] },
  { slug: "most-and-least-densely-populated-countries", title: "The most and least crowded countries on Earth", games: ["/geography/outrank"] },
  { slug: "biggest-and-smallest-countries", title: "The world’s biggest and smallest countries, by land and by people", games: ["/geography/outrank","/geography/borderline"] },
  { slug: "life-expectancy-by-country", title: "Where people live longest, and shortest", games: ["/geography/outrank"] },
]

// Articles whose 'Play it' links point at this game, newest first in file order.
export const articlesForGame = (path) => ARTICLE_LINKS.filter(a => a.games.includes(path)).slice(0, 3)
