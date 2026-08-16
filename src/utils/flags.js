// All keys are lowercase — covers both country names ("england") and adjectives ("english")
// TheSportsDB uses country names; our local data uses adjectives — this handles both.
const FLAGS = {
  // Afghanistan
  'afghanistan': '🇦🇫', 'afghan': '🇦🇫',
  // Albania
  'albania': '🇦🇱', 'albanian': '🇦🇱',
  // Algeria
  'algeria': '🇩🇿', 'algerian': '🇩🇿',
  // Angola
  'angola': '🇦🇴', 'angolan': '🇦🇴',
  // Argentina
  'argentina': '🇦🇷', 'argentine': '🇦🇷', 'argentinian': '🇦🇷', 'argentinean': '🇦🇷',
  // Armenia
  'armenia': '🇦🇲', 'armenian': '🇦🇲',
  // Australia
  'australia': '🇦🇺', 'australian': '🇦🇺',
  // Austria
  'austria': '🇦🇹', 'austrian': '🇦🇹',
  // Azerbaijan
  'azerbaijan': '🇦🇿', 'azerbaijani': '🇦🇿',
  // Bahrain
  'bahrain': '🇧🇭', 'bahraini': '🇧🇭',
  // Belgium
  'belgium': '🇧🇪', 'belgian': '🇧🇪',
  // Bolivia
  'bolivia': '🇧🇴', 'bolivian': '🇧🇴',
  // Bosnia
  'bosnia': '🇧🇦', 'bosnian': '🇧🇦',
  'bosnia and herzegovina': '🇧🇦', 'bosnia & herzegovina': '🇧🇦',
  // Brazil
  'brazil': '🇧🇷', 'brasil': '🇧🇷', 'brazilian': '🇧🇷',
  // Bulgaria
  'bulgaria': '🇧🇬', 'bulgarian': '🇧🇬',
  // Burkina Faso
  'burkina faso': '🇧🇫', 'burkinabe': '🇧🇫',
  // Burundi
  'burundi': '🇧🇮', 'burundian': '🇧🇮',
  // Cameroon
  'cameroon': '🇨🇲', 'cameroonian': '🇨🇲',
  // Canada
  'canada': '🇨🇦', 'canadian': '🇨🇦',
  // Cape Verde
  'cape verde': '🇨🇻', 'cape verdean': '🇨🇻',
  // Chile
  'chile': '🇨🇱', 'chilean': '🇨🇱',
  // China
  'china': '🇨🇳', 'chinese': '🇨🇳',
  // Colombia
  'colombia': '🇨🇴', 'colombian': '🇨🇴',
  // Congo
  'congo': '🇨🇬', 'congolese': '🇨🇩',
  'democratic republic of congo': '🇨🇩', 'dr congo': '🇨🇩',
  'republic of congo': '🇨🇬',
  // Costa Rica
  'costa rica': '🇨🇷', 'costa rican': '🇨🇷',
  // Croatia
  'croatia': '🇭🇷', 'croatian': '🇭🇷',
  // Cuba
  'cuba': '🇨🇺', 'cuban': '🇨🇺',
  // Czech Republic / Czechia
  'czech republic': '🇨🇿', 'czechia': '🇨🇿', 'czech': '🇨🇿',
  // Denmark
  'denmark': '🇩🇰', 'danish': '🇩🇰',
  // Ecuador
  'ecuador': '🇪🇨', 'ecuadorian': '🇪🇨', 'ecuadoran': '🇪🇨',
  // Egypt
  'egypt': '🇪🇬', 'egyptian': '🇪🇬',
  // England
  'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'english': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  // Eritrea
  'eritrea': '🇪🇷', 'eritrean': '🇪🇷',
  // Ethiopia
  'ethiopia': '🇪🇹', 'ethiopian': '🇪🇹',
  // Finland
  'finland': '🇫🇮', 'finnish': '🇫🇮',
  // France
  'france': '🇫🇷', 'french': '🇫🇷',
  // Gabon
  'gabon': '🇬🇦', 'gabonese': '🇬🇦',
  // Gambia
  'gambia': '🇬🇲', 'gambian': '🇬🇲', 'the gambia': '🇬🇲',
  // Georgia
  'georgia': '🇬🇪', 'georgian': '🇬🇪',
  // Germany
  'germany': '🇩🇪', 'german': '🇩🇪',
  // Ghana
  'ghana': '🇬🇭', 'ghanaian': '🇬🇭',
  // Greece
  'greece': '🇬🇷', 'greek': '🇬🇷',
  // Guatemala
  'guatemala': '🇬🇹', 'guatemalan': '🇬🇹',
  // Guinea
  'guinea': '🇬🇳', 'guinean': '🇬🇳',
  // Honduras
  'honduras': '🇭🇳', 'honduran': '🇭🇳',
  // Hungary
  'hungary': '🇭🇺', 'hungarian': '🇭🇺',
  // Iceland
  'iceland': '🇮🇸', 'icelandic': '🇮🇸',
  // Iran
  'iran': '🇮🇷', 'iranian': '🇮🇷',
  // Iraq
  'iraq': '🇮🇶', 'iraqi': '🇮🇶',
  // Ireland
  'ireland': '🇮🇪', 'irish': '🇮🇪', 'republic of ireland': '🇮🇪',
  // Israel
  'israel': '🇮🇱', 'israeli': '🇮🇱',
  // Italy
  'italy': '🇮🇹', 'italian': '🇮🇹',
  // Ivory Coast
  'ivory coast': '🇨🇮', 'ivorian': '🇨🇮', "cote d'ivoire": '🇨🇮', 'côte d\'ivoire': '🇨🇮',
  // Jamaica
  'jamaica': '🇯🇲', 'jamaican': '🇯🇲',
  // Japan
  'japan': '🇯🇵', 'japanese': '🇯🇵',
  // Jordan
  'jordan': '🇯🇴', 'jordanian': '🇯🇴',
  // Kenya
  'kenya': '🇰🇪', 'kenyan': '🇰🇪',
  // Kosovo
  'kosovo': '🇽🇰', 'kosovan': '🇽🇰',
  // Kuwait
  'kuwait': '🇰🇼', 'kuwaiti': '🇰🇼',
  // Lebanon
  'lebanon': '🇱🇧', 'lebanese': '🇱🇧',
  // Liberia
  'liberia': '🇱🇷', 'liberian': '🇱🇷',
  // Libya
  'libya': '🇱🇾', 'libyan': '🇱🇾',
  // Lithuania
  'lithuania': '🇱🇹', 'lithuanian': '🇱🇹',
  // Luxembourg
  'luxembourg': '🇱🇺', 'luxembourgish': '🇱🇺',
  // Mali
  'mali': '🇲🇱', 'malian': '🇲🇱',
  // Malta
  'malta': '🇲🇹', 'maltese': '🇲🇹',
  // Mexico
  'mexico': '🇲🇽', 'mexican': '🇲🇽',
  // Moldova
  'moldova': '🇲🇩', 'moldovan': '🇲🇩',
  // Montenegro
  'montenegro': '🇲🇪', 'montenegrin': '🇲🇪',
  // Morocco
  'morocco': '🇲🇦', 'moroccan': '🇲🇦',
  // Mozambique
  'mozambique': '🇲🇿', 'mozambican': '🇲🇿',
  // Namibia
  'namibia': '🇳🇦', 'namibian': '🇳🇦',
  // Netherlands
  'netherlands': '🇳🇱', 'dutch': '🇳🇱', 'holland': '🇳🇱',
  // New Zealand
  'new zealand': '🇳🇿', 'new zealander': '🇳🇿',
  // Nigeria
  'nigeria': '🇳🇬', 'nigerian': '🇳🇬',
  // Northern Ireland
  'northern ireland': '🇬🇧', 'northern irish': '🇬🇧',
  // North Macedonia
  'north macedonia': '🇲🇰', 'macedonian': '🇲🇰', 'macedonia': '🇲🇰',
  // Norway
  'norway': '🇳🇴', 'norwegian': '🇳🇴',
  // Panama
  'panama': '🇵🇦', 'panamanian': '🇵🇦',
  // Paraguay
  'paraguay': '🇵🇾', 'paraguayan': '🇵🇾',
  // Peru
  'peru': '🇵🇪', 'peruvian': '🇵🇪',
  // Poland
  'poland': '🇵🇱', 'polish': '🇵🇱',
  // Portugal
  'portugal': '🇵🇹', 'portuguese': '🇵🇹',
  // Romania
  'romania': '🇷🇴', 'romanian': '🇷🇴',
  // Russia
  'russia': '🇷🇺', 'russian': '🇷🇺',
  // Rwanda
  'rwanda': '🇷🇼', 'rwandan': '🇷🇼',
  // Saudi Arabia
  'saudi arabia': '🇸🇦', 'saudi': '🇸🇦', 'saudi arabian': '🇸🇦',
  // Scotland
  'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'scottish': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Senegal
  'senegal': '🇸🇳', 'senegalese': '🇸🇳',
  // Serbia
  'serbia': '🇷🇸', 'serbian': '🇷🇸',
  // Sierra Leone
  'sierra leone': '🇸🇱', 'sierra leonean': '🇸🇱',
  // Slovakia
  'slovakia': '🇸🇰', 'slovakian': '🇸🇰', 'slovak': '🇸🇰',
  // Slovenia
  'slovenia': '🇸🇮', 'slovenian': '🇸🇮',
  // Somalia
  'somalia': '🇸🇴', 'somali': '🇸🇴',
  // South Africa
  'south africa': '🇿🇦', 'south african': '🇿🇦',
  // South Korea
  'south korea': '🇰🇷', 'south korean': '🇰🇷', 'korea republic': '🇰🇷', 'korea': '🇰🇷',
  // Spain
  'spain': '🇪🇸', 'spanish': '🇪🇸',
  // Sweden
  'sweden': '🇸🇪', 'swedish': '🇸🇪',
  // Switzerland
  'switzerland': '🇨🇭', 'swiss': '🇨🇭',
  // Syria
  'syria': '🇸🇾', 'syrian': '🇸🇾',
  // Tanzania
  'tanzania': '🇹🇿', 'tanzanian': '🇹🇿',
  // Togo
  'togo': '🇹🇬', 'togolese': '🇹🇬',
  // Trinidad and Tobago
  'trinidad and tobago': '🇹🇹', 'trinidad': '🇹🇹', 'trinidadian': '🇹🇹', 'tobagonian': '🇹🇹',
  // Tunisia
  'tunisia': '🇹🇳', 'tunisian': '🇹🇳',
  // Turkey
  'turkey': '🇹🇷', 'turkish': '🇹🇷', 'türkiye': '🇹🇷',
  // Uganda
  'uganda': '🇺🇬', 'ugandan': '🇺🇬',
  // Ukraine
  'ukraine': '🇺🇦', 'ukrainian': '🇺🇦',
  // United States
  'united states': '🇺🇸', 'usa': '🇺🇸', 'american': '🇺🇸', 'us': '🇺🇸',
  // Uruguay
  'uruguay': '🇺🇾', 'uruguayan': '🇺🇾',
  // Venezuela
  'venezuela': '🇻🇪', 'venezuelan': '🇻🇪',
  // Wales
  'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'welsh': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  // Zambia
  'zambia': '🇿🇲', 'zambian': '🇿🇲',
  // Zimbabwe
  'zimbabwe': '🇿🇼', 'zimbabwean': '🇿🇼',

  // ── Transfermarkt naming variants → existing flags ──────────────────────
  'bosnia-herzegovina': '🇧🇦',
  'korea, south': '🇰🇷', 'korea south': '🇰🇷', 'republic of korea': '🇰🇷',
  'korea, north': '🇰🇵', 'north korea': '🇰🇵',
  'democratic republic of the congo': '🇨🇩',
  "people's republic of china": '🇨🇳',
  'hongkong': '🇭🇰', 'hong kong': '🇭🇰',
  'united kingdom': '🇬🇧', 'great britain': '🇬🇧',
  'united arab emirates': '🇦🇪', 'uae': '🇦🇪', 'emirati': '🇦🇪',

  // ── Historical states → present-day successor flag ──────────────────────
  'west germany': '🇩🇪', 'german democratic republic': '🇩🇪', 'east germany': '🇩🇪',
  'soviet union': '🇷🇺', 'ussr': '🇷🇺', 'commonwealth of independent states': '🇷🇺', 'cis': '🇷🇺',
  'czechoslovakia': '🇨🇿', 'cssr': '🇨🇿',
  'yugoslavia': '🇷🇸', 'jugoslawien (sfr)': '🇷🇸', 'socialist federal republic of yugoslavia': '🇷🇸',
  'federal republic of yugoslavia': '🇷🇸', 'serbia and montenegro': '🇷🇸',

  // ── Overseas territories → own flag where one exists ────────────────────
  'martinique': '🇲🇶', 'guadeloupe': '🇬🇵', 'french guiana': '🇬🇫', 'new caledonia': '🇳🇨',
  'saint-martin': '🇲🇫', 'tahiti': '🇵🇫', 'french polynesia': '🇵🇫',
  'curacao': '🇨🇼', 'curaçao': '🇨🇼', 'puerto rico': '🇵🇷', 'bermuda': '🇧🇲',
  'montserrat': '🇲🇸', 'gibraltar': '🇬🇮',

  // ── Missing sovereign nations ───────────────────────────────────────────
  'belarus': '🇧🇾', 'belarusian': '🇧🇾', 'cyprus': '🇨🇾', 'cypriot': '🇨🇾',
  'latvia': '🇱🇻', 'latvian': '🇱🇻', 'estonia': '🇪🇪', 'estonian': '🇪🇪',
  'kazakhstan': '🇰🇿', 'kazakh': '🇰🇿', 'uzbekistan': '🇺🇿', 'uzbek': '🇺🇿',
  'guinea-bissau': '🇬🇼', 'benin': '🇧🇯', 'beninese': '🇧🇯', 'haiti': '🇭🇹', 'haitian': '🇭🇹',
  'comoros': '🇰🇲', 'madagascar': '🇲🇬', 'malagasy': '🇲🇬', 'suriname': '🇸🇷', 'surinamese': '🇸🇷',
  'mauritania': '🇲🇷', 'mauritanian': '🇲🇷', 'equatorial guinea': '🇬🇶',
  'central african republic': '🇨🇫', 'dominican republic': '🇩🇴', 'chad': '🇹🇩',
  'philippines': '🇵🇭', 'filipino': '🇵🇭', 'niger': '🇳🇪', 'indonesia': '🇮🇩', 'indonesian': '🇮🇩',
  'qatar': '🇶🇦', 'qatari': '🇶🇦', 'andorra': '🇦🇩', 'monaco': '🇲🇨', 'thailand': '🇹🇭', 'thai': '🇹🇭',
  'mauritius': '🇲🇺', 'barbados': '🇧🇧', 'antigua and barbuda': '🇦🇬', 'guyana': '🇬🇾',
  'faroe islands': '🇫🇴', 'liechtenstein': '🇱🇮', 'el salvador': '🇸🇻', 'salvadoran': '🇸🇻',
  'malaysia': '🇲🇾', 'malaysian': '🇲🇾', 'grenada': '🇬🇩', 'san marino': '🇸🇲',
  'seychelles': '🇸🇨', 'st. kitts & nevis': '🇰🇳', 'saint kitts and nevis': '🇰🇳',
  'india': '🇮🇳', 'indian': '🇮🇳', 'pakistan': '🇵🇰', 'pakistani': '🇵🇰', 'bangladesh': '🇧🇩',
  'laos': '🇱🇦', 'cambodia': '🇰🇭', 'malawi': '🇲🇼', 'oman': '🇴🇲', 'omani': '🇴🇲',
  'jersey': '🇯🇪', 'aruba': '🇦🇼', 'tajikistan': '🇹🇯', 'palestine': '🇵🇸', 'palestinian': '🇵🇸',
  'kyrgyzstan': '🇰🇬', 'reunion': '🇷🇪', 'réunion': '🇷🇪', 'republic of the congo': '🇨🇬',
  'kingdom of the netherlands': '🇳🇱',
}

export function getFlagFromNationality(nationality) {
  if (!nationality) return '🌍'
  return FLAGS[nationality.trim().toLowerCase()] ?? '🌍'
}

export function formatDOB(dateStr) {
  if (!dateStr || dateStr === '0000-00-00') return null
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const [year, month, day] = parts
  const m = parseInt(month, 10)
  if (m < 1 || m > 12) return year
  return `${parseInt(day, 10)} ${months[m - 1]} ${year}`
}

export function normalizeName(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
