/**
 * Verify all our languages are supported by Google Cloud TTS
 */

// Our 47 languages
const ourLanguages = {
  ar: 'ar-EG',      // Arabic (Egypt)
  bg: 'bg-BG',      // Bulgarian
  bn: 'bn-BD',      // Bangla (Bangladesh)
  ca: 'ca-ES',      // Catalan (Spain)
  cs: 'cs-CZ',      // Czech
  da: 'da-DK',      // Danish
  de: 'de-DE',      // German
  el: 'el-GR',      // Greek
  en: 'en-US',      // English (United States)
  es: 'es-ES',      // Spanish (Spain)
  et: 'et-EE',      // Estonian
  eu: 'eu-ES',      // Basque (Spain)
  fi: 'fi-FI',      // Finnish
  fr: 'fr-FR',      // French (France)
  gu: 'gu-IN',      // Gujarati (India)
  he: 'he-IL',      // Hebrew
  hi: 'hi-IN',      // Hindi (India)
  hr: 'hr-HR',      // Croatian
  hu: 'hu-HU',      // Hungarian
  id: 'id-ID',      // Indonesian
  is: 'is-IS',      // Icelandic
  it: 'it-IT',      // Italian
  ja: 'ja-JP',      // Japanese
  ko: 'ko-KR',      // Korean
  lt: 'lt-LT',      // Lithuanian
  lv: 'lv-LV',      // Latvian
  ml: 'ml-IN',      // Malayalam (India)
  mr: 'mr-IN',      // Marathi (India)
  nl: 'nl-NL',      // Dutch (Netherlands)
  no: 'nb-NO',      // Norwegian Bokmål
  pl: 'pl-PL',      // Polish
  pt: 'pt-PT',      // Portuguese (Portugal)
  ro: 'ro-RO',      // Romanian
  ru: 'ru-RU',      // Russian
  sk: 'sk-SK',      // Slovak
  sl: 'sl-SI',      // Slovenian
  sq: 'sq-AL',      // Albanian
  sr: 'sr-RS',      // Serbian
  sv: 'sv-SE',      // Swedish
  ta: 'ta-IN',      // Tamil (India)
  te: 'te-IN',      // Telugu (India)
  th: 'th-TH',      // Thai
  tr: 'tr-TR',      // Turkish
  uk: 'uk-UA',      // Ukrainian
  ur: 'ur-PK',      // Urdu (Pakistan)
  vi: 'vi-VN',      // Vietnamese
  zh: 'cmn-CN'      // Chinese Mandarin (China)
};

// Google Cloud TTS supported languages (from official docs)
const googleTTSSupported = [
  // GA (Generally Available)
  'ar-EG', 'bn-BD', 'nl-NL', 'en-IN', 'en-US', 'fr-FR', 'de-DE', 'hi-IN',
  'id-ID', 'it-IT', 'ja-JP', 'ko-KR', 'mr-IN', 'pl-PL', 'pt-BR', 'ro-RO',
  'ru-RU', 'es-ES', 'ta-IN', 'te-IN', 'th-TH', 'tr-TR', 'uk-UA', 'vi-VN',
  
  // Preview
  'af-ZA', 'sq-AL', 'am-ET', 'ar-001', 'hy-AM', 'az-AZ', 'eu-ES', 'be-BY',
  'bg-BG', 'my-MM', 'ca-ES', 'ceb-PH', 'cmn-CN', 'cmn-tw', 'hr-HR', 'cs-CZ',
  'da-DK', 'en-AU', 'en-GB', 'et-EE', 'fil-PH', 'fi-FI', 'fr-CA', 'gl-ES',
  'ka-GE', 'el-GR', 'gu-IN', 'ht-HT', 'he-IL', 'hu-HU', 'is-IS', 'jv-JV',
  'kn-IN', 'kok-IN', 'lo-LA', 'la-VA', 'lv-LV', 'lt-LT', 'lb-LU', 'mk-MK',
  'mai-IN', 'mg-MG', 'ms-MY', 'ml-IN', 'mn-MN', 'ne-NP', 'nb-NO', 'nn-NO',
  'or-IN', 'ps-AF', 'fa-IR', 'pt-PT', 'pa-IN', 'sr-RS', 'sd-IN', 'si-LK',
  'sk-SK', 'sl-SI', 'es-419', 'es-MX', 'sw-KE', 'sv-SE', 'ur-PK'
];

console.log('🔍 Verifying TTS Language Support\n');
console.log('=' .repeat(60));

let allSupported = true;
const unsupported = [];

Object.entries(ourLanguages).forEach(([code, ttsCode]) => {
  const isSupported = googleTTSSupported.includes(ttsCode);
  if (isSupported) {
    console.log(`✅ ${code.padEnd(4)} → ${ttsCode.padEnd(8)} SUPPORTED`);
  } else {
    console.log(`❌ ${code.padEnd(4)} → ${ttsCode.padEnd(8)} NOT SUPPORTED`);
    unsupported.push({ code, ttsCode });
    allSupported = false;
  }
});

console.log('=' .repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Total languages: ${Object.keys(ourLanguages).length}`);
console.log(`   Supported: ${Object.keys(ourLanguages).length - unsupported.length}`);
console.log(`   Unsupported: ${unsupported.length}`);

if (allSupported) {
  console.log('\n✅ All languages are supported by Google Cloud TTS!');
} else {
  console.log('\n❌ Some languages are NOT supported:');
  unsupported.forEach(({ code, ttsCode }) => {
    console.log(`   - ${code} (${ttsCode})`);
  });
}
