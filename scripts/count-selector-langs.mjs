// Count languages in the language selector

const selectorLanguages = {
  'ar': 'Arabic', 'bg': 'Bulgarian', 'bn': 'Bengali', 'ca': 'Catalan',
  'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish', 'de': 'German',
  'el': 'Greek', 'en': 'English', 'es': 'Spanish', 'et': 'Estonian',
  'eu': 'Basque', 'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French',
  'ga': 'Irish', 'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi',
  'hr': 'Croatian', 'hu': 'Hungarian', 'id': 'Indonesian', 'is': 'Icelandic',
  'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'lt': 'Lithuanian',
  'lv': 'Latvian', 'mk': 'Macedonian', 'ml': 'Malayalam', 'mr': 'Marathi',
  'mt': 'Maltese', 'nl': 'Dutch', 'no': 'Norwegian', 'pl': 'Polish',
  'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'sk': 'Slovak',
  'sl': 'Slovenian', 'sv': 'Swedish', 'ta': 'Tamil', 'te': 'Telugu',
  'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu',
  'vi': 'Vietnamese', 'zh': 'Chinese'
};

const codes = Object.keys(selectorLanguages);

console.log(`\n🌍 Language Selector has ${codes.length} languages\n`);
console.log(codes.sort().join(', '));
console.log('\n');
