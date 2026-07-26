// Football Tenable — daily "name the top 10" trivia questions.
// Each question has exactly 10 distinct ranked answers. `aliases` cover
// common spellings/nicknames so the fuzzy guess-matcher can accept them.
//
// These are precomputed CLOSED answer sets shipped with the question — the
// "GOOD" pattern from the architecture review (validate against the stored
// set, never query at runtime). AS_OF records when the rankings were last
// verified; the validator test enforces the answer-set shape in CI.

import generated from './tenable.generated.json'
import dailyAllow from './tenable.daily.generated.json'

export const TENABLE_AS_OF = '2026-06-30'

// Hand-curated questions cover the shapes the generator can't produce from the
// 501 fact tables — World Cup / international scorers, awards, transfers,
// assists, cards, all-competition club totals, title counts, etc.
const HAND_AUTHORED = [
  {
    id: 'wc-top-scorers',
    type: 'player',
    title: 'FIFA World Cup — All-Time Top Goalscorers',
    emoji: '🌍',
    description: 'Name the 10 players with the most goals in FIFA World Cup history.',
    answers: [
      { rank: 1,  text: 'Miroslav Klose',     detail: '16 goals', aliases: ['klose'] },
      { rank: 2,  text: 'Ronaldo',            detail: '15 goals', aliases: ['ronaldo nazario', 'r9', 'ronaldo nazário'] },
      { rank: 3,  text: 'Gerd Müller',        detail: '14 goals', aliases: ['gerd muller', 'muller', 'müller'] },
      { rank: 4,  text: 'Just Fontaine',      detail: '13 goals', aliases: ['fontaine'] },
      { rank: 5,  text: 'Lionel Messi',       detail: '13 goals', aliases: ['messi', 'leo messi'] },
      { rank: 6,  text: 'Pelé',               detail: '12 goals', aliases: ['pele'] },
      { rank: 7,  text: 'Kylian Mbappé',      detail: '12 goals', aliases: ['mbappe', 'kylian mbappe', 'mbappé'] },
      { rank: 8,  text: 'Sándor Kocsis',      detail: '11 goals', aliases: ['sandor kocsis', 'kocsis'] },
      { rank: 9,  text: 'Jürgen Klinsmann',   detail: '11 goals', aliases: ['jurgen klinsmann', 'klinsmann'] },
      { rank: 10, text: 'Thomas Müller',      detail: '10 goals', aliases: ['thomas muller', 'thomas müller'] },
    ],
  },
  {
    id: 'ballon-dor-most-wins',
    type: 'player',
    title: "Ballon d'Or — Most Wins All-Time",
    emoji: '🏅',
    description: "Name the 10 players who have won the Ballon d'Or the most times.",
    answers: [
      { rank: 1,  text: 'Lionel Messi',          detail: '8 wins', aliases: ['messi', 'leo messi'] },
      { rank: 2,  text: 'Cristiano Ronaldo',     detail: '5 wins', aliases: ['cristiano', 'cr7'] },
      { rank: 3,  text: 'Johan Cruyff',          detail: '3 wins', aliases: ['cruyff'] },
      { rank: 4,  text: 'Michel Platini',        detail: '3 wins', aliases: ['platini'] },
      { rank: 5,  text: 'Marco van Basten',      detail: '3 wins', aliases: ['van basten'] },
      { rank: 6,  text: 'Alfredo Di Stéfano',    detail: '2 wins', aliases: ['di stefano', 'alfredo di stefano'] },
      { rank: 7,  text: 'Franz Beckenbauer',     detail: '2 wins', aliases: ['beckenbauer'] },
      { rank: 8,  text: 'Kevin Keegan',          detail: '2 wins', aliases: ['keegan'] },
      { rank: 9,  text: 'Karl-Heinz Rummenigge', detail: '2 wins', aliases: ['rummenigge'] },
      { rank: 10, text: 'Ronaldo Nazário',       detail: '2 wins', aliases: ['ronaldo nazario', 'r9', 'o fenomeno', 'o fenômeno', 'ronaldo brazil'] },
    ],
  },
  {
    id: 'england-top-scorers',
    type: 'player',
    title: 'England — All-Time Top Goalscorers',
    emoji: '🏴',
    description: 'Name the 10 players with the most goals for the England national team.',
    answers: [
      { rank: 1,  text: 'Harry Kane',     detail: '68 goals', aliases: ['kane'] },
      { rank: 2,  text: 'Wayne Rooney',   detail: '53 goals', aliases: ['rooney'] },
      { rank: 3,  text: 'Bobby Charlton', detail: '49 goals', aliases: ['charlton'] },
      { rank: 4,  text: 'Gary Lineker',   detail: '48 goals', aliases: ['lineker'] },
      { rank: 5,  text: 'Jimmy Greaves',  detail: '44 goals', aliases: ['greaves'] },
      { rank: 6,  text: 'Michael Owen',   detail: '40 goals', aliases: ['owen'] },
      { rank: 7,  text: 'Tom Finney',     detail: '30 goals', aliases: ['finney'] },
      { rank: 8,  text: 'Nat Lofthouse',  detail: '30 goals', aliases: ['lofthouse'] },
      { rank: 9,  text: 'Alan Shearer',   detail: '30 goals', aliases: ['shearer'] },
      { rank: 10, text: 'Frank Lampard',  detail: '29 goals', aliases: ['lampard'] },
    ],
  },
  {
    id: 'ecl-most-titles',
    type: 'club',
    title: 'European Cup / Champions League — Clubs With Most Titles',
    emoji: '🏆',
    description: 'Name the 10 clubs that have won the European Cup / Champions League the most times.',
    answers: [
      { rank: 1,  text: 'Real Madrid',       detail: '15 titles', value: 15, aliases: ['real madrid'] },
      { rank: 2,  text: 'AC Milan',          detail: '7 titles',  value: 7,  aliases: ['ac milan', 'milan'] },
      { rank: 3,  text: 'Bayern Munich',     detail: '6 titles',  value: 6,  aliases: ['bayern munich', 'bayern', 'fc bayern'] },
      { rank: 4,  text: 'Liverpool',         detail: '6 titles',  value: 6,  aliases: ['liverpool fc', 'liverpool'] },
      { rank: 5,  text: 'Barcelona',         detail: '5 titles',  value: 5,  aliases: ['fc barcelona', 'barca', 'barça'] },
      { rank: 6,  text: 'Ajax',              detail: '4 titles',  value: 4,  aliases: ['ajax amsterdam'] },
      { rank: 7,  text: 'Manchester United', detail: '3 titles',  value: 3,  aliases: ['man united', 'man utd', 'manchester united'] },
      { rank: 8,  text: 'Inter Milan',       detail: '3 titles',  value: 3,  aliases: ['inter milan', 'inter', 'internazionale'] },
      { rank: 9,  text: 'Chelsea',           detail: '2 titles',  value: 2,  aliases: ['chelsea fc'] },
      { rank: 10, text: 'Juventus',          detail: '2 titles',  value: 2,  aliases: ['juventus fc', 'juve'] },
    ],
    // The 10th spot is a tie: six clubs have 2 European Cups, but only two slots
    // exist — so any 2-title club counts for the joint-9th/10th places.
    tieValue: 2,
    tiePool: [
      { text: 'Benfica',             aliases: ['sl benfica', 'benfica'] },
      { text: 'Porto',               aliases: ['fc porto', 'porto'] },
      { text: 'Nottingham Forest',   aliases: ['nottingham forest', 'forest', 'nottm forest'] },
      { text: 'Paris Saint-Germain', aliases: ['psg', 'paris saint-germain', 'paris saint germain', 'paris sg'] },
    ],
  },
  {
    id: 'pl-most-hattricks',
    type: 'player',
    title: 'Premier League — Most Hat-Tricks All-Time',
    emoji: '🎩',
    description: 'Name the 10 players with the most Premier League hat-tricks.',
    answers: [
      { rank: 1,  text: 'Sergio Agüero', detail: '12 hat-tricks', aliases: ['aguero', 'sergio aguero', 'kun aguero'] },
      { rank: 2,  text: 'Alan Shearer',  detail: '11 hat-tricks', aliases: ['shearer'] },
      { rank: 3,  text: 'Harry Kane',    detail: '10 hat-tricks', aliases: ['kane'] },
      { rank: 4,  text: 'Robbie Fowler', detail: '9 hat-tricks',  aliases: ['fowler'] },
      { rank: 5,  text: 'Thierry Henry', detail: '8 hat-tricks',  aliases: ['henry'] },
      { rank: 6,  text: 'Michael Owen',  detail: '7 hat-tricks',  aliases: ['owen'] },
      { rank: 7,  text: 'Jermain Defoe', detail: '7 hat-tricks',  aliases: ['defoe'] },
      { rank: 8,  text: 'Didier Drogba', detail: '6 hat-tricks',  aliases: ['drogba'] },
      { rank: 9,  text: 'Wayne Rooney',  detail: '6 hat-tricks',  aliases: ['rooney'] },
      { rank: 10, text: 'Robin van Persie', detail: '5 hat-tricks', aliases: ['van persie', 'rvp'] },
    ],
  },
  {
    id: 'brazil-top-scorers',
    type: 'player',
    title: 'Brazil — All-Time Top Goalscorers',
    emoji: '🇧🇷',
    description: 'Name the 10 players with the most goals for the Brazil national team.',
    answers: [
      { rank: 1,  text: 'Neymar',             detail: '79 goals', aliases: ['neymar jr'] },
      { rank: 2,  text: 'Pelé',               detail: '77 goals', aliases: ['pele'] },
      { rank: 3,  text: 'Ronaldo',            detail: '62 goals', aliases: ['ronaldo nazario', 'r9'] },
      { rank: 4,  text: 'Romário',            detail: '55 goals', aliases: ['romario'] },
      { rank: 5,  text: 'Zico',               detail: '48 goals', aliases: ['zico'] },
      { rank: 6,  text: 'Bebeto',             detail: '39 goals', aliases: ['bebeto'] },
      { rank: 7,  text: 'Rivaldo',            detail: '35 goals', aliases: ['rivaldo'] },
      { rank: 8,  text: 'Jairzinho',          detail: '33 goals', aliases: ['jairzinho'] },
      { rank: 9,  text: 'Ronaldinho',         detail: '33 goals', aliases: ['ronaldinho'] },
      { rank: 10, text: 'Tostão',             detail: '32 goals', aliases: ['tostao'] },
    ],
  },
  {
    id: 'real-madrid-top-scorers',
    type: 'player',
    title: 'Real Madrid — All-Time Top Goalscorers',
    emoji: '⚪',
    description: 'Name the 10 players with the most goals for Real Madrid.',
    answers: [
      { rank: 1,  text: 'Cristiano Ronaldo', detail: '450 goals', aliases: ['ronaldo', 'cr7'] },
      { rank: 2,  text: 'Karim Benzema',     detail: '354 goals', aliases: ['benzema'] },
      { rank: 3,  text: 'Raúl',              detail: '323 goals', aliases: ['raul', 'raul gonzalez'] },
      { rank: 4,  text: 'Alfredo Di Stéfano',detail: '308 goals', aliases: ['di stefano', 'alfredo di stefano'] },
      { rank: 5,  text: 'Santillana',        detail: '290 goals', aliases: ['santillana'] },
      { rank: 6,  text: 'Ferenc Puskás',     detail: '242 goals', aliases: ['puskas', 'ferenc puskas'] },
      { rank: 7,  text: 'Hugo Sánchez',      detail: '234 goals', aliases: ['hugo sanchez'] },
      { rank: 8,  text: 'Gento',             detail: '182 goals', aliases: ['francisco gento'] },
      { rank: 9,  text: 'Pirri',             detail: '172 goals', aliases: ['jose martinez sanchez', 'pirri'] },
      { rank: 10, text: 'Amancio',           detail: '155 goals', aliases: ['amancio amaro'] },
    ],
  },
  {
    id: 'pl-titles-clubs',
    type: 'club',
    title: 'English Top Flight — Clubs With Most League Titles',
    emoji: '🥇',
    description: 'Name the 10 clubs with the most English top-flight league titles (including the old First Division).',
    answers: [
      { rank: 1,  text: 'Manchester United',   detail: '20 titles', aliases: ['man united', 'man utd', 'manchester united'] },
      { rank: 2,  text: 'Liverpool',           detail: '20 titles', aliases: ['liverpool fc', 'liverpool'] },
      { rank: 3,  text: 'Arsenal',             detail: '14 titles', aliases: ['arsenal fc', 'gunners'] },
      { rank: 4,  text: 'Manchester City',     detail: '10 titles', aliases: ['man city', 'manchester city'] },
      { rank: 5,  text: 'Everton',             detail: '9 titles',  aliases: ['everton fc'] },
      { rank: 6,  text: 'Aston Villa',         detail: '7 titles',  aliases: ['aston villa', 'villa'] },
      { rank: 7,  text: 'Sunderland',          detail: '6 titles',  aliases: ['sunderland afc'] },
      { rank: 8,  text: 'Chelsea',             detail: '6 titles',  aliases: ['chelsea fc'] },
      { rank: 9,  text: 'Sheffield Wednesday', detail: '4 titles',  aliases: ['sheff wed', 'sheffield wednesday'] },
      { rank: 10, text: 'Newcastle United',    detail: '4 titles',  aliases: ['newcastle', 'newcastle united', 'nufc'] },
    ],
  },
  {
    id: 'pl-assists',
    type: 'player',
    title: 'Premier League — Most Assists All-Time',
    emoji: '🅰️',
    description: 'Name the 10 players with the most assists in Premier League history.',
    answers: [
      { rank: 1,  text: 'Ryan Giggs',      detail: '162 assists', aliases: ['giggs'] },
      { rank: 2,  text: 'Kevin De Bruyne', detail: '119 assists', aliases: ['de bruyne', 'kdb'] },
      { rank: 3,  text: 'Cesc Fàbregas',   detail: '111 assists', aliases: ['fabregas', 'cesc'] },
      { rank: 4,  text: 'Wayne Rooney',    detail: '103 assists', aliases: ['rooney'] },
      { rank: 5,  text: 'Frank Lampard',   detail: '102 assists', aliases: ['lampard'] },
      { rank: 6,  text: 'Dennis Bergkamp', detail: '94 assists',  aliases: ['bergkamp'] },
      { rank: 7,  text: 'Mohamed Salah',   detail: '94 assists',  aliases: ['salah', 'mo salah', 'mohamed salah'] },
      { rank: 8,  text: 'David Silva',     detail: '93 assists',  aliases: ['david silva'] },
      { rank: 9,  text: 'Steven Gerrard',  detail: '92 assists',  aliases: ['gerrard'] },
      { rank: 10, text: 'James Milner',    detail: '90 assists',  aliases: ['milner', 'james milner'] },
    ],
  },
  {
    id: 'pl-clean-sheets',
    type: 'player',
    title: 'Premier League — Most Clean Sheets All-Time',
    emoji: '🧤',
    description: 'Name the 10 goalkeepers with the most clean sheets in Premier League history.',
    answers: [
      { rank: 1,  text: 'Petr Čech',         detail: '202 clean sheets', aliases: ['cech', 'petr cech'] },
      { rank: 2,  text: 'David James',       detail: '169 clean sheets', aliases: ['david james'] },
      { rank: 3,  text: 'Mark Schwarzer',    detail: '152 clean sheets', aliases: ['schwarzer'] },
      { rank: 4,  text: 'David de Gea',      detail: '147 clean sheets', aliases: ['de gea', 'david de gea'] },
      { rank: 5,  text: 'David Seaman',      detail: '141 clean sheets', aliases: ['seaman'] },
      { rank: 6,  text: 'Nigel Martyn',      detail: '137 clean sheets', aliases: ['martyn'] },
      { rank: 7,  text: 'Pepe Reina',        detail: '136 clean sheets', aliases: ['reina', 'pepe reina'] },
      { rank: 8,  text: 'Edwin van der Sar', detail: '132 clean sheets', aliases: ['van der sar'] },
      { rank: 9,  text: 'Tim Howard',        detail: '132 clean sheets', aliases: ['howard', 'tim howard'] },
      { rank: 10, text: 'Brad Friedel',      detail: '130 clean sheets', aliases: ['friedel'] },
    ],
  },
  {
    id: 'biggest-transfers',
    type: 'player',
    title: 'Most Expensive Transfers of All-Time',
    emoji: '💰',
    description: 'Name the 10 players who command the highest transfer fees in football history.',
    answers: [
      { rank: 1,  text: 'Neymar',             detail: '€222m', aliases: ['neymar', 'neymar jr'] },
      { rank: 2,  text: 'Kylian Mbappé',      detail: '€180m', aliases: ['mbappe', 'kylian mbappe'] },
      { rank: 3,  text: 'Alexander Isak',     detail: '€144.5m', aliases: ['isak'] },
      { rank: 4,  text: 'João Félix',         detail: '€126m', aliases: ['joao felix', 'felix'] },
      { rank: 5,  text: 'Enzo Fernández',     detail: '€121m', aliases: ['enzo fernandez', 'enzo'] },
      { rank: 6,  text: 'Antoine Griezmann',  detail: '€120m', aliases: ['griezmann'] },
      { rank: 7,  text: 'Philippe Coutinho',  detail: '€118.4m', aliases: ['coutinho'] },
      { rank: 8,  text: 'Jack Grealish',      detail: '€117.7m', aliases: ['grealish'] },
      { rank: 9,  text: 'Florian Wirtz',      detail: '€117.5m', aliases: ['wirtz'] },
      { rank: 10, text: 'Declan Rice',        detail: '€116.5m', aliases: ['declan rice', 'rice'] },
    ],
  },
  {
    id: 'intl-top-scorers',
    type: 'player',
    title: 'International Football — All-Time Top Goalscorers',
    emoji: '🌐',
    description: "Name the 10 players with the most goals in men's international football.",
    answers: [
      { rank: 1,  text: 'Cristiano Ronaldo', detail: '145 goals', aliases: ['ronaldo', 'cr7', 'cristiano'] },
      { rank: 2,  text: 'Lionel Messi',      detail: '123 goals', aliases: ['messi', 'leo messi'] },
      { rank: 3,  text: 'Ali Daei',          detail: '108 goals', aliases: ['daei', 'ali daei'] },
      { rank: 4,  text: 'Sunil Chhetri',     detail: '95 goals',  aliases: ['chhetri'] },
      { rank: 5,  text: 'Romelu Lukaku',     detail: '91 goals',  aliases: ['lukaku'] },
      { rank: 6,  text: 'Mokhtar Dahari',    detail: '89 goals',  aliases: ['dahari'] },
      { rank: 7,  text: 'Ali Mabkhout',      detail: '85 goals',  aliases: ['mabkhout'] },
      { rank: 8,  text: 'Ferenc Puskás',     detail: '84 goals',  aliases: ['puskas'] },
      { rank: 9,  text: 'Harry Kane',        detail: '82 goals',  aliases: ['harry kane'] },
      { rank: 10, text: 'Godfrey Chitalu',   detail: '79 goals',  aliases: ['chitalu'] },
    ],
  },
  {
    id: 'pl-red-cards',
    type: 'player',
    title: 'Premier League — Most Red Cards All-Time',
    emoji: '🟥',
    description: 'Name the 10 players sent off the most times in Premier League history.',
    answers: [
      { rank: 1,  text: 'Richard Dunne',    detail: '8 red cards', value: 8, aliases: ['dunne', 'richard dunne'] },
      { rank: 2,  text: 'Duncan Ferguson',  detail: '8 red cards', value: 8, aliases: ['duncan ferguson'] },
      { rank: 3,  text: 'Patrick Vieira',   detail: '8 red cards', value: 8, aliases: ['vieira'] },
      { rank: 4,  text: 'Lee Cattermole',   detail: '7 red cards', value: 7, aliases: ['cattermole'] },
      { rank: 5,  text: 'Roy Keane',        detail: '7 red cards', value: 7, aliases: ['roy keane'] },
      { rank: 6,  text: 'Vinnie Jones',     detail: '7 red cards', value: 7, aliases: ['vinnie jones'] },
      { rank: 7,  text: 'Alan Smith',       detail: '7 red cards', value: 7, aliases: ['alan smith'] },
      { rank: 8,  text: 'Gareth Barry',     detail: '6 red cards', value: 6, aliases: ['gareth barry'] },
      { rank: 9,  text: 'John Terry',       detail: '6 red cards', value: 6, aliases: ['john terry', 'terry'] },
      { rank: 10, text: 'Steven Gerrard',   detail: '6 red cards', value: 6, aliases: ['gerrard', 'steven gerrard'] },
    ],
    // 12 players have 6 red cards but only three slots remain — any of them counts.
    tieValue: 6,
    tiePool: [
      { text: 'Luís Boa Morte',  aliases: ['boa morte'] },
      { text: 'John Hartson',    aliases: ['hartson'] },
      { text: 'Andrew Cole',     aliases: ['andy cole', 'andrew cole'] },
      { text: 'Nicky Butt',      aliases: ['nicky butt', 'butt'] },
      { text: 'Younès Kaboul',   aliases: ['kaboul', 'younes kaboul'] },
      { text: 'Nemanja Vidić',   aliases: ['vidic', 'nemanja vidic'] },
      { text: 'Martin Keown',    aliases: ['keown'] },
      { text: 'Franck Queudrue', aliases: ['queudrue'] },
      { text: 'Joey Barton',     aliases: ['joey barton', 'barton'] },
    ],
  },
  {
    id: 'france-top-scorers',
    type: 'player',
    title: 'France — All-Time Top Goalscorers',
    emoji: '🇫🇷',
    description: 'Name the 10 players with the most goals for the France national team.',
    answers: [
      { rank: 1,  text: 'Kylian Mbappé',     detail: '60 goals', aliases: ['mbappe', 'kylian mbappe'] },
      { rank: 2,  text: 'Olivier Giroud',    detail: '57 goals', aliases: ['giroud'] },
      { rank: 3,  text: 'Thierry Henry',     detail: '51 goals', aliases: ['henry'] },
      { rank: 4,  text: 'Antoine Griezmann', detail: '44 goals', aliases: ['griezmann'] },
      { rank: 5,  text: 'Michel Platini',    detail: '41 goals', aliases: ['platini'] },
      { rank: 6,  text: 'Karim Benzema',     detail: '37 goals', aliases: ['benzema'] },
      { rank: 7,  text: 'David Trezeguet',   detail: '34 goals', aliases: ['trezeguet'] },
      { rank: 8,  text: 'Zinedine Zidane',   detail: '31 goals', aliases: ['zidane', 'zizou'] },
      { rank: 9,  text: 'Just Fontaine',     detail: '30 goals', aliases: ['fontaine'] },
      { rank: 10, text: 'Jean-Pierre Papin', detail: '30 goals', aliases: ['papin'] },
    ],
  },
  {
    id: 'liverpool-top-scorers',
    type: 'player',
    title: 'Liverpool — All-Time Top Goalscorers',
    emoji: '🔴',
    description: 'Name the 10 players with the most goals for Liverpool (all competitions).',
    answers: [
      { rank: 1,  text: 'Ian Rush',       detail: '346 goals', aliases: ['rush', 'ian rush'] },
      { rank: 2,  text: 'Roger Hunt',     detail: '285 goals', aliases: ['roger hunt'] },
      { rank: 3,  text: 'Mohamed Salah',  detail: '257 goals', aliases: ['salah', 'mo salah'] },
      { rank: 4,  text: 'Gordon Hodgson', detail: '241 goals', aliases: ['hodgson'] },
      { rank: 5,  text: 'Billy Liddell',  detail: '228 goals', aliases: ['liddell'] },
      { rank: 6,  text: 'Steven Gerrard', detail: '186 goals', aliases: ['gerrard'] },
      { rank: 7,  text: 'Robbie Fowler',  detail: '183 goals', aliases: ['fowler'] },
      { rank: 8,  text: 'Kenny Dalglish', detail: '172 goals', aliases: ['dalglish'] },
      { rank: 9,  text: 'Michael Owen',   detail: '158 goals', aliases: ['owen'] },
      { rank: 10, text: 'Harry Chambers', detail: '151 goals', aliases: ['chambers'] },
    ],
  },
  {
    id: 'barcelona-top-scorers',
    type: 'player',
    title: 'FC Barcelona — All-Time Top Goalscorers',
    emoji: '🔵',
    description: 'Name the 10 players with the most goals for FC Barcelona (all competitions).',
    answers: [
      { rank: 1,  text: 'Lionel Messi',     detail: '672 goals', aliases: ['messi', 'leo messi'] },
      { rank: 2,  text: 'César Rodríguez',  detail: '232 goals', aliases: ['cesar rodriguez'] },
      { rank: 3,  text: 'Luis Suárez',      detail: '198 goals', aliases: ['luis suarez', 'suarez'] },
      { rank: 4,  text: 'László Kubala',    detail: '194 goals', aliases: ['kubala'] },
      { rank: 5,  text: 'Josep Samitier',   detail: '184 goals', aliases: ['samitier'] },
      { rank: 6,  text: 'Josep Escolà',     detail: '165 goals', aliases: ['escola'] },
      { rank: 7,  text: 'Paulino Alcántara',detail: '143 goals', aliases: ['alcantara'] },
      { rank: 8,  text: "Samuel Eto'o",     detail: '130 goals', aliases: ['etoo', 'samuel etoo'] },
      { rank: 9,  text: 'Mariano Martín',   detail: '129 goals', aliases: ['mariano martin'] },
      { rank: 10, text: 'Rivaldo',          detail: '127 goals', aliases: ['rivaldo'] },
    ],
  },
  {
    id: 'man-utd-top-scorers',
    type: 'player',
    title: 'Manchester United — All-Time Top Goalscorers',
    emoji: '😈',
    description: 'Name the 10 players with the most goals for Manchester United (all competitions).',
    answers: [
      { rank: 1,  text: 'Wayne Rooney',   detail: '253 goals', aliases: ['rooney'] },
      { rank: 2,  text: 'Bobby Charlton', detail: '249 goals', aliases: ['bobby charlton', 'charlton'] },
      { rank: 3,  text: 'Denis Law',      detail: '237 goals', aliases: ['denis law', 'law'] },
      { rank: 4,  text: 'Jack Rowley',    detail: '211 goals', aliases: ['rowley'] },
      { rank: 5,  text: 'Dennis Viollet', detail: '179 goals', aliases: ['viollet'] },
      { rank: 6,  text: 'George Best',    detail: '179 goals', aliases: ['best', 'george best'] },
      { rank: 7,  text: 'Joe Spence',     detail: '168 goals', aliases: ['spence'] },
      { rank: 8,  text: 'Ryan Giggs',     detail: '168 goals', aliases: ['giggs'] },
      { rank: 9,  text: 'Mark Hughes',    detail: '163 goals', aliases: ['hughes'] },
      { rank: 10, text: 'Paul Scholes',   detail: '155 goals', aliases: ['scholes'] },
    ],
  },
]

// The curated classics lead (nice, recognisable early rotation), followed by
// the auto-generated bounded lists (club- and nationality-scoped top-10s built
// from the same Transfermarkt data as Football 501). Regenerate with
// `npm run build:tenable` whenever the fact tables refresh — no JSON by hand.
export const TENABLE_QUESTIONS = [...HAND_AUTHORED, ...generated.questions]

// Daily rotation only serves recognisable questions: every curated classic plus
// the generated lists that cleared the build-time recognisability gate
// (`daily`). This keeps Daily fair — no "name the exact top 10 obscure players"
// — while Unlimited still draws from the full catalogue below.
// Daily rotation is driven by tenable-daily-questions.txt (via the generated
// allowlist): remove a line there + re-run scripts/build-tenable-daily.mjs and
// that question stops appearing. Falls back to the built-in `daily` flag if the
// allowlist is ever empty.
const DAILY_ALLOW = new Set(dailyAllow.titles || [])
export const TENABLE_DAILY_QUESTIONS = DAILY_ALLOW.size
  ? TENABLE_QUESTIONS.filter(q => DAILY_ALLOW.has(q.title))
  : TENABLE_QUESTIONS.filter(q => q.daily !== false)

export function getTenableQuestionForDay(dayIndex) {
  const n = TENABLE_DAILY_QUESTIONS.length
  return TENABLE_DAILY_QUESTIONS[((dayIndex % n) + n) % n]
}

// Deterministic "question of the day" — changes at local midnight,
// cycles through the daily-eligible list (repeats once exhausted).
export function getDailyTenableQuestion() {
  const now = new Date()
  const dayIndex = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000)
  return getTenableQuestionForDay(dayIndex)
}

// A random question for Unlimited/practice mode (never affects daily stats) —
// draws from the FULL catalogue, including the tougher obscure lists.
export function getRandomTenableQuestion() {
  return TENABLE_QUESTIONS[Math.floor(Math.random() * TENABLE_QUESTIONS.length)]
}
