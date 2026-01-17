/**
 * Compare config languages vs audio generation languages
 */

// 50 languages in config/languages.js
const configLanguages = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en',
  'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi',
  'hr', 'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk',
  'ml', 'mr', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk',
  'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

// 47 languages in audio generation scripts
const audioGenLanguages = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es',
  'et', 'eu', 'fi', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id',
  'is', 'it', 'ja', 'ko', 'lt', 'lv', 'ml', 'mr', 'nl', 'no',
  'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sv', 'ta',
  'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

console.log('📊 Language Comparison\n');
console.log('Config (languages.js): 50 languages');
console.log('Audio Generation: 47 languages');
console.log('Difference: ' + (configLanguages.length - audioGenLanguages.length) + ' languages\n');

// Find missing languages
const missing = configLanguages.filter(lang => !audioGenLanguages.includes(lang));

console.log('❌ Languages in CONFIG but NOT in AUDIO GENERATION:');
missing.forEach(lang => {
  const names = {
    'cy': 'Welsh',
    'fa': 'Persian/Farsi',
    'ga': 'Irish',
    'mk': 'Macedonian',
    'mt': 'Maltese',
    'sq': 'Albanian',
    'sr': 'Serbian'
  };
  console.log(`   - ${lang} (${names[lang] || 'Unknown'})`);
});

// Find extra languages
const extra = audioGenLanguages.filter(lang => !configLanguages.includes(lang));
if (extra.length > 0) {
  console.log('\n✅ Languages in AUDIO GENERATION but NOT in CONFIG:');
  extra.forEach(lang => {
    console.log(`   - ${lang}`);
  });
}

console.log(`\nTotal missing: ${missing.length}`);
