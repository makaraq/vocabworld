// Language configuration for Sprind
// Database supports 112 languages for vocabulary translations
// Audio (B2/TTS) supports 50 languages

// All languages in database for translations
const CURRENT_93_LANGUAGES = [
  'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'br', 'bs', 'ca', 
  'co', 'cs', 'cy', 'da', 'de', 'el', 'eo', 'es', 'et', 'eu', 
  'fa', 'fi', 'fo', 'fr', 'ga', 'gd', 'gu', 'ha', 'he', 'hi', 
  'hr', 'hu', 'id', 'ig', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 
  'km', 'kn', 'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 
  'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 
  'or', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'rw', 'sa', 'si', 
  'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 
  'tg', 'th', 'tk', 'tl', 'tr', 'uk', 'ur', 'uz', 'vi', 'xh', 
  'yo', 'zh', 'zu'
];

// Additional languages in database
const ADDITIONAL_19_LANGUAGES = [
  'ab', 'ay', 'ba', 'bm', 'dv', 'ee', 'fj', 'fy', 'gl', 'gn', 
  'ht', 'ia', 'ie', 'ik', 'io', 'ku', 'mi', 'na', 'ny'
];

const ALL_112_LANGUAGES = [...CURRENT_93_LANGUAGES, ...ADDITIONAL_19_LANGUAGES];

// 50 languages with audio support (B2 bucket)
const AUDIO_SUPPORTED_LANGUAGES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en',
  'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi',
  'hr', 'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk',
  'ml', 'mr', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk',
  'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

const LANGUAGE_NAMES = {
  'af': 'Afrikaans', 'am': 'Amharic', 'ar': 'Arabic', 'az': 'Azerbaijani',
  'be': 'Belarusian', 'bg': 'Bulgarian', 'bn': 'Bengali', 'br': 'Breton',
  'bs': 'Bosnian', 'ca': 'Catalan', 'co': 'Corsican', 'cs': 'Czech',
  'cy': 'Welsh', 'da': 'Danish', 'de': 'German', 'el': 'Greek',
  'eo': 'Esperanto', 'es': 'Spanish', 'et': 'Estonian', 'eu': 'Basque',
  'fa': 'Persian', 'fi': 'Finnish', 'fo': 'Faroese', 'fr': 'French',
  'ga': 'Irish', 'gd': 'Scottish Gaelic', 'gu': 'Gujarati', 'ha': 'Hausa',
  'he': 'Hebrew', 'hi': 'Hindi', 'hr': 'Croatian', 'hu': 'Hungarian',
  'id': 'Indonesian', 'ig': 'Igbo', 'is': 'Icelandic', 'it': 'Italian',
  'ja': 'Japanese', 'jv': 'Javanese', 'ka': 'Georgian', 'kk': 'Kazakh',
  'km': 'Khmer', 'kn': 'Kannada', 'ko': 'Korean', 'ky': 'Kyrgyz',
  'la': 'Latin', 'lb': 'Luxembourgish', 'lo': 'Lao', 'lt': 'Lithuanian',
  'lv': 'Latvian', 'mg': 'Malagasy', 'mk': 'Macedonian', 'ml': 'Malayalam',
  'mn': 'Mongolian', 'mr': 'Marathi', 'ms': 'Malay', 'mt': 'Maltese',
  'my': 'Myanmar', 'ne': 'Nepali', 'nl': 'Dutch', 'no': 'Norwegian',
  'or': 'Odia', 'pa': 'Punjabi', 'pl': 'Polish', 'ps': 'Pashto',
  'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'rw': 'Kinyarwanda',
  'sa': 'Sanskrit', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian',
  'sn': 'Shona', 'so': 'Somali', 'sq': 'Albanian', 'sr': 'Serbian',
  'sv': 'Swedish', 'sw': 'Swahili', 'ta': 'Tamil', 'te': 'Telugu',
  'tg': 'Tajik', 'th': 'Thai', 'tk': 'Turkmen', 'tl': 'Filipino',
  'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu', 'uz': 'Uzbek',
  'vi': 'Vietnamese', 'xh': 'Xhosa', 'yo': 'Yoruba', 'zh': 'Chinese',
  'zu': 'Zulu',
  // Additional 19 languages
  'ab': 'Abkhaz', 'ay': 'Aymara', 'ba': 'Bashkir', 'bm': 'Bambara',
  'dv': 'Divehi', 'ee': 'Ewe', 'fj': 'Fijian', 'fy': 'Frisian',
  'gl': 'Galician', 'gn': 'Guarani', 'ht': 'Haitian Creole', 'ia': 'Interlingua',
  'ie': 'Interlingue', 'ik': 'Inupiaq', 'io': 'Ido', 'ku': 'Kurdish',
  'mi': 'Maori', 'na': 'Nauru', 'ny': 'Chichewa'
};

module.exports = {
  CURRENT_93_LANGUAGES,
  ADDITIONAL_19_LANGUAGES,
  ALL_112_LANGUAGES,
  AUDIO_SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES
};
