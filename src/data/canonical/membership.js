// ─────────────────────────────────────────────────────────────────────────
// CURATED CATEGORY MEMBERSHIP  —  GENERATION whitelist (editorial), NOT validation.
//
// ⚠ This layer feeds GENERATION only (which recognisable players feature in daily
// puzzles). It is NOT a source of validation truth. Validation — "did player X
// really play for this club / win this trophy" — is the COMPLETE canonical set in
// categories.generated.json (see facts.js: membersOf = canonical; notableMembersOf
// = canonical ∩ recognisable ∪ THIS list). A name here only force-includes a player
// into puzzles IF they are already a canonical member; a curated name absent from
// canonical is ignored. So this file can never make a category incomplete or
// silently accept/reject a guess — that was the point of the 2026-07 rewrite (it
// fixed the Chelsea × Champions League bug, where a curated 74-name "famous winners"
// stub was being used as validation and rejected real winners like Bertrand/Ramires).
//
// Its remaining job: guarantee beloved-but-lower-recognisability players (who ARE
// canonical members) still appear in generated grids, so daily puzzles stay
// star-studded. Managers live here too but are not a playable category (no canonical
// manager data). See ARCHITECTURE.md §7.
//
// Adding a player here force-features them in their club/league/nationality/trophy
// grids (league is derived from CLUB_LEAGUE, never authored separately).
// Provenance: seeded from the manually-curated TicTacToe lists. `source: 'curated'`.
// ─────────────────────────────────────────────────────────────────────────

export const AS_OF_DATE = '2026-06-13'

// Club → league. Adding a club here makes every one of its members a member
// of that league automatically (no separate league list to keep in sync).
export const CLUB_LEAGUE = {
  'Real Madrid': 'La Liga',
  'Barcelona': 'La Liga',
  'Manchester United': 'Premier League',
  'Manchester City': 'Premier League',
  'Chelsea': 'Premier League',
  'Liverpool': 'Premier League',
  'Arsenal': 'Premier League',
  'Bayern Munich': 'Bundesliga',
  'Paris Saint-Germain': 'Ligue 1',
  'Juventus': 'Serie A',
  'AC Milan': 'Serie A',
  'Inter Milan': 'Serie A',
}

export const CLUB_MEMBERS = {
  'Real Madrid': [
    'Cristiano Ronaldo', 'Karim Benzema', 'Sergio Ramos', 'Luka Modric', 'Toni Kroos', 'Casemiro',
    'Vinicius Junior', 'Marcelo', 'Raphael Varane', 'Gareth Bale', 'Luis Figo', 'Zinedine Zidane',
    'Iker Casillas', 'Xabi Alonso', 'David Beckham', 'Ronaldo Nazario', 'Roberto Carlos', 'Dani Carvajal',
    'Isco', 'Kylian Mbappe', 'Jude Bellingham', 'Eden Hazard', 'Sami Khedira', 'Angel Di Maria',
    'Wesley Sneijder', 'Arjen Robben', 'Pepe', 'Achraf Hakimi', 'Theo Hernandez', 'Mesut Ozil',
    'Alvaro Morata', 'James Rodriguez', 'Federico Valverde', 'Antonio Rudiger', 'Thibaut Courtois',
    'Michael Owen', 'Claude Makelele', 'Predrag Mijatovic', 'Martin Odegaard',
  ],
  'Barcelona': [
    'Lionel Messi', 'Andres Iniesta', 'Xavi', 'Neymar', 'Ronaldinho', 'Luis Suarez', 'Gerard Pique',
    'Sergio Busquets', 'Antoine Griezmann', 'Frenkie de Jong', 'Ousmane Dembele', 'Robert Lewandowski',
    'Cesc Fabregas', 'Thierry Henry', 'Samuel Eto\'o', 'Ronaldo Nazario', 'Rivaldo', 'Patrick Kluivert',
    'Romario', 'Hristo Stoichkov', 'Carles Puyol', 'Dani Alves', 'Pedro', 'David Villa', 'Ivan Rakitic',
    'Jordi Alba', 'Philippe Coutinho', 'Luis Figo', 'Zlatan Ibrahimovic', 'Pedri', 'Gavi', 'Ferran Torres',
    'Johan Cruyff',
  ],
  'Manchester United': [
    'Cristiano Ronaldo', 'Wayne Rooney', 'David Beckham', 'Paul Scholes', 'Ryan Giggs', 'Roy Keane',
    'Eric Cantona', 'Peter Schmeichel', 'Rio Ferdinand', 'Nemanja Vidic', 'Patrice Evra', 'Edinson Cavani',
    'Bruno Fernandes', 'Marcus Rashford', 'Harry Maguire', 'Luke Shaw', 'Antony', 'Diogo Dalot',
    'Paul Pogba', 'Angel Di Maria', 'Raphael Varane', 'Casemiro', 'Robin van Persie', 'Memphis Depay',
    'Alexis Sanchez', 'Henrikh Mkhitaryan', 'Zlatan Ibrahimovic', 'Radamel Falcao', 'Juan Mata',
    'Bastian Schweinsteiger', 'Nani', 'Dimitar Berbatov', 'Michael Carrick', 'Gary Neville', 'Denis Irwin',
    'Andy Cole', 'Ole Gunnar Solskjaer',
  ],
  'Manchester City': [
    'Erling Haaland', 'Kevin De Bruyne', 'Sergio Aguero', 'David Silva', 'Yaya Toure', 'Vincent Kompany',
    'Raheem Sterling', 'Bernardo Silva', 'Phil Foden', 'Rodri', 'John Stones', 'Ilkay Gundogan',
    'Kyle Walker', 'Jack Grealish', 'Riyad Mahrez', 'Leroy Sane', 'Jerome Boateng', 'Edin Dzeko',
    'Joe Hart', 'Mario Balotelli', 'Carlos Tevez', 'Robinho', 'Patrick Vieira', 'Joleon Lescott',
    'Nicolas Otamendi', 'Gabriel Jesus', 'Ruben Dias', 'Fernandinho', 'Julian Alvarez',
  ],
  'Chelsea': [
    'Frank Lampard', 'John Terry', 'Didier Drogba', 'Petr Cech', 'Eden Hazard', 'N\'Golo Kante',
    'Cesc Fabregas', 'Diego Costa', 'David Luiz', 'Thiago Silva', 'Mohamed Salah', 'Gonzalo Higuain',
    'Mason Mount', 'Reece James', 'Wesley Fofana', 'Enzo Fernandez', 'Alvaro Morata', 'Ashley Cole',
    'Michael Essien', 'Claude Makelele', 'Marcel Desailly', 'Gianfranco Zola', 'Arjen Robben', 'Juan Mata',
    'Willian', 'Pedro', 'Olivier Giroud', 'Kepa Arrizabalaga', 'Cesar Azpilicueta', 'Thibaut Courtois',
    'Fernando Torres',
  ],
  'Liverpool': [
    'Steven Gerrard', 'Mohamed Salah', 'Virgil van Dijk', 'Trent Alexander-Arnold', 'Sadio Mane',
    'Andy Robertson', 'Darwin Nunez', 'Luis Diaz', 'Cody Gakpo', 'Alisson Becker', 'Jordan Henderson',
    'Fernando Torres', 'Luis Suarez', 'Xabi Alonso', 'Fabinho', 'Roberto Firmino', 'Philippe Coutinho',
    'Daniel Sturridge', 'Robbie Fowler', 'Michael Owen', 'Jamie Carragher', 'Federico Chiesa',
  ],
  'Arsenal': [
    'Thierry Henry', 'Patrick Vieira', 'Dennis Bergkamp', 'Cesc Fabregas', 'Robin van Persie', 'Mesut Ozil',
    'Granit Xhaka', 'Alexis Sanchez', 'Petr Cech', 'Ashley Cole', 'David Luiz', 'William Saliba',
    'Henrikh Mkhitaryan', 'Bukayo Saka', 'Martin Odegaard', 'Declan Rice', 'Gabriel Martinelli',
    'Kai Havertz', 'Thomas Partey', 'Aaron Ramsey', 'Serge Gnabry', 'Sol Campbell', 'Robert Pires',
    'Freddie Ljungberg', 'Emmanuel Adebayor', 'Samir Nasri', 'Jack Wilshere', 'Theo Walcott',
    'Tomas Rosicky', 'Per Mertesacker', 'Laurent Koscielny', 'Olivier Giroud', 'Alexandre Lacazette',
  ],
  'Bayern Munich': [
    'Bastian Schweinsteiger', 'Philipp Lahm', 'Thomas Muller', 'Toni Kroos', 'Manuel Neuer',
    'Jerome Boateng', 'Mario Gotze', 'Leroy Sane', 'Robert Lewandowski', 'Arjen Robben', 'Joshua Kimmich',
    'Leon Goretzka', 'Kingsley Coman', 'Alphonso Davies', 'Sadio Mane', 'Franck Ribery', 'David Alaba',
    'Mats Hummels', 'Xabi Alonso', 'Javi Martinez', 'Luca Toni', 'Michael Ballack', 'Lucio',
    'Giovane Elber', 'Oliver Kahn', 'Lothar Matthaus', 'Karl-Heinz Rummenigge', 'Franz Beckenbauer',
    'Gerd Muller',
  ],
  'Paris Saint-Germain': [
    'Lionel Messi', 'Neymar', 'Kylian Mbappe', 'Angel Di Maria', 'Mauro Icardi', 'Thiago Silva',
    'David Luiz', 'Achraf Hakimi', 'Marquinhos', 'Gianluigi Donnarumma', 'Ousmane Dembele', 'Vitinha',
    'Zlatan Ibrahimovic', 'Edinson Cavani', 'Gianluigi Buffon', 'Sergio Ramos', 'David Beckham',
    'Thiago Motta', 'Javier Pastore', 'Adrien Rabiot', 'Marco Verratti', 'Presnel Kimpembe',
  ],
  'Juventus': [
    'Cristiano Ronaldo', 'Paul Pogba', 'Andrea Pirlo', 'Gianluigi Buffon', 'Zlatan Ibrahimovic',
    'Zinedine Zidane', 'Alessandro Del Piero', 'Pavel Nedved', 'David Trezeguet', 'Gonzalo Higuain',
    'Sami Khedira', 'Angel Di Maria', 'Alvaro Morata', 'Paulo Dybala', 'Federico Chiesa', 'Dusan Vlahovic',
    'Federico Bernardeschi', 'Leonardo Bonucci', 'Giorgio Chiellini', 'Kingsley Coman', 'Arturo Vidal',
    'Carlos Tevez', 'Patrice Evra', 'Aaron Ramsey', 'Michel Platini',
  ],
  'AC Milan': [
    'Andrea Pirlo', 'Kaka', 'Ronaldinho', 'Thiago Silva', 'Zlatan Ibrahimovic', 'David Beckham',
    'Gianluigi Donnarumma', 'Theo Hernandez', 'Rafael Leao', 'Leonardo Bonucci', 'Hakan Calhanoglu',
    'Andriy Shevchenko', 'Paolo Maldini', 'Alessandro Nesta', 'Filippo Inzaghi', 'Clarence Seedorf',
    'Gennaro Gattuso', 'Ronaldo Nazario', 'Robinho', 'Fernando Torres', 'Alexis Sanchez', 'Gonzalo Higuain',
  ],
  'Inter Milan': [
    'Luis Figo', 'Wesley Sneijder', 'Patrick Vieira', 'Mauro Icardi', 'Alexis Sanchez', 'Edin Dzeko',
    'Achraf Hakimi', 'Lautaro Martinez', 'Nicolo Barella', 'Hakan Calhanoglu', 'Marcus Thuram',
    'Zlatan Ibrahimovic', 'Samuel Eto\'o', 'Javier Zanetti', 'Esteban Cambiasso', 'Diego Milito',
    'Christian Vieri', 'Ronaldo Nazario', 'Adriano', 'Romelu Lukaku', 'Henrikh Mkhitaryan',
  ],
}

export const NATIONALITY_MEMBERS = {
  'Portugal': [
    'Cristiano Ronaldo', 'Luis Figo', 'Pepe', 'Bernardo Silva', 'Nani', 'Bruno Fernandes', 'Diogo Dalot',
    'Vitinha', 'Rafael Leao', 'Ruben Dias', 'Joao Cancelo', 'Goncalo Ramos', 'Joao Felix', 'Rui Costa',
    'Deco', 'Eusebio', 'Paulo Futre',
  ],
  'Argentina': [
    'Lionel Messi', 'Angel Di Maria', 'Gonzalo Higuain', 'Sergio Aguero', 'Mauro Icardi', 'Paulo Dybala',
    'Diego Maradona', 'Javier Mascherano', 'Carlos Tevez', 'Lautaro Martinez', 'Enzo Fernandez',
    'Julian Alvarez', 'Emiliano Martinez', 'Rodrigo De Paul', 'Gabriel Batistuta', 'Hernan Crespo',
    'Juan Roman Riquelme', 'Alfredo Di Stefano',
  ],
  'Brazil': [
    'Neymar', 'Ronaldinho', 'Kaka', 'Thiago Silva', 'David Luiz', 'Casemiro', 'Vinicius Junior',
    'Marcelo', 'Ronaldo Nazario', 'Rivaldo', 'Romario', 'Roberto Carlos', 'Cafu', 'Robinho',
    'Alisson Becker', 'Antony', 'Gabriel Martinelli', 'Marquinhos', 'Fabinho', 'Philippe Coutinho',
    'Pele', 'Zico', 'Adriano',
  ],
  'France': [
    'Kylian Mbappe', 'Karim Benzema', 'Zinedine Zidane', 'Thierry Henry', 'Patrick Vieira', 'N\'Golo Kante',
    'Paul Pogba', 'Raphael Varane', 'Antoine Griezmann', 'Lucas Hernandez', 'Ousmane Dembele',
    'Theo Hernandez', 'Marcus Thuram', 'Wesley Fofana', 'Kingsley Coman', 'Olivier Giroud',
    'Franck Ribery', 'David Trezeguet', 'Michel Platini', 'Just Fontaine', 'Eric Cantona',
  ],
  'Spain': [
    'Sergio Ramos', 'Andres Iniesta', 'Xavi', 'Cesc Fabregas', 'David Silva', 'Alvaro Morata',
    'Gerard Pique', 'Dani Carvajal', 'Isco', 'Diego Costa', 'Iker Casillas', 'Xabi Alonso', 'David Villa',
    'Fernando Torres', 'Pedro', 'Raul Gonzalez', 'Fernando Hierro', 'Rodri', 'Ferran Torres', 'Pedri', 'Gavi',
  ],
  'England': [
    'David Beckham', 'Wayne Rooney', 'Frank Lampard', 'John Terry', 'Steven Gerrard', 'Raheem Sterling',
    'Jack Grealish', 'Trent Alexander-Arnold', 'Ashley Cole', 'Bukayo Saka', 'Declan Rice', 'Phil Foden',
    'John Stones', 'Kyle Walker', 'Reece James', 'Mason Mount', 'Harry Maguire', 'Luke Shaw',
    'Marcus Rashford', 'Harry Kane', 'Michael Owen', 'Gary Lineker', 'Bobby Moore', 'Paul Gascoigne',
    'Rio Ferdinand', 'Paul Scholes', 'Jamie Carragher', 'Gary Neville',
  ],
  'Germany': [
    'Mesut Ozil', 'Bastian Schweinsteiger', 'Philipp Lahm', 'Thomas Muller', 'Toni Kroos', 'Sami Khedira',
    'Manuel Neuer', 'Jerome Boateng', 'Mario Gotze', 'Leroy Sane', 'Joshua Kimmich', 'Leon Goretzka',
    'Serge Gnabry', 'Michael Ballack', 'Lothar Matthaus', 'Franz Beckenbauer', 'Jurgen Klinsmann',
    'Oliver Kahn', 'Miroslav Klose', 'Lukas Podolski',
  ],
  'Netherlands': [
    'Wesley Sneijder', 'Robin van Persie', 'Arjen Robben', 'Frenkie de Jong', 'Virgil van Dijk',
    'Memphis Depay', 'Nigel de Jong', 'Cody Gakpo', 'Johan Cruyff', 'Marco van Basten', 'Dennis Bergkamp',
    'Ruud Gullit', 'Edgar Davids', 'Patrick Kluivert', 'Clarence Seedorf', 'Ruud van Nistelrooy',
  ],
}

export const MANAGER_MEMBERS = {
  'Pep Guardiola': [
    'Lionel Messi', 'Andres Iniesta', 'Xavi', 'Sergio Aguero', 'David Silva', 'Bernardo Silva',
    'Erling Haaland', 'Kevin De Bruyne', 'Phil Foden', 'Rodri', 'John Stones', 'Ilkay Gundogan',
    'Kyle Walker', 'Jack Grealish', 'Raheem Sterling', 'Leroy Sane', 'Jerome Boateng', 'Edin Dzeko',
    'Robert Lewandowski', 'Philipp Lahm', 'Thomas Muller', 'Manuel Neuer', 'Joshua Kimmich',
    'Leon Goretzka', 'Gerard Pique', 'Carles Puyol', 'Dani Alves', 'Mario Gotze', 'Franck Ribery',
    'Arjen Robben', 'Xabi Alonso', 'Zlatan Ibrahimovic', 'David Villa', 'Thierry Henry',
  ],
  'Jose Mourinho': [
    'Cristiano Ronaldo', 'Pepe', 'Frank Lampard', 'John Terry', 'Didier Drogba', 'Petr Cech',
    'Cesc Fabregas', 'Diego Costa', 'Marcelo', 'Angel Di Maria', 'Raphael Varane', 'Sami Khedira',
    'Marcus Rashford', 'Luke Shaw', 'Paul Pogba', 'Alexis Sanchez', 'Henrikh Mkhitaryan',
    'Zlatan Ibrahimovic', 'Arjen Robben', 'Mesut Ozil', 'Ashley Cole', 'Gonzalo Higuain',
    'Romelu Lukaku', 'Luka Modric',
  ],
  'Alex Ferguson': [
    'Cristiano Ronaldo', 'Wayne Rooney', 'David Beckham', 'Paul Scholes', 'Ryan Giggs', 'Roy Keane',
    'Eric Cantona', 'Rio Ferdinand', 'Nemanja Vidic', 'Patrice Evra', 'Robin van Persie', 'Gerard Pique',
    'Nani', 'Bastian Schweinsteiger', 'Michael Carrick', 'Gary Neville', 'Andy Cole',
    'Ole Gunnar Solskjaer', 'Dimitar Berbatov',
  ],
  'Jurgen Klopp': [
    'Mohamed Salah', 'Virgil van Dijk', 'Trent Alexander-Arnold', 'Sadio Mane', 'Andy Robertson',
    'Darwin Nunez', 'Luis Diaz', 'Cody Gakpo', 'Alisson Becker', 'Jordan Henderson', 'Fabinho',
    'Roberto Firmino', 'Federico Chiesa',
  ],
  'Carlo Ancelotti': [
    'Kaka', 'Andrea Pirlo', 'Thiago Silva', 'Paolo Maldini', 'Alessandro Nesta', 'Clarence Seedorf',
    'Filippo Inzaghi', 'Frank Lampard', 'John Terry', 'Didier Drogba', 'Ashley Cole', 'Karim Benzema',
    'Sergio Ramos', 'Cristiano Ronaldo', 'Toni Kroos', 'Sami Khedira', 'Angel Di Maria', 'Dani Carvajal',
    'Isco', 'Casemiro', 'Vinicius Junior', 'Marcelo', 'Luka Modric', 'Kylian Mbappe', 'Eden Hazard',
    'Pepe', 'Zlatan Ibrahimovic',
  ],
  'Zinedine Zidane': [
    'Cristiano Ronaldo', 'Karim Benzema', 'Sergio Ramos', 'Toni Kroos', 'Casemiro', 'Vinicius Junior',
    'Marcelo', 'Raphael Varane', 'Sami Khedira', 'Dani Carvajal', 'Isco', 'Pepe', 'Luka Modric',
    'Eden Hazard', 'Achraf Hakimi', 'Theo Hernandez', 'Martin Odegaard', 'Alvaro Morata', 'Gareth Bale',
  ],
  'Arsene Wenger': [
    'Thierry Henry', 'Patrick Vieira', 'Dennis Bergkamp', 'Cesc Fabregas', 'Robin van Persie', 'Mesut Ozil',
    'Ashley Cole', 'Petr Cech', 'Alexis Sanchez', 'Granit Xhaka', 'Henrikh Mkhitaryan', 'Bukayo Saka',
    'Aaron Ramsey', 'Serge Gnabry', 'Sol Campbell', 'Robert Pires', 'Freddie Ljungberg',
    'Emmanuel Adebayor', 'Samir Nasri', 'Jack Wilshere', 'Theo Walcott', 'Tomas Rosicky',
    'Per Mertesacker', 'Laurent Koscielny', 'Olivier Giroud', 'Alexandre Lacazette',
  ],
  'Antonio Conte': [
    'Eden Hazard', 'N\'Golo Kante', 'Cesc Fabregas', 'Diego Costa', 'David Luiz', 'John Terry',
    'Alvaro Morata', 'Victor Moses', 'Marcos Alonso',
  ],
}

export const TROPHY_MEMBERS = {
  'UEFA Champions League': [
    'Cristiano Ronaldo', 'Pepe', 'Bernardo Silva', 'David Beckham', 'Wayne Rooney', 'Frank Lampard',
    'John Terry', 'Steven Gerrard', 'Jack Grealish', 'Trent Alexander-Arnold', 'Ashley Cole',
    'Lionel Messi', 'Neymar', 'Ronaldinho', 'Kaka', 'Thiago Silva', 'Casemiro', 'Vinicius Junior',
    'Marcelo', 'Sergio Ramos', 'Andres Iniesta', 'Xavi', 'Gerard Pique', 'Dani Carvajal', 'Isco',
    'Bastian Schweinsteiger', 'Philipp Lahm', 'Thomas Muller', 'Toni Kroos', 'Sami Khedira',
    'Manuel Neuer', 'Jerome Boateng', 'Leroy Sane', 'Wesley Sneijder', 'Arjen Robben',
    'Virgil van Dijk', 'Mohamed Salah', 'Sadio Mane', 'Petr Cech', 'Didier Drogba', 'Andrea Pirlo',
    'Robert Lewandowski', 'Luka Modric', 'Ivan Rakitic', 'Kai Havertz', 'Reece James', 'Mason Mount',
    'Erling Haaland', 'Kevin De Bruyne', 'Phil Foden', 'Rodri', 'John Stones', 'Ilkay Gundogan',
    'Kyle Walker', 'Joshua Kimmich', 'Leon Goretzka', 'Serge Gnabry', 'Kingsley Coman',
    'Alphonso Davies', 'Alisson Becker', 'Andy Robertson', 'Gianluigi Donnarumma', 'Carles Puyol',
    'Dani Alves', 'Xabi Alonso', 'Franck Ribery', 'Clarence Seedorf', 'Paolo Maldini', 'Alessandro Nesta',
    'Filippo Inzaghi', 'Zlatan Ibrahimovic', 'N\'Golo Kante', 'Eden Hazard', 'David Luiz',
  ],
  'FIFA World Cup': [
    'Lionel Messi', 'Angel Di Maria', 'Zinedine Zidane', 'Patrick Vieira', 'Raphael Varane',
    'Antoine Griezmann', 'Lucas Hernandez', 'Kylian Mbappe', 'Sergio Ramos', 'Andres Iniesta', 'Xavi',
    'David Silva', 'Cesc Fabregas', 'Gerard Pique', 'Bastian Schweinsteiger', 'Philipp Lahm',
    'Thomas Muller', 'Toni Kroos', 'Sami Khedira', 'Manuel Neuer', 'Jerome Boateng', 'Mario Gotze',
    'Andrea Pirlo', 'Gianluigi Buffon', 'Kingsley Coman', 'Theo Hernandez', 'Lautaro Martinez',
    'Enzo Fernandez', 'Emiliano Martinez', 'Julian Alvarez', 'Rodrigo De Paul', 'Ronaldo Nazario',
    'Rivaldo', 'Romario', 'Roberto Carlos', 'Cafu', 'Pele', 'N\'Golo Kante', 'Paul Pogba', 'Olivier Giroud',
  ],
  'Ballon d\'Or': [
    'Cristiano Ronaldo', 'Lionel Messi', 'Luis Figo', 'Ronaldinho', 'Kaka', 'Karim Benzema',
    'Zinedine Zidane', 'Ronaldo Nazario', 'Michel Platini', 'Eusebio', 'Johan Cruyff',
    'Franz Beckenbauer', 'George Best',
  ],
  'UEFA European Championship': [
    'Cristiano Ronaldo', 'Pepe', 'Bernardo Silva', 'Nani', 'Sergio Ramos', 'Andres Iniesta', 'Xavi',
    'Cesc Fabregas', 'David Silva', 'Alvaro Morata', 'Gerard Pique', 'Gianluigi Donnarumma',
    'Federico Chiesa', 'Federico Bernardeschi', 'Leonardo Bonucci', 'Zinedine Zidane', 'Patrick Vieira',
    'Thierry Henry', 'Michel Platini', 'Fernando Torres', 'Fernando Hierro', 'Lothar Matthaus',
    'Franz Beckenbauer', 'Oliver Kahn',
  ],
}
