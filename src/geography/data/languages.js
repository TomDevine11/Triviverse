// Earshot's language catalogue: every language a player can guess, the bank's
// answers among them. Pure data — read by the game and by the clip builder.
//
//   id    stable key (storage, manifest, share-free)
//   name  canonical English name
//   end   endonym, in its own script — the language's visual identity
//   fam   close-relative group; a wrong guess in the answer's group shows amber
//   cc    flag-icons codes where it is a main or official language, most-associated
//         first. A multi-country language always lists several, so no single
//         country's flag ever stands for it
//   wh    Whisper language code (build-time verification only), or null
//   alias other names a player might type: endonyms, exonyms, older names. Never a
//         different language: Urdu is not an alias of Hindi, nor Croatian of Serbian
//   fact  one line shown after the round (languages with clips in the bank)
//
// Dialects and varieties are not separate entries: a Levantine Arabic clip is
// answered "Arabic", and the reveal names the variety.

export const FAMILIES = {
  romance: 'Romance', germanic: 'Germanic', slavic: 'Slavic', baltic: 'Baltic', celtic: 'Celtic',
  hellenic: 'Hellenic', albanian: 'Albanian', armenian: 'Armenian', iranian: 'Iranian', indoaryan: 'Indo-Aryan',
  uralic: 'Uralic', turkic: 'Turkic', mongolic: 'Mongolic', kartvelian: 'Kartvelian', isolate: 'Language isolate',
  semitic: 'Semitic', cushitic: 'Cushitic', berber: 'Berber', chadic: 'Chadic', bantu: 'Bantu',
  nigercongo: 'West African Niger–Congo', nilotic: 'Nilo-Saharan', dravidian: 'Dravidian', sinitic: 'Sinitic',
  tibetoburman: 'Tibeto-Burman', japonic: 'Japonic', koreanic: 'Koreanic', austroasiatic: 'Austroasiatic',
  kradai: 'Kra–Dai', hmongmien: 'Hmong–Mien', austronesian: 'Austronesian', creole: 'Creole',
  americas: 'Indigenous American', eskimoaleut: 'Eskimo–Aleut', constructed: 'Constructed', caucasian: 'Northeast Caucasian',
}

const L = (id, name, end, fam, cc, wh, alias = [], fact = null) => ({ id, name, end, fam, cc, wh, alias, fact })

export const LANGUAGES = [
  // ── Germanic ──
  L('english', 'English', 'English', 'germanic', ['gb', 'us', 'au', 'ca', 'nz', 'ie'], 'en', [], 'Spoken by well over a billion people — yet native speakers are only around a quarter of them.'),
  L('german', 'German', 'Deutsch', 'germanic', ['de', 'at', 'ch', 'li', 'lu'], 'de', ['deutsch', 'swiss german', 'austrian german'], 'The most widely spoken mother tongue in the European Union, and official in six European countries.'),
  L('dutch', 'Dutch', 'Nederlands', 'germanic', ['nl', 'be', 'sr'], 'nl', ['nederlands', 'flemish', 'vlaams', 'hollands'], 'Afrikaans, New York’s old name New Amsterdam and the word “cookie” all trace back to Dutch.'),
  L('afrikaans', 'Afrikaans', 'Afrikaans', 'germanic', ['za', 'na'], 'af', [], 'Grew from the Dutch brought to the Cape in the 17th century — Dutch and Afrikaans speakers can largely read each other.'),
  L('swedish', 'Swedish', 'Svenska', 'germanic', ['se', 'fi'], 'sv', ['svenska'], 'Has a pitch accent: “anden” is “the duck” or “the spirit” depending only on the melody.'),
  L('norwegian', 'Norwegian', 'Norsk', 'germanic', ['no'], 'no', ['norsk', 'bokmal', 'bokmål', 'nynorsk'], 'Has two official written standards, Bokmål and Nynorsk — and no official spoken standard at all.'),
  L('danish', 'Danish', 'Dansk', 'germanic', ['dk', 'gl', 'fo'], 'da', ['dansk'], 'Famous for the “stød”, a creaky catch in the voice that can be the only difference between two words.'),
  L('icelandic', 'Icelandic', 'Íslenska', 'germanic', ['is'], 'is', ['islenska', 'íslenska'], 'Has changed so little that Icelanders can read the medieval sagas, written 800 years ago, without much trouble.'),
  L('faroese', 'Faroese', 'Føroyskt', 'germanic', ['fo'], 'fo', ['foroyskt']),
  L('luxembourgish', 'Luxembourgish', 'Lëtzebuergesch', 'germanic', ['lu'], 'lb', ['letzebuergesch', 'lëtzebuergesch', 'luxemburgish'], 'Became an official language of Luxembourg only in 1984, alongside French and German.'),
  L('yiddish', 'Yiddish', 'ייִדיש', 'germanic', ['il', 'us'], 'yi', ['idish'], 'A Germanic language written in the Hebrew alphabet, for a thousand years the everyday tongue of Ashkenazi Jews.'),
  L('frisian', 'West Frisian', 'Frysk', 'germanic', ['nl'], null, ['frisian', 'frysk']),
  L('scots', 'Scots', 'Scots', 'germanic', ['gb'], null, ['lallans', 'doric']),

  // ── Romance ──
  L('spanish', 'Spanish', 'Español', 'romance', ['es', 'mx', 'co', 'ar', 'pe', 'cl'], 'es', ['espanol', 'español', 'castilian', 'castellano'], 'The world’s second-largest language by native speakers — Mexico alone has more than twice as many as Spain.'),
  L('french', 'French', 'Français', 'romance', ['fr', 'ca', 'be', 'ch', 'sn', 'cd'], 'fr', ['francais', 'français', 'quebecois', 'québécois'], 'Official in 29 countries — more than any language except English — and most people who use it every day now live in Africa.'),
  L('italian', 'Italian', 'Italiano', 'romance', ['it', 'ch', 'sm', 'va'], 'it', ['italiano'], 'Standard Italian grew from the Tuscan of Dante’s Florence; at unification in 1861 few Italians spoke it at home.'),
  L('portuguese', 'Portuguese', 'Português', 'romance', ['br', 'pt', 'ao', 'mz', 'cv'], 'pt', ['portugues', 'português', 'brazilian portuguese', 'brazilian'], 'Around four in five Portuguese speakers live in Brazil, not Portugal.'),
  L('romanian', 'Romanian', 'Română', 'romance', ['ro', 'md'], 'ro', ['romana', 'română', 'moldovan', 'rumanian'], 'A Romance island in eastern Europe, descended from the Latin of Roman Dacia and ringed by Slavic and Hungarian.'),
  L('catalan', 'Catalan', 'Català', 'romance', ['ad', 'es', 'fr'], 'ca', ['catala', 'català', 'valencian', 'valencià'], 'The only official language of Andorra, and spoken by around ten million people in Spain, France and Italy.'),
  L('galician', 'Galician', 'Galego', 'romance', ['es'], 'gl', ['galego'], 'Shares its medieval roots with Portuguese — the two were once one language, Galician-Portuguese.'),
  L('occitan', 'Occitan', 'Occitan', 'romance', ['fr', 'es', 'it'], 'oc', ['provencal', 'provençal', 'langue d’oc', 'langue doc', 'gascon'], 'Gave its name to Languedoc — the “language of oc”, from its word for “yes”.'),
  L('latin', 'Latin', 'Latina', 'romance', ['va'], 'la', ['latina'], 'Still the official language of Vatican City, which publishes new Latin words for modern things.'),
  L('sardinian', 'Sardinian', 'Sardu', 'romance', ['it'], null, ['sardu']),
  L('sicilian', 'Sicilian', 'Sicilianu', 'romance', ['it'], null, ['sicilianu']),
  L('corsican', 'Corsican', 'Corsu', 'romance', ['fr'], null, ['corsu']),
  L('asturian', 'Asturian', 'Asturianu', 'romance', ['es'], null, ['asturianu', 'bable']),

  // ── Celtic ──
  L('welsh', 'Welsh', 'Cymraeg', 'celtic', ['gb-wls'], 'cy', ['cymraeg'], 'The most widely spoken of the Celtic languages, spoken in Britain for longer than English.'),
  L('irish', 'Irish', 'Gaeilge', 'celtic', ['ie'], null, ['gaeilge', 'irish gaelic', 'gaelic'], 'The first official language of Ireland, and a full working language of the EU since 2022.'),
  L('scottish-gaelic', 'Scottish Gaelic', 'Gàidhlig', 'celtic', ['gb-sct'], null, ['gaidhlig', 'gàidhlig', 'gaelic'], 'Brought to Scotland from Ireland in the early Middle Ages; today it is strongest in the Outer Hebrides.'),
  L('breton', 'Breton', 'Brezhoneg', 'celtic', ['fr'], 'br', ['brezhoneg'], 'Carried from Britain to Brittany in the early Middle Ages; its closest relative is Cornish, not French.'),
  L('cornish', 'Cornish', 'Kernewek', 'celtic', ['gb-eng'], null, ['kernewek']),
  L('manx', 'Manx', 'Gaelg', 'celtic', ['im'], null, ['gaelg', 'manx gaelic']),

  // ── Slavic ──
  L('russian', 'Russian', 'Русский', 'slavic', ['ru', 'by', 'kz', 'kg'], 'ru', ['russkiy', 'russkij'], 'One of the six official languages of the United Nations, and Europe’s most spoken mother tongue.'),
  L('ukrainian', 'Ukrainian', 'Українська', 'slavic', ['ua'], 'uk', ['ukrainska'], 'Its Cyrillic alphabet has letters Russian lacks — є, і, ї and ґ.'),
  L('belarusian', 'Belarusian', 'Беларуская', 'slavic', ['by'], 'be', ['belarusan', 'byelorussian', 'belorussian'], 'The only Slavic language whose alphabet has the letter ў, a “short u”.'),
  L('polish', 'Polish', 'Polski', 'slavic', ['pl'], 'pl', ['polski'], '“W Szczebrzeszynie chrząszcz brzmi w trzcinie” — a beetle buzzing in the reeds — is its classic tongue-twister.'),
  L('czech', 'Czech', 'Čeština', 'slavic', ['cz'], 'cs', ['cestina', 'čeština', 'bohemian'], 'Home of ř, a buzzing rolled r found in almost no other language — Dvořák’s name has one.'),
  L('slovak', 'Slovak', 'Slovenčina', 'slavic', ['sk'], 'sk', ['slovencina', 'slovenčina'], 'Has whole sentences without vowels: “Strč prst skrz krk” — stick a finger through your neck.'),
  L('slovenian', 'Slovenian', 'Slovenščina', 'slavic', ['si'], 'sl', ['slovene', 'slovenscina', 'slovenščina'], 'Keeps the dual: separate word forms for exactly two of something, between singular and plural.'),
  L('croatian', 'Croatian', 'Hrvatski', 'slavic', ['hr', 'ba'], 'hr', ['hrvatski'], 'Written only in the Latin alphabet, and largely mutually intelligible with Serbian and Bosnian.'),
  L('serbian', 'Serbian', 'Српски', 'slavic', ['rs', 'ba', 'me'], 'sr', ['srpski'], 'Written in both Cyrillic and Latin — Serbian newspapers, signs and books use either.'),
  L('bosnian', 'Bosnian', 'Bosanski', 'slavic', ['ba'], 'bs', ['bosanski'], 'One of three official languages of Bosnia and Herzegovina, alongside the closely related Croatian and Serbian.'),
  L('macedonian', 'Macedonian', 'Македонски', 'slavic', ['mk'], 'mk', ['makedonski'], 'Like Bulgarian, it lost the noun cases most Slavic languages keep, and puts “the” on the end of words.'),
  L('bulgarian', 'Bulgarian', 'Български', 'slavic', ['bg'], 'bg', ['balgarski'], 'The Cyrillic alphabet was developed in the First Bulgarian Empire in the 9th–10th centuries.'),
  L('silesian', 'Silesian', 'Ślōnskŏ', 'slavic', ['pl', 'cz'], null, ['slonsko']),

  // ── Baltic, Hellenic, Albanian, Armenian ──
  L('lithuanian', 'Lithuanian', 'Lietuvių', 'baltic', ['lt'], 'lt', ['lietuviu', 'lietuvių'], 'Often called the most conservative living Indo-European language, close in places to ancient Sanskrit.'),
  L('latvian', 'Latvian', 'Latviešu', 'baltic', ['lv'], 'lv', ['latviesu', 'latviešu', 'lettish'], 'With Lithuanian, one of only two Baltic languages still spoken.'),
  L('greek', 'Greek', 'Ελληνικά', 'hellenic', ['gr', 'cy'], 'el', ['ellinika', 'hellenic'], 'Written for about 3,400 years — the longest recorded history of any living European language.'),
  L('albanian', 'Albanian', 'Shqip', 'albanian', ['al', 'xk', 'mk'], 'sq', ['shqip']),
  L('armenian', 'Armenian', 'Հայերեն', 'armenian', ['am'], 'hy', ['hayeren'], 'Has its own alphabet, created around 405 CE by the monk Mesrop Mashtots.'),

  // ── Uralic, isolate ──
  L('finnish', 'Finnish', 'Suomi', 'uralic', ['fi'], 'fi', ['suomi'], 'Related to Estonian and, distantly, Hungarian — not to its Scandinavian neighbours.'),
  L('estonian', 'Estonian', 'Eesti', 'uralic', ['ee'], 'et', ['eesti'], 'Has 14 grammatical cases but no grammatical gender — and no future tense.'),
  L('hungarian', 'Hungarian', 'Magyar', 'uralic', ['hu'], 'hu', ['magyar'], 'A Uralic language in the middle of Europe; its closest relatives are spoken in western Siberia.'),
  L('sami', 'Northern Sámi', 'Davvisámegiella', 'uralic', ['no', 'se', 'fi'], null, ['sami', 'saami', 'sámi', 'lappish']),
  L('basque', 'Basque', 'Euskara', 'isolate', ['es', 'fr'], 'eu', ['euskara', 'euskera'], 'A language isolate: no relationship to any other language on Earth has ever been proven.'),

  // ── Iranian ──
  L('persian', 'Persian', 'فارسی', 'iranian', ['ir', 'af', 'tj'], 'fa', ['farsi', 'dari', 'parsi'], 'Iranians can read poetry written a thousand years ago, like Ferdowsi’s Shahnameh, with little difficulty.'),
  L('tajik', 'Tajik', 'Тоҷикӣ', 'iranian', ['tj'], 'tg', ['tojiki', 'tajiki'], 'A form of Persian written in Cyrillic — Tajik and Iranian Persian speakers can usually follow each other.'),
  L('pashto', 'Pashto', 'پښتو', 'iranian', ['af', 'pk'], 'ps', ['pushto', 'pakhto', 'pashtu'], 'An official language of Afghanistan and spoken by tens of millions in northwest Pakistan.'),
  L('kurdish', 'Kurdish', 'Kurdî', 'iranian', ['iq', 'tr', 'ir', 'sy'], null, ['kurdi', 'kurmanji', 'sorani'], 'Spoken across Turkey, Iraq, Iran and Syria, and written in Latin or Arabic script depending on the region.'),
  L('balochi', 'Balochi', 'بلوچی', 'iranian', ['pk', 'ir'], null, ['baluchi']),
  L('ossetian', 'Ossetian', 'Ирон', 'iranian', ['ge', 'ru'], null, ['ossetic', 'iron']),

  // ── Indo-Aryan ──
  L('hindi', 'Hindi', 'हिन्दी', 'indoaryan', ['in'], 'hi', ['hindustani'], 'Hindi and Urdu share their everyday grammar and vocabulary, but are written in different scripts.'),
  L('urdu', 'Urdu', 'اردو', 'indoaryan', ['pk', 'in'], 'ur', [], 'Usually written in Nastaliq, a flowing, hanging style of the Perso-Arabic script.'),
  L('bengali', 'Bengali', 'বাংলা', 'indoaryan', ['bd', 'in'], 'bn', ['bangla'], 'International Mother Language Day, 21 February, commemorates the Bengali Language Movement of 1952.'),
  L('punjabi', 'Punjabi', 'ਪੰਜਾਬੀ', 'indoaryan', ['in', 'pk'], 'pa', ['panjabi'], 'A tonal language — rare among Indo-European languages — written in Gurmukhi in India and Shahmukhi in Pakistan.'),
  L('marathi', 'Marathi', 'मराठी', 'indoaryan', ['in'], 'mr', [], 'The language of Maharashtra and Mumbai, spoken by over 80 million people.'),
  L('gujarati', 'Gujarati', 'ગુજરાતી', 'indoaryan', ['in'], 'gu', [], 'Mahatma Gandhi’s mother tongue — his autobiography was first written in Gujarati.'),
  L('nepali', 'Nepali', 'नेपाली', 'indoaryan', ['np', 'in'], 'ne', ['nepalese', 'gorkhali'], 'Written in Devanagari, the same script as Hindi and Marathi.'),
  L('assamese', 'Assamese', 'অসমীয়া', 'indoaryan', ['in'], 'as', ['asamiya'], 'One of the easternmost Indo-Aryan languages, written in a script shared, with small differences, with Bengali.'),
  L('odia', 'Odia', 'ଓଡ଼ିଆ', 'indoaryan', ['in'], null, ['oriya']),
  L('sinhala', 'Sinhala', 'සිංහල', 'indoaryan', ['lk'], 'si', ['sinhalese']),
  L('sindhi', 'Sindhi', 'سنڌي', 'indoaryan', ['pk', 'in'], 'sd', []),
  L('romani', 'Romani', 'Romani čhib', 'indoaryan', ['ro', 'hu', 'rs'], null, ['romany']),

  // ── Dravidian ──
  L('tamil', 'Tamil', 'தமிழ்', 'dravidian', ['in', 'lk', 'sg'], 'ta', [], 'One of the world’s longest-surviving classical languages, with literature over 2,000 years old.'),
  L('telugu', 'Telugu', 'తెలుగు', 'dravidian', ['in'], 'te', [], 'Nicknamed “the Italian of the East”, as almost every word ends in a vowel.'),
  L('kannada', 'Kannada', 'ಕನ್ನಡ', 'dravidian', ['in'], 'kn', ['canarese'], 'The language of Karnataka and Bengaluru, written in a rounded script closely related to Telugu’s.'),
  L('malayalam', 'Malayalam', 'മലയാളം', 'dravidian', ['in'], 'ml', [], 'Spell its name backwards: Malayalam is a palindrome in English letters.'),

  // ── Turkic, Mongolic ──
  L('turkish', 'Turkish', 'Türkçe', 'turkic', ['tr', 'cy'], 'tr', ['turkce', 'türkçe'], 'Switched from the Arabic to the Latin alphabet in 1928, almost overnight.'),
  L('azerbaijani', 'Azerbaijani', 'Azərbaycanca', 'turkic', ['az', 'ir'], 'az', ['azeri', 'azerbaycanca'], 'Close enough to Turkish that speakers can follow each other — and more speakers live in Iran than in Azerbaijan.'),
  L('kazakh', 'Kazakh', 'Қазақша', 'turkic', ['kz'], 'kk', ['qazaq', 'kazak'], 'The language of the world’s largest landlocked country, now moving from Cyrillic to a Latin alphabet.'),
  L('uzbek', 'Uzbek', 'Oʻzbekcha', 'turkic', ['uz'], 'uz', ['ozbek', 'o‘zbek'], 'The most spoken Turkic language of Central Asia, written in both Latin and Cyrillic.'),
  L('kyrgyz', 'Kyrgyz', 'Кыргызча', 'turkic', ['kg'], null, ['kirghiz', 'kirgiz'], 'Its epic poem Manas is one of the longest in the world — around twenty times longer than the Iliad and the Odyssey combined.'),
  L('turkmen', 'Turkmen', 'Türkmençe', 'turkic', ['tm'], 'tk', []),
  L('tatar', 'Tatar', 'Татарча', 'turkic', ['ru'], 'tt', ['tatarca', 'volga tatar']),
  L('uyghur', 'Uyghur', 'ئۇيغۇرچە', 'turkic', ['cn'], null, ['uighur']),
  L('crimean-tatar', 'Crimean Tatar', 'Qırımtatarca', 'turkic', ['ua'], null, []),
  L('mongolian', 'Mongolian', 'Монгол', 'mongolic', ['mn', 'cn'], 'mn', ['mongol'], 'Written in Cyrillic in Mongolia, but in the traditional vertical script in China’s Inner Mongolia.'),

  // ── Caucasus ──
  L('georgian', 'Georgian', 'ქართული', 'kartvelian', ['ge'], 'ka', ['kartuli'], 'Written in its own alphabet, Mkhedruli, which has no capital letters.'),
  L('chechen', 'Chechen', 'Нохчийн', 'caucasian', ['ru'], null, ['nokhchiin']),

  // ── Semitic, Cushitic, Berber, Chadic ──
  L('arabic', 'Arabic', 'العربية', 'semitic', ['sa', 'eg', 'ma', 'iq', 'sy', 'ae'], 'ar', ['arabi', 'al-arabiyya', 'egyptian arabic', 'levantine arabic', 'iraqi arabic', 'maghrebi arabic', 'darija'], 'Written right to left; Modern Standard Arabic is shared, but everyday speech varies hugely from Morocco to Iraq.'),
  L('hebrew', 'Hebrew', 'עברית', 'semitic', ['il'], 'he', ['ivrit'], 'Revived as an everyday spoken language in the late 19th century after almost two thousand years of mainly written use.'),
  L('maltese', 'Maltese', 'Malti', 'semitic', ['mt'], 'mt', ['malti'], 'The only Semitic language with official EU status, and the only one written in the Latin alphabet.'),
  L('amharic', 'Amharic', 'አማርኛ', 'semitic', ['et'], 'am', ['amarigna', 'amarinya'], 'Written in Ge’ez script, where each character is a whole syllable — the second most spoken Semitic language after Arabic.'),
  L('tigrinya', 'Tigrinya', 'ትግርኛ', 'semitic', ['er', 'et'], null, ['tigrigna']),
  L('aramaic', 'Aramaic', 'ܐܪܡܝܐ', 'semitic', ['iq', 'sy'], null, ['syriac', 'assyrian', 'neo-aramaic']),
  L('somali', 'Somali', 'Soomaali', 'cushitic', ['so', 'et', 'dj', 'ke'], 'so', ['soomaali', 'af-soomaali'], 'Has only had an official written form since 1972, when the Latin alphabet was adopted.'),
  L('oromo', 'Oromo', 'Afaan Oromoo', 'cushitic', ['et', 'ke'], null, ['afaan oromoo', 'oromiffa'], 'Ethiopia’s most widely spoken first language, written in the Latin alphabet since the 1990s.'),
  L('kabyle', 'Kabyle', 'Taqbaylit', 'berber', ['dz'], null, ['taqbaylit']),
  L('tamazight', 'Tamazight', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 'berber', ['ma', 'dz'], null, ['berber', 'amazigh', 'tashelhit']),
  L('hausa', 'Hausa', 'Hausa', 'chadic', ['ng', 'ne'], 'ha', ['harshen hausa'], 'A lingua franca for tens of millions across West Africa — once written mainly in Arabic script, now in Latin.'),

  // ── Niger–Congo ──
  L('swahili', 'Swahili', 'Kiswahili', 'bantu', ['tz', 'ke', 'ug', 'cd'], 'sw', ['kiswahili'], 'Its name comes from the Arabic sawāḥil, “coasts” — it grew as the trading language of the East African coast.'),
  L('zulu', 'Zulu', 'isiZulu', 'bantu', ['za'], null, ['isizulu'], 'South Africa’s most widely spoken home language, with click consonants borrowed from Khoisan neighbours.'),
  L('xhosa', 'Xhosa', 'isiXhosa', 'bantu', ['za'], null, ['isixhosa'], 'Nelson Mandela’s first language — the “X” in its name is itself a click.'),
  L('shona', 'Shona', 'chiShona', 'bantu', ['zw'], 'sn', ['chishona'], 'Zimbabwe’s most widely spoken language, with whistled sibilants rare elsewhere in the world.'),
  L('lingala', 'Lingala', 'Lingála', 'bantu', ['cd', 'cg'], 'ln', [], 'Spread along the Congo River as a trade language, and the language of Congolese rumba.'),
  L('luganda', 'Luganda', 'Oluganda', 'bantu', ['ug'], null, ['ganda', 'oluganda']),
  L('kinyarwanda', 'Kinyarwanda', 'Ikinyarwanda', 'bantu', ['rw'], null, ['rwanda', 'ikinyarwanda']),
  L('chichewa', 'Chichewa', 'Chicheŵa', 'bantu', ['mw', 'zm'], null, ['nyanja', 'chewa']),
  L('sotho', 'Sesotho', 'Sesotho', 'bantu', ['ls', 'za'], null, ['sotho', 'southern sotho']),
  L('tswana', 'Setswana', 'Setswana', 'bantu', ['bw', 'za'], null, ['tswana']),
  L('kikuyu', 'Kikuyu', 'Gĩkũyũ', 'bantu', ['ke'], null, ['gikuyu']),
  L('yoruba', 'Yoruba', 'Èdè Yorùbá', 'nigercongo', ['ng', 'bj'], 'yo', ['yorùbá', 'ede yoruba'], 'Tonal: “ọkọ” is husband, “ọkọ́” a hoe and “ọkọ̀” a vehicle — the tones alone tell them apart.'),
  L('igbo', 'Igbo', 'Asụsụ Igbo', 'nigercongo', ['ng'], null, ['ibo', 'asusu igbo'], 'One of Nigeria’s three largest languages; Chinua Achebe wove Igbo proverbs through Things Fall Apart.'),
  L('wolof', 'Wolof', 'Wolof', 'nigercongo', ['sn', 'gm'], null, [], 'Senegal’s lingua franca — understood by most Senegalese, whatever their first language.'),
  L('twi', 'Twi (Akan)', 'Twi', 'nigercongo', ['gh'], null, ['akan', 'asante twi', 'fante'], 'The most widely spoken language in Ghana, part of the Akan cluster — and tonal, like most of its neighbours.'),
  L('fula', 'Fula', 'Pulaar', 'nigercongo', ['sn', 'gn', 'ng', 'ml'], null, ['fulani', 'fulfulde', 'pulaar', 'peul']),
  L('ewe', 'Ewe', 'Eʋegbe', 'nigercongo', ['gh', 'tg'], null, []),
  L('luo', 'Dholuo', 'Dholuo', 'nilotic', ['ke', 'tz'], null, ['luo']),

  // ── East & Southeast Asia ──
  L('mandarin', 'Mandarin Chinese', '普通话', 'sinitic', ['cn', 'tw', 'sg'], 'zh', ['mandarin', 'chinese', 'putonghua', 'guoyu', 'huayu', 'zhongwen'], 'More people speak it as a first language than any other language on Earth.'),
  L('cantonese', 'Cantonese', '粵語', 'sinitic', ['hk', 'mo', 'cn'], 'yue', ['cantonese chinese', 'chinese', 'yue', 'guangdonghua', 'gwongdungwaa'], 'Has six main tones, and keeps sounds that Mandarin lost centuries ago — classical poems often rhyme better in it.'),
  L('hokkien', 'Hokkien', '閩南語', 'sinitic', ['tw', 'cn', 'sg', 'my'], null, ['min nan', 'minnan', 'taiwanese', 'chinese']),
  L('wu', 'Shanghainese (Wu)', '吳語', 'sinitic', ['cn'], null, ['shanghainese', 'wu chinese', 'chinese']),
  L('hakka', 'Hakka', '客家話', 'sinitic', ['cn', 'tw'], null, ['hakka chinese', 'chinese']),
  L('japanese', 'Japanese', '日本語', 'japonic', ['jp'], 'ja', ['nihongo'], 'Everyday writing mixes three scripts at once: kanji, hiragana and katakana.'),
  L('korean', 'Korean', '한국어', 'koreanic', ['kr', 'kp'], 'ko', ['hangugeo', 'hangul', 'chosonmal'], 'Hangul was invented in the 15th century under King Sejong — South Korea celebrates it with a national holiday.'),
  L('tibetan', 'Tibetan', 'བོད་སྐད', 'tibetoburman', ['cn', 'in', 'np'], 'bo', ['bod skad']),
  L('burmese', 'Burmese', 'မြန်မာ', 'tibetoburman', ['mm'], 'my', ['myanmar', 'bamar'], 'Written in a script of circles and curves — first developed, it’s often said, for writing on palm leaves that straight lines would tear.'),
  L('vietnamese', 'Vietnamese', 'Tiếng Việt', 'austroasiatic', ['vn'], 'vi', ['tieng viet', 'tiếng việt'], 'Written in a Latin alphabet with stacked diacritics marking its tones — six of them in the Hanoi standard.'),
  L('khmer', 'Khmer', 'ខ្មែរ', 'austroasiatic', ['kh'], 'km', ['cambodian'], 'Guinness World Records lists its alphabet, with 74 letters, as the world’s longest.'),
  L('thai', 'Thai', 'ไทย', 'kradai', ['th'], 'th', ['siamese', 'phasa thai'], 'Has five tones and its own alphabet of 44 consonant letters — but writes no spaces between words.'),
  L('lao', 'Lao', 'ລາວ', 'kradai', ['la'], 'lo', ['laotian'], 'So close to Thai that the two are largely mutually intelligible when spoken.'),
  L('hmong', 'Hmong', 'Hmoob', 'hmongmien', ['la', 'vn', 'cn', 'us'], null, ['hmoob', 'mong']),

  // ── Austronesian ──
  L('indonesian', 'Indonesian', 'Bahasa Indonesia', 'austronesian', ['id'], 'id', ['bahasa indonesia', 'bahasa'], 'A standardised Malay chosen in 1928 to unite a country of hundreds of languages — most Indonesians learn it as a second language.'),
  L('malay', 'Malay', 'Bahasa Melayu', 'austronesian', ['my', 'bn', 'sg'], 'ms', ['bahasa melayu', 'bahasa malaysia', 'melayu'], 'Indonesian and Malay grew from the same language but now differ in vocabulary, spelling and sound.'),
  L('javanese', 'Javanese', 'Basa Jawa', 'austronesian', ['id'], 'jw', ['basa jawa', 'jawa'], 'The most widely spoken Austronesian mother tongue, with separate vocabularies for speaking to elders and equals.'),
  L('sundanese', 'Sundanese', 'Basa Sunda', 'austronesian', ['id'], 'su', ['basa sunda', 'sunda'], 'The language of West Java, spoken by around 40 million people — second only to Javanese among Indonesia’s regional languages.'),
  L('filipino', 'Filipino (Tagalog)', 'Wikang Filipino', 'austronesian', ['ph'], 'tl', ['tagalog', 'pilipino', 'wikang filipino'], 'Based on Tagalog and rich in Spanish loanwords, from “mesa” (table) to telling the time.'),
  L('cebuano', 'Cebuano', 'Sinugboanon', 'austronesian', ['ph'], null, ['bisaya', 'binisaya', 'visayan'], 'The Philippines’ second-largest language, spoken across the Visayas and much of Mindanao.'),
  L('malagasy', 'Malagasy', 'Malagasy', 'austronesian', ['mg'], 'mg', []),
  L('maori', 'Māori', 'Te Reo Māori', 'austronesian', ['nz'], 'mi', ['te reo', 'te reo maori', 'te reo māori'], 'Became an official language of New Zealand in 1987; “Aotearoa” is its name for the country.'),
  L('hawaiian', 'Hawaiian', 'ʻŌlelo Hawaiʻi', 'austronesian', ['us'], 'haw', ['olelo hawaii']),
  L('samoan', 'Samoan', 'Gagana Samoa', 'austronesian', ['ws', 'as'], null, ['gagana samoa']),
  L('tongan', 'Tongan', 'Lea faka-Tonga', 'austronesian', ['to'], null, []),
  L('fijian', 'Fijian', 'Vosa Vakaviti', 'austronesian', ['fj'], null, ['vosa vakaviti']),

  // ── Creoles ──
  L('haitian-creole', 'Haitian Creole', 'Kreyòl ayisyen', 'creole', ['ht'], 'ht', ['kreyol', 'kreyòl', 'haitian'], 'Spoken by almost everyone in Haiti; most of its words come from French, but its grammar is its own.'),
  L('tok-pisin', 'Tok Pisin', 'Tok Pisin', 'creole', ['pg'], null, ['pidgin', 'neo-melanesian'], 'Papua New Guinea’s lingua franca in a country of over 800 languages — its name is simply “talk pidgin”.'),
  L('jamaican', 'Jamaican Patois', 'Patwa', 'creole', ['jm'], null, ['patois', 'patwa', 'jamaican creole']),
  L('nigerian-pidgin', 'Nigerian Pidgin', 'Naijá', 'creole', ['ng'], null, ['naija', 'pidgin english']),
  L('papiamento', 'Papiamento', 'Papiamentu', 'creole', ['cw', 'aw'], null, ['papiamentu']),

  // ── The Americas, Arctic ──
  L('quechua', 'Quechua', 'Runa Simi', 'americas', ['pe', 'bo', 'ec'], null, ['runa simi', 'kichwa', 'quichua'], 'The language of the Inca Empire, still spoken by millions across the Andes — “Runa Simi” means “people’s language”.'),
  L('guarani', 'Guarani', 'Avañeʼẽ', 'americas', ['py', 'bo'], null, ['avanee', 'guaraní'], 'Spoken by most Paraguayans — one of the very few Indigenous languages of the Americas used by a national majority.'),
  L('aymara', 'Aymara', 'Aymar aru', 'americas', ['bo', 'pe'], null, []),
  L('nahuatl', 'Nahuatl', 'Nāhuatl', 'americas', ['mx'], null, ['aztec', 'mexicano']),
  L('yucatec', 'Yucatec Maya', 'Mayaʼ tʼàan', 'americas', ['mx'], null, ['maya', 'mayan']),
  L('navajo', 'Navajo', 'Diné bizaad', 'americas', ['us'], null, ['dine', 'diné', 'navaho']),
  L('cherokee', 'Cherokee', 'ᏣᎳᎩ', 'americas', ['us'], null, ['tsalagi']),
  L('greenlandic', 'Greenlandic', 'Kalaallisut', 'eskimoaleut', ['gl'], null, ['kalaallisut']),
  L('inuktitut', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ', 'eskimoaleut', ['ca'], null, ['inuit']),

  // ── Constructed ──
  L('esperanto', 'Esperanto', 'Esperanto', 'constructed', [], null, [], 'Created in 1887 by L. L. Zamenhof as an easy international second language — a few thousand people now speak it from birth.'),
]

const BY_ID = new Map(LANGUAGES.map(l => [l.id, l]))
export const languageById = (id) => BY_ID.get(id) || null
export const familyName = (fam) => FAMILIES[fam] || fam

// Search key: lowercase, accents and apostrophes folded, so "francais", "Français"
// and "FRANÇAIS" all match.
export const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'ʻʼ‘`]/g, '').toLowerCase().trim()

const INDEX = LANGUAGES.map(l => ({ l, keys: [l.name, l.end, ...l.alias].map(fold) }))

// The picker's suggestions: prefix matches on any name first, then word-prefix,
// then substring. Already-guessed languages drop out.
export function searchLanguages(text, exclude = new Set(), limit = 7) {
  const q = fold(text)
  if (!q) return []
  const ranked = []
  for (const { l, keys } of INDEX) {
    if (exclude.has(l.id)) continue
    let best = 9
    keys.forEach((k, i) => {
      const main = i === 0 ? 0 : 1
      if (k === q) best = Math.min(best, main)
      else if (k.startsWith(q)) best = Math.min(best, 2 + main)
      else if (k.split(/[\s()-]+/).some(w => w.startsWith(q))) best = Math.min(best, 4 + main)
      else if (q.length >= 3 && k.includes(q)) best = Math.min(best, 6 + main)
    })
    if (best < 9) ranked.push([best, l])
  }
  return ranked.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(x => x[1])
}

// An exact name/alias → language, only when it is unambiguous ("chinese" is not).
export function resolveLanguage(text) {
  const q = fold(text)
  const hits = INDEX.filter(({ keys }) => keys.includes(q)).map(x => x.l)
  return hits.length === 1 ? hits[0] : null
}
