// Curated list of footballers who'd be widely recognized by football fans
// globally today — a mix of enduring legends and current stars. Used as the
// daily pool for Football Wordle, so the answer should always be guessable.
//
// ⚠ INTENTIONAL EDITORIAL DATASET — DO NOT auto-derive this from canonical data.
// This is the one deliberate exception to "Transfermarkt is the sole source". It
// is NOT technical debt or an unfinished migration: it is a hand-curated answer
// pool whose value is cross-era, casual-fan recognisability, which no metric we
// derive from match data captures.
//
// Rejected (with evidence) 2026-07: replacing this with the canonical
// `recognisability` score. That score is recency-first BY DESIGN (a current
// player keeps ~100% of their footprint, a 1980s legend ~4%) because its real
// job is generating daily grids that should feature current stars. Pointing it
// at Wordle produced a pool that was 99% 2020s players and dropped Maradona,
// Cruyff, Beckenbauer and Romário in favour of active journeymen (Darmian,
// Milner, Widmer). Wordle needs cross-era fame, which is a DIFFERENT target from
// contemporary recognisability — do not conflate them or "fix" this file.
// If zero hand-maintained data ever becomes a hard requirement, build a NEW
// honours-weighted, recency-neutral signal; do not bend `recognisability`.
export const famousPlayers = [
  // Argentina
  { name: 'Lionel Messi', nationality: 'Argentina' },
  { name: 'Diego Maradona', nationality: 'Argentina' },
  { name: 'Alfredo Di Stefano', nationality: 'Argentina' },
  { name: 'Gabriel Batistuta', nationality: 'Argentina' },
  { name: 'Sergio Aguero', nationality: 'Argentina' },
  { name: 'Mario Kempes', nationality: 'Argentina' },
  { name: 'Juan Roman Riquelme', nationality: 'Argentina' },
  { name: 'Carlos Tevez', nationality: 'Argentina' },
  { name: 'Gonzalo Higuain', nationality: 'Argentina' },
  { name: 'Paulo Dybala', nationality: 'Argentina' },
  { name: 'Angel Di Maria', nationality: 'Argentina' },
  { name: 'Javier Mascherano', nationality: 'Argentina' },
  { name: 'Hernan Crespo', nationality: 'Argentina' },
  { name: 'Claudio Caniggia', nationality: 'Argentina' },
  { name: 'Javier Zanetti', nationality: 'Argentina' },
  { name: 'Juan Sebastian Veron', nationality: 'Argentina' },
  { name: 'Lautaro Martinez', nationality: 'Argentina' },
  { name: 'Julian Alvarez', nationality: 'Argentina' },
  { name: 'Enzo Fernandez', nationality: 'Argentina' },
  { name: 'Nicolas Otamendi', nationality: 'Argentina' },
  { name: 'Emiliano Martinez', nationality: 'Argentina' },
  { name: 'Rodrigo De Paul', nationality: 'Argentina' },

  // Brazil
  { name: 'Ronaldo', nationality: 'Brazil' },
  { name: 'Ronaldinho', nationality: 'Brazil' },
  { name: 'Romario', nationality: 'Brazil' },
  { name: 'Rivaldo', nationality: 'Brazil' },
  { name: 'Roberto Carlos', nationality: 'Brazil' },
  { name: 'Socrates', nationality: 'Brazil' },
  { name: 'Garrincha', nationality: 'Brazil' },
  { name: 'Bebeto', nationality: 'Brazil' },
  { name: 'Neymar', nationality: 'Brazil' },
  { name: 'Adriano', nationality: 'Brazil' },
  { name: 'Casemiro', nationality: 'Brazil' },
  { name: 'Marcelo', nationality: 'Brazil' },
  { name: 'Thiago Silva', nationality: 'Brazil' },
  { name: 'Fabinho', nationality: 'Brazil' },
  { name: 'Vinicius Junior', nationality: 'Brazil' },
  { name: 'Richarlison', nationality: 'Brazil' },
  { name: 'Raphinha', nationality: 'Brazil' },
  { name: 'Rodrygo', nationality: 'Brazil' },
  { name: 'Alisson', nationality: 'Brazil' },
  { name: 'Ederson', nationality: 'Brazil' },
  { name: 'Philippe Coutinho', nationality: 'Brazil' },
  { name: 'Roberto Firmino', nationality: 'Brazil' },
  { name: 'Gabriel Jesus', nationality: 'Brazil' },
  { name: 'Bruno Guimaraes', nationality: 'Brazil' },
  { name: 'Lucas Paqueta', nationality: 'Brazil' },
  { name: 'Endrick', nationality: 'Brazil' },
  { name: 'Antony', nationality: 'Brazil' },
  { name: 'Radamel Falcao', nationality: 'Colombia' },

  // Germany
  { name: 'Franz Beckenbauer', nationality: 'Germany' },
  { name: 'Gerd Muller', nationality: 'Germany' },
  { name: 'Thomas Muller', nationality: 'Germany' },
  { name: 'Jurgen Klinsmann', nationality: 'Germany' },
  { name: 'Lothar Matthaus', nationality: 'Germany' },
  { name: 'Rudi Voller', nationality: 'Germany' },
  { name: 'Oliver Kahn', nationality: 'Germany' },
  { name: 'Miroslav Klose', nationality: 'Germany' },
  { name: 'Lukas Podolski', nationality: 'Germany' },
  { name: 'Bastian Schweinsteiger', nationality: 'Germany' },
  { name: 'Philipp Lahm', nationality: 'Germany' },
  { name: 'Sami Khedira', nationality: 'Germany' },
  { name: 'Manuel Neuer', nationality: 'Germany' },
  { name: 'Toni Kroos', nationality: 'Germany' },
  { name: 'Mats Hummels', nationality: 'Germany' },
  { name: 'Jerome Boateng', nationality: 'Germany' },
  { name: 'Ilkay Gundogan', nationality: 'Germany' },
  { name: 'Timo Werner', nationality: 'Germany' },
  { name: 'Kai Havertz', nationality: 'Germany' },
  { name: 'Serge Gnabry', nationality: 'Germany' },
  { name: 'Michael Ballack', nationality: 'Germany' },
  { name: 'Karl-Heinz Rummenigge', nationality: 'Germany' },
  { name: 'Marco Reus', nationality: 'Germany' },
  { name: 'Leon Goretzka', nationality: 'Germany' },
  { name: 'Leroy Sane', nationality: 'Germany' },
  { name: 'Jamal Musiala', nationality: 'Germany' },
  { name: 'Florian Wirtz', nationality: 'Germany' },

  // Portugal
  { name: 'Cristiano Ronaldo', nationality: 'Portugal' },
  { name: 'Luis Figo', nationality: 'Portugal' },
  { name: 'Eusebio', nationality: 'Portugal' },
  { name: 'Rui Costa', nationality: 'Portugal' },
  { name: 'Deco', nationality: 'Portugal' },
  { name: 'Nani', nationality: 'Portugal' },
  { name: 'Pepe', nationality: 'Portugal' },
  { name: 'Bruno Fernandes', nationality: 'Portugal' },
  { name: 'Bernardo Silva', nationality: 'Portugal' },
  { name: 'Joao Felix', nationality: 'Portugal' },
  { name: 'Joao Cancelo', nationality: 'Portugal' },
  { name: 'Ruben Dias', nationality: 'Portugal' },
  { name: 'Ricardo Quaresma', nationality: 'Portugal' },
  { name: 'Rafael Leao', nationality: 'Portugal' },
  { name: 'Vitinha', nationality: 'Portugal' },
  { name: 'Goncalo Ramos', nationality: 'Portugal' },

  // France
  { name: 'Zinedine Zidane', nationality: 'France' },
  { name: 'Thierry Henry', nationality: 'France' },
  { name: 'Michel Platini', nationality: 'France' },
  { name: 'Kylian Mbappe', nationality: 'France' },
  { name: 'Antoine Griezmann', nationality: 'France' },
  { name: 'Paul Pogba', nationality: 'France' },
  { name: "N'Golo Kante", nationality: 'France' },
  { name: 'Karim Benzema', nationality: 'France' },
  { name: 'Marcus Thuram', nationality: 'France' },
  { name: 'Marcel Desailly', nationality: 'France' },
  { name: 'Didier Deschamps', nationality: 'France' },
  { name: 'Patrick Vieira', nationality: 'France' },
  { name: 'David Trezeguet', nationality: 'France' },
  { name: 'Nicolas Anelka', nationality: 'France' },
  { name: 'Eric Cantona', nationality: 'France' },
  { name: 'Jean-Pierre Papin', nationality: 'France' },
  { name: 'Laurent Blanc', nationality: 'France' },
  { name: 'Bixente Lizarazu', nationality: 'France' },
  { name: 'Fabien Barthez', nationality: 'France' },
  { name: 'Claude Makelele', nationality: 'France' },
  { name: 'Franck Ribery', nationality: 'France' },
  { name: 'Patrice Evra', nationality: 'France' },
  { name: 'Raphael Varane', nationality: 'France' },
  { name: 'Olivier Giroud', nationality: 'France' },
  { name: 'Kingsley Coman', nationality: 'France' },
  { name: 'Ousmane Dembele', nationality: 'France' },
  { name: 'William Saliba', nationality: 'France' },
  { name: 'Aurelien Tchouameni', nationality: 'France' },
  { name: 'Eduardo Camavinga', nationality: 'France' },
  { name: 'Mike Maignan', nationality: 'France' },
  { name: 'Christopher Nkunku', nationality: 'France' },

  // Spain
  { name: 'Andres Iniesta', nationality: 'Spain' },
  { name: 'Iker Casillas', nationality: 'Spain' },
  { name: 'Carles Puyol', nationality: 'Spain' },
  { name: 'Sergio Ramos', nationality: 'Spain' },
  { name: 'Gerard Pique', nationality: 'Spain' },
  { name: 'Fernando Torres', nationality: 'Spain' },
  { name: 'David Villa', nationality: 'Spain' },
  { name: 'Xabi Alonso', nationality: 'Spain' },
  { name: 'Sergio Busquets', nationality: 'Spain' },
  { name: 'David Silva', nationality: 'Spain' },
  { name: 'Raul Gonzalez', nationality: 'Spain' },
  { name: 'Fernando Morientes', nationality: 'Spain' },
  { name: 'Fernando Hierro', nationality: 'Spain' },
  { name: 'Pep Guardiola', nationality: 'Spain' },
  { name: 'Luis Enrique', nationality: 'Spain' },
  { name: 'Emilio Butragueno', nationality: 'Spain' },
  { name: 'Marco Asensio', nationality: 'Spain' },
  { name: 'Isco Alarcon', nationality: 'Spain' },
  { name: 'Alvaro Morata', nationality: 'Spain' },
  { name: 'Dani Carvajal', nationality: 'Spain' },
  { name: 'Marcos Llorente', nationality: 'Spain' },
  { name: 'Dani Olmo', nationality: 'Spain' },
  { name: 'Pedri Gonzalez', nationality: 'Spain' },
  { name: 'Lamine Yamal', nationality: 'Spain' },
  { name: 'Marc Cucurella', nationality: 'Spain' },
  { name: 'Rodri Hernandez', nationality: 'Spain' },
  { name: 'Mikel Oyarzabal', nationality: 'Spain' },
  { name: 'Nico Williams', nationality: 'Spain' },
  { name: 'Ferran Torres', nationality: 'Spain' },

  // Italy
  { name: 'Roberto Baggio', nationality: 'Italy' },
  { name: 'Paolo Maldini', nationality: 'Italy' },
  { name: 'Fabio Cannavaro', nationality: 'Italy' },
  { name: 'Gianluigi Buffon', nationality: 'Italy' },
  { name: 'Andrea Pirlo', nationality: 'Italy' },
  { name: 'Francesco Totti', nationality: 'Italy' },
  { name: 'Alessandro Del Piero', nationality: 'Italy' },
  { name: 'Christian Vieri', nationality: 'Italy' },
  { name: 'Filippo Inzaghi', nationality: 'Italy' },
  { name: 'Marco Materazzi', nationality: 'Italy' },
  { name: 'Gennaro Gattuso', nationality: 'Italy' },
  { name: 'Alessandro Nesta', nationality: 'Italy' },
  { name: 'Gianluca Zambrotta', nationality: 'Italy' },
  { name: 'Antonio Cassano', nationality: 'Italy' },
  { name: 'Luca Toni', nationality: 'Italy' },
  { name: 'Mario Balotelli', nationality: 'Italy' },
  { name: 'Marco Verratti', nationality: 'Italy' },
  { name: 'Giorgio Chiellini', nationality: 'Italy' },
  { name: 'Leonardo Bonucci', nationality: 'Italy' },
  { name: 'Ciro Immobile', nationality: 'Italy' },
  { name: 'Lorenzo Insigne', nationality: 'Italy' },
  { name: 'Gianluigi Donnarumma', nationality: 'Italy' },
  { name: 'Nicolo Barella', nationality: 'Italy' },
  { name: 'Federico Chiesa', nationality: 'Italy' },
  { name: 'Luigi Riva', nationality: 'Italy' },
  { name: 'Paolo Rossi', nationality: 'Italy' },
  { name: 'Gianfranco Zola', nationality: 'Italy' },
  { name: 'Gianluca Vialli', nationality: 'Italy' },
  { name: 'Roberto Mancini', nationality: 'Italy' },

  // England
  { name: 'David Beckham', nationality: 'England' },
  { name: 'Steven Gerrard', nationality: 'England' },
  { name: 'Frank Lampard', nationality: 'England' },
  { name: 'Wayne Rooney', nationality: 'England' },
  { name: 'John Terry', nationality: 'England' },
  { name: 'Rio Ferdinand', nationality: 'England' },
  { name: 'Paul Scholes', nationality: 'England' },
  { name: 'Gary Neville', nationality: 'England' },
  { name: 'Alan Shearer', nationality: 'England' },
  { name: 'Gary Lineker', nationality: 'England' },
  { name: 'Paul Gascoigne', nationality: 'England' },
  { name: 'Bryan Robson', nationality: 'England' },
  { name: 'Glenn Hoddle', nationality: 'England' },
  { name: 'Chris Waddle', nationality: 'England' },
  { name: 'Matthew Le Tissier', nationality: 'England' },
  { name: 'Teddy Sheringham', nationality: 'England' },
  { name: 'Raheem Sterling', nationality: 'England' },
  { name: 'Jadon Sancho', nationality: 'England' },
  { name: 'Phil Foden', nationality: 'England' },
  { name: 'Jude Bellingham', nationality: 'England' },
  { name: 'Marcus Rashford', nationality: 'England' },
  { name: 'Harry Maguire', nationality: 'England' },
  { name: 'John Stones', nationality: 'England' },
  { name: 'Jordan Pickford', nationality: 'England' },
  { name: 'Kieran Trippier', nationality: 'England' },
  { name: 'Jordan Henderson', nationality: 'England' },
  { name: 'Trent Alexander-Arnold', nationality: 'England' },
  { name: 'Jack Grealish', nationality: 'England' },
  { name: 'Declan Rice', nationality: 'England' },
  { name: 'Kyle Walker', nationality: 'England' },
  { name: 'Theo Walcott', nationality: 'England' },
  { name: 'Jack Wilshere', nationality: 'England' },
  { name: 'Michael Carrick', nationality: 'England' },
  { name: 'Robbie Fowler', nationality: 'England' },
  { name: 'Ian Wright', nationality: 'England' },
  { name: 'John Barnes', nationality: 'England' },
  { name: 'Peter Crouch', nationality: 'England' },
  { name: 'Bukayo Saka', nationality: 'England' },
  { name: 'Cole Palmer', nationality: 'England' },
  { name: 'Ollie Watkins', nationality: 'England' },

  // Netherlands
  { name: 'Johan Cruyff', nationality: 'Netherlands' },
  { name: 'Marco Van Basten', nationality: 'Netherlands' },
  { name: 'Dennis Bergkamp', nationality: 'Netherlands' },
  { name: 'Ruud Gullit', nationality: 'Netherlands' },
  { name: 'Frank Rijkaard', nationality: 'Netherlands' },
  { name: 'Clarence Seedorf', nationality: 'Netherlands' },
  { name: 'Edgar Davids', nationality: 'Netherlands' },
  { name: 'Patrick Kluivert', nationality: 'Netherlands' },
  { name: 'Arjen Robben', nationality: 'Netherlands' },
  { name: 'Robin Van Persie', nationality: 'Netherlands' },
  { name: 'Wesley Sneijder', nationality: 'Netherlands' },
  { name: 'Ruud Van Nistelrooy', nationality: 'Netherlands' },
  { name: 'Jaap Stam', nationality: 'Netherlands' },
  { name: 'Edwin Van der Sar', nationality: 'Netherlands' },
  { name: 'Frank De Boer', nationality: 'Netherlands' },
  { name: 'Dirk Kuyt', nationality: 'Netherlands' },
  { name: 'Rafael Van der Vaart', nationality: 'Netherlands' },
  { name: 'Ronald Koeman', nationality: 'Netherlands' },
  { name: 'Marc Overmars', nationality: 'Netherlands' },
  { name: 'Stefan De Vrij', nationality: 'Netherlands' },
  { name: 'Georginio Wijnaldum', nationality: 'Netherlands' },
  { name: 'Memphis Depay', nationality: 'Netherlands' },
  { name: 'Matthijs De Ligt', nationality: 'Netherlands' },
  { name: 'Cody Gakpo', nationality: 'Netherlands' },
  { name: 'Xavi Simons', nationality: 'Netherlands' },
  { name: 'Tijjani Reijnders', nationality: 'Netherlands' },

  // Belgium
  { name: 'Eden Hazard', nationality: 'Belgium' },
  { name: 'Kevin De Bruyne', nationality: 'Belgium' },
  { name: 'Romelu Lukaku', nationality: 'Belgium' },
  { name: 'Thibaut Courtois', nationality: 'Belgium' },
  { name: 'Vincent Kompany', nationality: 'Belgium' },
  { name: 'Axel Witsel', nationality: 'Belgium' },
  { name: 'Marouane Fellaini', nationality: 'Belgium' },
  { name: 'Dries Mertens', nationality: 'Belgium' },
  { name: 'Yannick Carrasco', nationality: 'Belgium' },
  { name: 'Jan Vertonghen', nationality: 'Belgium' },
  { name: 'Toby Alderweireld', nationality: 'Belgium' },
  { name: 'Youri Tielemans', nationality: 'Belgium' },
  { name: 'Jeremy Doku', nationality: 'Belgium' },
  { name: 'Leandro Trossard', nationality: 'Belgium' },
  { name: 'Timothy Castagne', nationality: 'Belgium' },

  // Norway
  { name: 'Erling Haaland', nationality: 'Norway' },
  { name: 'Martin Odegaard', nationality: 'Norway' },

  // Croatia
  { name: 'Luka Modric', nationality: 'Croatia' },
  { name: 'Ivan Rakitic', nationality: 'Croatia' },
  { name: 'Mario Mandzukic', nationality: 'Croatia' },
  { name: 'Ivan Perisic', nationality: 'Croatia' },
  { name: 'Mateo Kovacic', nationality: 'Croatia' },
  { name: 'Marcelo Brozovic', nationality: 'Croatia' },
  { name: 'Domagoj Vida', nationality: 'Croatia' },
  { name: 'Dejan Lovren', nationality: 'Croatia' },
  { name: 'Davor Suker', nationality: 'Croatia' },
  { name: 'Zvonimir Boban', nationality: 'Croatia' },
  { name: 'Slaven Bilic', nationality: 'Croatia' },
  { name: 'Darijo Srna', nationality: 'Croatia' },
  { name: 'Josko Gvardiol', nationality: 'Croatia' },
  { name: 'Nikola Vlasic', nationality: 'Croatia' },
  { name: 'Andrej Kramaric', nationality: 'Croatia' },

  // Uruguay
  { name: 'Luis Suarez', nationality: 'Uruguay' },
  { name: 'Diego Forlan', nationality: 'Uruguay' },
  { name: 'Edinson Cavani', nationality: 'Uruguay' },
  { name: 'Diego Godin', nationality: 'Uruguay' },
  { name: 'Jose Maria Gimenez', nationality: 'Uruguay' },
  { name: 'Rodrigo Bentancur', nationality: 'Uruguay' },
  { name: 'Federico Valverde', nationality: 'Uruguay' },
  { name: 'Darwin Nunez', nationality: 'Uruguay' },
  { name: 'Enzo Francescoli', nationality: 'Uruguay' },
  { name: 'Ronald Araujo', nationality: 'Uruguay' },

  // Poland
  { name: 'Robert Lewandowski', nationality: 'Poland' },
  { name: 'Zbigniew Boniek', nationality: 'Poland' },
  { name: 'Wojciech Szczesny', nationality: 'Poland' },
  { name: 'Arkadiusz Milik', nationality: 'Poland' },
  { name: 'Piotr Zielinski', nationality: 'Poland' },

  // Sweden
  { name: 'Zlatan Ibrahimovic', nationality: 'Sweden' },
  { name: 'Henrik Larsson', nationality: 'Sweden' },
  { name: 'Freddie Ljungberg', nationality: 'Sweden' },
  { name: 'Emil Forsberg', nationality: 'Sweden' },
  { name: 'Alexander Isak', nationality: 'Sweden' },
  { name: 'Dejan Kulusevski', nationality: 'Sweden' },

  // Denmark
  { name: 'Michael Laudrup', nationality: 'Denmark' },
  { name: 'Peter Schmeichel', nationality: 'Denmark' },
  { name: 'Christian Eriksen', nationality: 'Denmark' },
  { name: 'Pierre-Emile Hojbjerg', nationality: 'Denmark' },

  // Ukraine
  { name: 'Andriy Shevchenko', nationality: 'Ukraine' },
  { name: 'Andriy Yarmolenko', nationality: 'Ukraine' },
  { name: 'Oleksandr Zinchenko', nationality: 'Ukraine' },
  { name: 'Mykhaylo Mudryk', nationality: 'Ukraine' },

  // Egypt
  { name: 'Mohamed Salah', nationality: 'Egypt' },
  { name: 'Omar Marmoush', nationality: 'Egypt' },

  // Senegal
  { name: 'Sadio Mane', nationality: 'Senegal' },
  { name: 'Kalidou Koulibaly', nationality: 'Senegal' },
  { name: 'Idrissa Gueye', nationality: 'Senegal' },
  { name: 'Nicolas Jackson', nationality: 'Senegal' },
  { name: 'Edouard Mendy', nationality: 'Senegal' },

  // Cameroon
  { name: 'Roger Milla', nationality: 'Cameroon' },
  { name: 'Andre Onana', nationality: 'Cameroon' },
  { name: 'Vincent Aboubakar', nationality: 'Cameroon' },

  // Ivory Coast
  { name: 'Didier Drogba', nationality: 'Ivory Coast' },
  { name: 'Yaya Toure', nationality: 'Ivory Coast' },
  { name: 'Wilfried Zaha', nationality: 'Ivory Coast' },
  { name: 'Nicolas Pepe', nationality: 'Ivory Coast' },
  { name: 'Franck Kessie', nationality: 'Ivory Coast' },
  { name: 'Sebastien Haller', nationality: 'Ivory Coast' },

  // Ghana
  { name: 'Michael Essien', nationality: 'Ghana' },
  { name: 'Asamoah Gyan', nationality: 'Ghana' },
  { name: 'Andre Ayew', nationality: 'Ghana' },
  { name: 'Mohammed Kudus', nationality: 'Ghana' },
  { name: 'Thomas Partey', nationality: 'Ghana' },

  // Nigeria
  { name: 'Jay-Jay Okocha', nationality: 'Nigeria' },
  { name: 'Nwankwo Kanu', nationality: 'Nigeria' },
  { name: 'John Obi Mikel', nationality: 'Nigeria' },
  { name: 'Victor Osimhen', nationality: 'Nigeria' },
  { name: 'Ademola Lookman', nationality: 'Nigeria' },
  { name: 'Alex Iwobi', nationality: 'Nigeria' },
  { name: 'Samuel Chukwueze', nationality: 'Nigeria' },

  // Algeria
  { name: 'Riyad Mahrez', nationality: 'Algeria' },

  // Morocco
  { name: 'Achraf Hakimi', nationality: 'Morocco' },
  { name: 'Hakim Ziyech', nationality: 'Morocco' },
  { name: 'Youssef En-Nesyri', nationality: 'Morocco' },
  { name: 'Sofyan Amrabat', nationality: 'Morocco' },

  // Mexico
  { name: 'Javier Hernandez', nationality: 'Mexico' },
  { name: 'Rafael Marquez', nationality: 'Mexico' },
  { name: 'Cuauhtemoc Blanco', nationality: 'Mexico' },
  { name: 'Hirving Lozano', nationality: 'Mexico' },
  { name: 'Guillermo Ochoa', nationality: 'Mexico' },
  { name: 'Carlos Vela', nationality: 'Mexico' },
  { name: 'Raul Jimenez', nationality: 'Mexico' },
  { name: 'Andres Guardado', nationality: 'Mexico' },

  // United States
  { name: 'Landon Donovan', nationality: 'United States' },
  { name: 'Tim Howard', nationality: 'United States' },
  { name: 'Clint Dempsey', nationality: 'United States' },
  { name: 'Christian Pulisic', nationality: 'United States' },
  { name: 'Weston McKennie', nationality: 'United States' },
  { name: 'Tyler Adams', nationality: 'United States' },
  { name: 'Yunus Musah', nationality: 'United States' },

  // Colombia
  { name: 'Carlos Valderrama', nationality: 'Colombia' },
  { name: 'Faustino Asprilla', nationality: 'Colombia' },
  { name: 'James Rodriguez', nationality: 'Colombia' },
  { name: 'Juan Cuadrado', nationality: 'Colombia' },
  { name: 'Rene Higuita', nationality: 'Colombia' },
  { name: 'Yerry Mina', nationality: 'Colombia' },
  { name: 'Luis Diaz', nationality: 'Colombia' },

  // Chile
  { name: 'Alexis Sanchez', nationality: 'Chile' },
  { name: 'Arturo Vidal', nationality: 'Chile' },
  { name: 'Claudio Bravo', nationality: 'Chile' },
  { name: 'Marcelo Salas', nationality: 'Chile' },
  { name: 'Ivan Zamorano', nationality: 'Chile' },

  // Czech Republic
  { name: 'Pavel Nedved', nationality: 'Czech Republic' },
  { name: 'Tomas Rosicky', nationality: 'Czech Republic' },
  { name: 'Petr Cech', nationality: 'Czech Republic' },
  { name: 'Patrik Schick', nationality: 'Czech Republic' },

  // Switzerland
  { name: 'Xherdan Shaqiri', nationality: 'Switzerland' },
  { name: 'Granit Xhaka', nationality: 'Switzerland' },
  { name: 'Yann Sommer', nationality: 'Switzerland' },
  { name: 'Manuel Akanji', nationality: 'Switzerland' },
  { name: 'Breel Embolo', nationality: 'Switzerland' },

  // Austria
  { name: 'David Alaba', nationality: 'Austria' },
  { name: 'Marko Arnautovic', nationality: 'Austria' },
  { name: 'Marcel Sabitzer', nationality: 'Austria' },

  // Serbia
  { name: 'Nemanja Vidic', nationality: 'Serbia' },
  { name: 'Dejan Stankovic', nationality: 'Serbia' },
  { name: 'Branislav Ivanovic', nationality: 'Serbia' },
  { name: 'Aleksandar Mitrovic', nationality: 'Serbia' },
  { name: 'Dusan Vlahovic', nationality: 'Serbia' },
  { name: 'Dusan Tadic', nationality: 'Serbia' },
  { name: 'Nemanja Matic', nationality: 'Serbia' },

  // Russia
  { name: 'Andrei Arshavin', nationality: 'Russia' },

  // Bulgaria
  { name: 'Hristo Stoichkov', nationality: 'Bulgaria' },

  // Romania
  { name: 'Gheorghe Hagi', nationality: 'Romania' },

  // Hungary
  { name: 'Ferenc Puskas', nationality: 'Hungary' },

  // Greece
  { name: 'Angelos Charisteas', nationality: 'Greece' },

  // Turkey
  { name: 'Hakan Sukur', nationality: 'Turkey' },
  { name: 'Hakan Calhanoglu', nationality: 'Turkey' },
  { name: 'Kenan Yildiz', nationality: 'Turkey' },
  { name: 'Arda Guler', nationality: 'Turkey' },

  // Slovakia
  { name: 'Marek Hamsik', nationality: 'Slovakia' },

  // Bosnia
  { name: 'Edin Dzeko', nationality: 'Bosnia' },
  { name: 'Miralem Pjanic', nationality: 'Bosnia' },

  // Iceland
  { name: 'Gylfi Sigurdsson', nationality: 'Iceland' },
  { name: 'Aron Gunnarsson', nationality: 'Iceland' },

  // Republic of Ireland
  { name: 'Roy Keane', nationality: 'Republic of Ireland' },
  { name: 'Damien Duff', nationality: 'Republic of Ireland' },
  { name: 'Shay Given', nationality: 'Republic of Ireland' },
  { name: 'Robbie Keane', nationality: 'Republic of Ireland' },
  { name: 'Paul McGrath', nationality: 'Republic of Ireland' },
  { name: 'Liam Brady', nationality: 'Republic of Ireland' },

  // Wales
  { name: 'Gareth Bale', nationality: 'Wales' },
  { name: 'Ryan Giggs', nationality: 'Wales' },
  { name: 'Ian Rush', nationality: 'Wales' },
  { name: 'Mark Hughes', nationality: 'Wales' },
  { name: 'Gary Speed', nationality: 'Wales' },
  { name: 'Aaron Ramsey', nationality: 'Wales' },

  // Scotland
  { name: 'Kenny Dalglish', nationality: 'Scotland' },
  { name: 'Denis Law', nationality: 'Scotland' },
  { name: 'Graeme Souness', nationality: 'Scotland' },
  { name: 'Andy Robertson', nationality: 'Scotland' },
  { name: 'Scott McTominay', nationality: 'Scotland' },

  // Australia
  { name: 'Harry Kewell', nationality: 'Australia' },
  { name: 'Tim Cahill', nationality: 'Australia' },

  // Canada
  { name: 'Alphonso Davies', nationality: 'Canada' },
  { name: 'Jonathan David', nationality: 'Canada' },

  // Japan
  { name: 'Hidetoshi Nakata', nationality: 'Japan' },
  { name: 'Keisuke Honda', nationality: 'Japan' },
  { name: 'Shinji Kagawa', nationality: 'Japan' },
  { name: 'Shunsuke Nakamura', nationality: 'Japan' },
  { name: 'Wataru Endo', nationality: 'Japan' },
  { name: 'Kaoru Mitoma', nationality: 'Japan' },
  { name: 'Takefusa Kubo', nationality: 'Japan' },
  { name: 'Ritsu Doan', nationality: 'Japan' },

  // South Korea
  { name: 'Kim Min-jae', nationality: 'South Korea' },
  { name: 'Hwang Hee-chan', nationality: 'South Korea' },

  // Costa Rica
  { name: 'Keylor Navas', nationality: 'Costa Rica' },

  // Ecuador
  { name: 'Antonio Valencia', nationality: 'Ecuador' },
  { name: 'Moises Caicedo', nationality: 'Ecuador' },
  { name: 'Piero Hincapie', nationality: 'Ecuador' },

  // Paraguay
  { name: 'Roque Santa Cruz', nationality: 'Paraguay' },
  { name: 'Jose Luis Chilavert', nationality: 'Paraguay' },
  { name: 'Miguel Almiron', nationality: 'Paraguay' },

  // Peru
  { name: 'Paolo Guerrero', nationality: 'Peru' },
  { name: 'Jefferson Farfan', nationality: 'Peru' },
]
