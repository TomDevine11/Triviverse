// Earshot's clip bank — which recording to try for each puzzle, in order of
// preference. scripts/geography/build-voices.mjs takes the first candidate that
// passes every check (licence, language ID, speech density, no giveaway words).
//
//   lang     id in src/geography/data/languages.js (the answer)
//   try      candidates, best first:
//              { commons: 'File name.webm', variety?, skip? }
//                Wikimedia Commons — mostly Wikitongues oral histories: unscripted
//                speech, CC BY-SA 4.0 / CC BY 3.0 / CC0. `skip` = seconds of intro
//                never to use (the window search starts after it).
//              { fleurs: 'ja_jp', variety? }
//                Google FLEURS (CC BY 4.0) — native speakers reading Wikipedia-style
//                sentences, so it's scripted; used where Commons has no clean
//                conversational recording. Only a few dev-split utterances are
//                downloaded, one by one.
//              { commons, read: true } — a Spoken Wikipedia recording (read aloud,
//                CC BY-SA); `skip` passes its spoken introduction.
//   variety  shown on the reveal when the clip is a named variety ("Québec French")
//
// To add a puzzle: append an entry, run `npm run build:voices`, listen to the new
// clip (`--sheet` lists them), commit the manifest + mp3.

const C = (commons, extra = {}) => ({ commons, ...extra })
const F = (fleurs, extra = {}) => ({ fleurs, ...extra })
const W = { read: true, skip: 30 } // Spoken Wikipedia: read aloud, past the spoken intro

export const VOICES = [
  // Europe — big languages
  { lang: 'english', try: [C('WIKITONGUES- Mckensie speaking English.webm'), F('en_us')] },
  { lang: 'spanish', try: [C('WIKITONGUES- David speaking Spanish.webm'), C('WIKITONGUES- Regina speaking Spanish.webm'), C('WIKITONGUES- Andrea speaking Spanish.webm'), F('es_419', { variety: 'Latin American Spanish' })] },
  { lang: 'french', try: [C('WIKITONGUES- Clara speaking French.webm'), F('fr_fr')] },
  { lang: 'french', try: [C('WIKITONGUES- Maxime speaking Québecois French.webm', { variety: 'Québec French' })] },
  { lang: 'german', try: [C('WIKITONGUES- Gereon speaking German.webm'), F('de_de')] },
  { lang: 'italian', try: [C('WIKITONGUES- Pau speaking French, Lithuanian, Italian, English, Spanish, and Catalan.webm'), C('Itwiki-Albena Denkova.ogg', W), C('It-argentina-article.ogg', W), F('it_it')] },
  { lang: 'portuguese', try: [C('WIKITONGUES- Sara speaking Portuguese.webm'), C('WIKITONGUES- Freddie speaking Portuguese.webm'), F('pt_br', { variety: 'Brazilian Portuguese' })] },
  { lang: 'russian', try: [C('WIKITONGUES- Amir speaking Russian and Hebrew.webm'), F('ru_ru')] },
  { lang: 'dutch', try: [C('WIKITONGUES- Eva speaking Dutch.webm'), F('nl_nl')] },
  { lang: 'polish', try: [C('WIKITONGUES- Marta speaking Polish.webm'), C('WIKITONGUES- Marta Speaking Polish.webm'), F('pl_pl')] },
  { lang: 'ukrainian', try: [C('WIKITONGUES- Vira speaking Ukrainian.webm'), F('uk_ua')] },
  { lang: 'romanian', try: [C('WIKITONGUES- Raluca speaking Romanian.webm'), F('ro_ro')] },
  { lang: 'greek', try: [C('WIKITONGUES- Kostas speaking Greek.webm'), C('WIKITONGUES- Ioanna speaking Greek.webm'), F('el_gr')] },
  { lang: 'swedish', try: [C('Johanna SjöbergOlson Swe.webm'), F('sv_se')] },
  { lang: 'norwegian', try: [C('WIKITONGUES- Emily speaking Norwegian.webm'), F('nb_no')] },
  { lang: 'danish', try: [F('da_dk')] },
  { lang: 'finnish', try: [C('WIKITONGUES- Jenni speaking Finnish.webm'), F('fi_fi')] },
  { lang: 'hungarian', try: [C('WIKITONGUES- Orsolya speaking Hungarian.webm'), C('WIKITONGUES- Norbert speaking Hungarian.webm'), F('hu_hu')] },
  { lang: 'czech', try: [F('cs_cz')] },
  { lang: 'slovak', try: [F('sk_sk')] },
  { lang: 'turkish', try: [C('WIKITONGUES- Ela speaking Turkish.webm'), F('tr_tr'), C('Tr-Haçkar-article.ogg', W), C('Tr-Kayıp Cennet-article.ogg', W)] },

  // Europe — smaller and regional languages
  { lang: 'catalan', try: [C('WIKITONGUES- Guillem speaking Catalan.webm'), C('WIKITONGUES- Artur speaking Catalan.webm'), F('ca_es')] },
  { lang: 'basque', try: [C('WIKITONGUES- Iñaki speaking Basque.webm'), C('WIKITONGUES- Jon speaking Basque.webm')] },
  { lang: 'galician', try: [F('gl_es')] },
  { lang: 'welsh', try: [C('WIKITONGUES- Sandra speaking Welsh.webm'), F('cy_gb')] },
  { lang: 'irish', try: [F('ga_ie')] },
  { lang: 'scottish-gaelic', try: [C('WIKITONGUES- Iain speaking Scottish Gaelic.webm'), C('WIKITONGUES- Rosemary speaking Scottish Gaelic.webm')] },
  { lang: 'breton', try: [C('WIKITONGUES- Jean Luc speaking Breton.webm'), C('WIKITONGUES- Wayne speaking Breton.webm')] },
  { lang: 'icelandic', try: [C('WIKITONGUES- Ljóni speaking Icelandic.webm'), F('is_is')] },
  { lang: 'luxembourgish', try: [C('WIKITONGUES- Mark speaking Luxembourgish.webm'), F('lb_lu')] },
  { lang: 'maltese', try: [C('WIKITONGUES- Keith speaking Maltese.webm'), F('mt_mt')] },
  { lang: 'estonian', try: [C('WIKITONGUES- Liisi speaking Estonian.webm'), F('et_ee')] },
  { lang: 'latvian', try: [C('WIKITONGUES- Jānis speaking Latvian.webm'), F('lv_lv')] },
  { lang: 'lithuanian', try: [C('WIKITONGUES- Erika speaking Lithuanian.webm'), F('lt_lt')] },
  { lang: 'belarusian', try: [C('WIKITONGUES- Uladzislau speaking Belarusian.webm'), F('be_by')] },
  { lang: 'bulgarian', try: [F('bg_bg')] },
  { lang: 'serbian', try: [F('sr_rs')] },
  { lang: 'croatian', try: [F('hr_hr')] },
  { lang: 'bosnian', try: [C('WIKITONGUES- Mirela speaking Bosnian.webm'), F('bs_ba')] },
  { lang: 'slovenian', try: [F('sl_si')] },
  { lang: 'macedonian', try: [F('mk_mk')] },
  { lang: 'occitan', try: [F('oc_fr'), C('Gerard And Partick Speak Vivaro-Alpine Occitan.webm', { variety: 'Vivaro-Alpine Occitan' })] },
  { lang: 'yiddish', try: [C('WIKITONGUES- Suri speaking Yiddish.webm'), C('WIKITONGUES- Matt speaking Yiddish.webm')] },
  { lang: 'afrikaans', try: [C('WIKITONGUES- Alaric speaking Afrikaans.webm'), C('WIKITONGUES- Roussow speaking Afrikaans.webm'), F('af_za')] },

  // Middle East, Caucasus, Central Asia
  { lang: 'arabic', try: [C('WIKITONGUES- David speaking Syrian Arabic.webm', { variety: 'Levantine (Syrian) Arabic' }), C('WIKITONGUES- Mahmoud speaking Iraqi Arabic.webm', { variety: 'Iraqi Arabic' })] },
  { lang: 'arabic', try: [F('ar_eg', { variety: 'Modern Standard Arabic' })] },
  { lang: 'hebrew', try: [C('WIKITONGUES- Amir speaking Russian and Hebrew.webm'), F('he_il')] },
  { lang: 'persian', try: [C('WIKITONGUES- Daniel speaking Farsi.webm'), C('Seke bahare azadi.ogg', W), C('Iran-fa1.ogg', W)] },
  { lang: 'pashto', try: [F('ps_af'), C('Zaeem speaking Pashto.MTS.webm')] },
  { lang: 'kurdish', try: [F('ckb_iq', { variety: 'Sorani Kurdish' }), C('WIKITONGUES- Mohamad speaking Kurdish.webm')] },
  { lang: 'armenian', try: [C('WIKITONGUES- John speaking Armenian.webm'), F('hy_am')] },
  { lang: 'georgian', try: [C('WIKITONGUES- Mariam speaking Georgian.webm'), F('ka_ge')] },
  { lang: 'azerbaijani', try: [C('WIKITONGUES- Two Azerbaijani users speaking Azerbaijani.webm'), F('az_az')] },
  { lang: 'kazakh', try: [C('WIKITONGUES- Mereinur speaking Kazakh.webm'), C('WIKITONGUES- Yernur speaking Kazakh.webm'), F('kk_kz')] },
  { lang: 'uzbek', try: [F('uz_uz'), C('WIKITONGUES- Jamal speaking Uzbek.webm')] },
  { lang: 'kyrgyz', try: [F('ky_kg'), C('WIKITONGUES- Azim speaking Kyrgyz.webm')] },
  { lang: 'tajik', try: [F('tg_tj'), C('WIKITONGUES- Zerovsho speaking Tajik.webm')] },
  { lang: 'mongolian', try: [C('WIKITONGUES- Khulan speaking Mongolian.webm'), F('mn_mn')] },

  // South Asia
  { lang: 'hindi', try: [C('WIKITONGUES Kavyanjali speaking Hindi.ogg'), C('WIKITONGUES- Krishna speaking Hindi.webm'), F('hi_in')] },
  { lang: 'urdu', try: [C('WIKITONGUES- Scarlett speaking Urdu.webm'), F('ur_pk')] },
  { lang: 'bengali', try: [C('WIKITONGUES- Hasive speaking Bengali.webm'), C('WIKITONGUES- Sanjoy speaking Bengali.webm'), F('bn_in')] },
  { lang: 'punjabi', try: [F('pa_in')] },
  { lang: 'marathi', try: [F('mr_in')] },
  { lang: 'gujarati', try: [F('gu_in')] },
  { lang: 'nepali', try: [C('Wikitongues- Safal speaking Nepali.webm'), F('ne_np')] },
  { lang: 'tamil', try: [C('WIKITONGUES- Sai speaking Tamil.webm'), C('WIKITONGUES- Marapun speaking Tamil.webm'), F('ta_in')] },
  { lang: 'telugu', try: [C('WIKITONGUES- Manjusha speaking Telugu.webm'), F('te_in')] },
  { lang: 'kannada', try: [C('WIKITONGUES- Kumudini speaking Kannada.webm'), F('kn_in')] },
  { lang: 'malayalam', try: [C('WIKITONGUES- Netha speaking Malayalam.webm'), F('ml_in')] },

  // East and Southeast Asia
  { lang: 'mandarin', try: [F('cmn_hans_cn'), C('Zh-Twitter.ogg', W), C('Zh-Plurk.ogg', W)] },
  { lang: 'cantonese', try: [F('yue_hant_hk')] },
  { lang: 'japanese', try: [F('ja_jp')] },
  { lang: 'korean', try: [C('WIKITONGUES- Hanbid speaking Korean.webm'), F('ko_kr')] },
  { lang: 'vietnamese', try: [F('vi_vn')] },
  { lang: 'thai', try: [C('WIKITONGUES- Tao speaking Thai.webm'), C('WIKITONGUES- Dang speaking Thai.webm'), F('th_th')] },
  { lang: 'lao', try: [C('WIKITONGUES- La speaking Lao.webm'), F('lo_la')] },
  { lang: 'khmer', try: [C('WIKITONGUES- Michael speaking Khmer.webm'), C('Chantara speaking Central Khmer.webm'), F('km_kh')] },
  { lang: 'burmese', try: [C('WIKITONGUES- Naw speaking Burmese.webm'), F('my_mm')] },
  { lang: 'indonesian', try: [C('WIKITONGUES- Nila speaking Indonesian.webm'), C('Neysa speaking Indonesian.webm'), F('id_id')] },
  { lang: 'malay', try: [C('WIKITONGUES- Senful speaking Malay.webm'), C('WIKITONGUES- Zairul speaking Malay.webm'), F('ms_my'), C('Dondang sayang-lisan.ogg', W)] },
  { lang: 'javanese', try: [C('WIKITONGUES- Cahyo speaking Javanese.webm'), F('jv_id')] },
  { lang: 'sundanese', try: [C('WIKITONGUES- Yusuf speaking Sundanese.webm')] },
  { lang: 'filipino', try: [C('WIKITONGUES- Karl speaking Filipino.webm'), C('WIKITONGUES- Josh speaking Tagalog.webm'), F('fil_ph')] },
  { lang: 'cebuano', try: [F('ceb_ph')] },
  { lang: 'maori', try: [F('mi_nz')] },

  // Africa
  { lang: 'swahili', try: [C('WIKITONGUES- Iddy speaking Swahili.webm'), F('sw_ke')] },
  { lang: 'amharic', try: [F('am_et')] },
  { lang: 'somali', try: [F('so_so')] },
  { lang: 'oromo', try: [F('om_et')] },
  { lang: 'hausa', try: [C('WIKITONGUES- Abubakar speaking Hausa.webm'), F('ha_ng')] },
  { lang: 'yoruba', try: [C('WIKITONGUES- Olaniyan speaking Yoruba.webm'), C('Alade 20211207 yor.ogg'), F('yo_ng')] },
  { lang: 'igbo', try: [F('ig_ng'), C('WIKITONGUES- Valentine speaking Igbo.webm'), C('Lucy speaking Igbo.webm')] },
  { lang: 'twi', try: [C('WIKITONGUES- Raphael speaking Twi.webm')] },
  { lang: 'wolof', try: [F('wo_sn'), C('WIKITONGUES- Aminah Abba speaking Wolof.webm')] },
  { lang: 'zulu', try: [F('zu_za')] },
  { lang: 'xhosa', try: [F('xh_za')] },
  { lang: 'shona', try: [F('sn_zw')] },
  { lang: 'lingala', try: [F('ln_cd')] },

  // The Americas, the Pacific, constructed
  { lang: 'quechua', try: [C('WIKITONGUES- Casiano speaking Quechua.webm')] },
  { lang: 'guarani', try: [C('WIKITONGUES- María speaking Guarani.webm')] },
  { lang: 'tok-pisin', try: [C('WIKITONGUES- Priscilla speaking Tok Pisin.webm')] },
  { lang: 'esperanto', try: [C('WIKITONGUES- Joshi speaking Esperanto.webm'), C('Stela Speaks Esperanto.webm')] },
  { lang: 'haitian-creole', try: [C('WIKITONGUES- Castelline speaking Haitian Creole.webm')] },
]
