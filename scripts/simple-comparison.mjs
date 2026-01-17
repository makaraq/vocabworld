/**
 * SIMPLE CLEAR COMPARISON - What's actually going on
 */

// Config file says these 50 languages have audio support
const CONFIG_AUDIO_LANGUAGES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en',
  'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi',
  'hr', 'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk',
  'ml', 'mr', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk',
  'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

// Audio generation script currently generates for these 47
const AUDIO_GEN_LANGUAGES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es',
  'et', 'eu', 'fi', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id',
  'is', 'it', 'ja', 'ko', 'lt', 'lv', 'ml', 'mr', 'nl', 'no',
  'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sv', 'ta',
  'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

console.log('═══════════════════════════════════════════════════════════\n');
console.log('SIMPLE TRUTH:\n');
console.log(`Config file claims:        50 languages have audio`);
console.log(`Generation script has:     47 languages`);
console.log(`Missing:                   3 languages\n`);
console.log('═══════════════════════════════════════════════════════════\n');

// What's in CONFIG but NOT in generation script?
const missingFromGen = CONFIG_AUDIO_LANGUAGES.filter(l => !AUDIO_GEN_LANGUAGES.includes(l));

console.log('❌ These 3 languages are CLAIMED in config but NOT generating:\n');
missingFromGen.forEach(lang => {
  const names = {
    'cy': 'Welsh',
    'fa': 'Persian', 
    'ga': 'Irish',
    'mk': 'Macedonian',
    'mt': 'Maltese'
  };
  console.log(`   ${lang} = ${names[lang]}`);
});

// What's in generation script but NOT in config?
const extraInGen = AUDIO_GEN_LANGUAGES.filter(l => !CONFIG_AUDIO_LANGUAGES.includes(l));

if (extraInGen.length > 0) {
  console.log('\n✅ These languages ARE in generation but NOT in config:\n');
  extraInGen.forEach(lang => {
    const names = { 'sq': 'Albanian', 'sr': 'Serbian' };
    console.log(`   ${lang} = ${names[lang]}`);
  });
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('\nTHE ACTUAL PROBLEM:');
console.log('\nThe config file lists 50 languages but we only generate 47.');
console.log('We need to either:');
console.log('  1. Add the 3 missing to generation (cy, fa, ga, mk, mt)');
console.log('  2. Remove them from the config file');
console.log('\nAlso: sq and sr are being generated but not in config!');
console.log('═══════════════════════════════════════════════════════════\n');
