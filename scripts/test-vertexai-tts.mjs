/**
 * Test Vertex AI TTS for 47 languages with 1 sample phrase
 * 
 * Prerequisites:
 * - Enable Cloud Text-to-Speech API in Google Cloud Console
 * - Set GOOGLE_APPLICATION_CREDENTIALS to vertexoc-512bc32c2629.json
 * 
 * Usage: node scripts/test-vertexai-tts.mjs
 */

import { createClient } from '@supabase/supabase-js';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Language code to Vertex AI TTS language code mapping (BCP-47)
const languageToTTSCode = {
  ar: 'ar-EG',      // Arabic (Egypt) - GA
  bg: 'bg-BG',      // Bulgarian - Preview
  bn: 'bn-BD',      // Bangla (Bangladesh) - GA
  ca: 'ca-ES',      // Catalan (Spain) - Preview
  cs: 'cs-CZ',      // Czech - Preview
  cy: null,         // Welsh - NOT SUPPORTED
  da: 'da-DK',      // Danish - Preview
  de: 'de-DE',      // German - GA
  el: 'el-GR',      // Greek - Preview
  en: 'en-US',      // English (United States) - GA
  es: 'es-ES',      // Spanish (Spain) - GA
  et: 'et-EE',      // Estonian - Preview
  eu: 'eu-ES',      // Basque (Spain) - Preview
  fa: 'fa-IR',      // Persian (Iran) - Preview
  fi: 'fi-FI',      // Finnish - Preview
  fr: 'fr-FR',      // French (France) - GA
  ga: null,         // Irish - NOT SUPPORTED
  gu: 'gu-IN',      // Gujarati (India) - Preview
  he: 'he-IL',      // Hebrew - Preview
  hi: 'hi-IN',      // Hindi (India) - GA
  hr: 'hr-HR',      // Croatian - Preview
  hu: 'hu-HU',      // Hungarian - Preview
  id: 'id-ID',      // Indonesian - GA
  is: 'is-IS',      // Icelandic - Preview
  it: 'it-IT',      // Italian - GA
  ja: 'ja-JP',      // Japanese - GA
  ko: 'ko-KR',      // Korean - GA
  lt: 'lt-LT',      // Lithuanian - Preview
  lv: 'lv-LV',      // Latvian - Preview
  mk: 'mk-MK',      // Macedonian - Preview
  ml: 'ml-IN',      // Malayalam (India) - Preview
  mr: 'mr-IN',      // Marathi (India) - GA
  mt: null,         // Maltese - NOT SUPPORTED
  nl: 'nl-NL',      // Dutch (Netherlands) - GA
  no: 'nb-NO',      // Norwegian Bokmål - Preview
  pl: 'pl-PL',      // Polish - GA
  pt: 'pt-PT',      // Portuguese (Portugal) - Preview
  ro: 'ro-RO',      // Romanian - GA
  ru: 'ru-RU',      // Russian - GA
  sk: 'sk-SK',      // Slovak - Preview
  sl: 'sl-SI',      // Slovenian - Preview
  sq: 'sq-AL',      // Albanian - Preview
  sr: 'sr-RS',      // Serbian - Preview
  sv: 'sv-SE',      // Swedish - Preview
  ta: 'ta-IN',      // Tamil (India) - GA
  te: 'te-IN',      // Telugu (India) - GA
  th: 'th-TH',      // Thai - GA
  tr: 'tr-TR',      // Turkish - GA
  uk: 'uk-UA',      // Ukrainian - GA
  ur: 'ur-PK',      // Urdu (Pakistan) - Preview
  vi: 'vi-VN',      // Vietnamese - GA
  zh: 'cmn-CN'      // Chinese Mandarin (China) - Preview
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize with explicit credentials path
const credentialsPath = path.join(process.cwd(), 'vertexoc-09f434d73abd.json');
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath
});

async function generateTTS(text, languageCode) {
  const ttsLanguageCode = languageToTTSCode[languageCode];
  if (!ttsLanguageCode) {
    return null;
  }
  
  const request = {
    input: { text },
    voice: { languageCode: ttsLanguageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 }
  };
  
  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    console.error(`   ❌ TTS error (${languageCode}):`, error.message);
    return null;
  }
}

async function main() {
  console.log('🎵 Testing Vertex AI TTS - 47 Languages');
  console.log('='.repeat(60));
  console.log();
  
  // Check credentials
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found:', credentialsPath);
    process.exit(1);
  }
  
  console.log('✅ Using credentials:', credentialsPath);
  console.log();
  
  // Get first Common Phrases word
  console.log('📚 Fetching first Common Phrases word...');
  const { data: vocabulary, error } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('learning_order', { ascending: true })
    .limit(1);
  
  if (error || !vocabulary || vocabulary.length === 0) {
    console.error('❌ Error fetching vocabulary:', error);
    process.exit(1);
  }
  
  const testWord = vocabulary[0];
  console.log(`✅ Test phrase: "${testWord.word_en}"\n`);
  
  // Get translations for all languages
  console.log('📚 Fetching translations...');
  const { data: translations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('language_code, translated_word')
    .eq('vocabulary_id', testWord.id);
  
  if (transError) {
    console.error('❌ Error fetching translations:', transError);
    process.exit(1);
  }
  
  const translationMap = {};
  translations.forEach(t => {
    translationMap[t.language_code] = t.translated_word;
  });
  
  console.log(`✅ Found ${translations.length} translations\n`);
  
  // Create output directory
  const outputDir = path.join(process.cwd(), 'scripts', 'test-audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate audio for all supported languages
  console.log('🎵 Generating audio files...\n');
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  // Always generate English first
  console.log('Generating English audio...');
  const englishAudio = await generateTTS(testWord.word_en, 'en');
  if (englishAudio) {
    const filename = path.join(outputDir, `en_${testWord.word_en.replace(/[^a-zA-Z0-9]/g, '_')}.wav`);
    fs.writeFileSync(filename, Buffer.from(englishAudio));
    results.success.push({ lang: 'en', text: testWord.word_en });
    console.log(`   ✅ en: "${testWord.word_en}"`);
  } else {
    results.failed.push({ lang: 'en', text: testWord.word_en });
    console.log(`   ❌ en: Failed`);
  }
  
  // Generate for all other languages
  const languages = Object.keys(languageToTTSCode).filter(l => l !== 'en').sort();
  
  for (const langCode of languages) {
    const ttsCode = languageToTTSCode[langCode];
    
    if (!ttsCode) {
      results.skipped.push(langCode);
      console.log(`   ⏭️  ${langCode}: Not supported by Vertex AI TTS`);
      continue;
    }
    
    const translation = translationMap[langCode];
    if (!translation) {
      results.skipped.push(langCode);
      console.log(`   ⏭️  ${langCode}: No translation in database`);
      continue;
    }
    
    const audioBuffer = await generateTTS(translation, langCode);
    
    if (audioBuffer) {
      const filename = path.join(outputDir, `${langCode}_${translation.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.wav`);
      fs.writeFileSync(filename, Buffer.from(audioBuffer));
      results.success.push({ lang: langCode, text: translation });
      console.log(`   ✅ ${langCode}: "${translation}"`);
    } else {
      results.failed.push({ lang: langCode, text: translation });
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${results.success.length} languages`);
  console.log(`   ❌ Failed: ${results.failed.length} languages`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length} languages`);
  console.log();
  console.log(`📁 Audio files saved to: ${outputDir}`);
  console.log();
  
  if (results.failed.length > 0) {
    console.log('❌ Failed languages:');
    results.failed.forEach(r => console.log(`   - ${r.lang}: "${r.text}"`));
    console.log();
  }
  
  if (results.skipped.length > 0) {
    console.log('⏭️  Skipped languages:');
    results.skipped.forEach(lang => console.log(`   - ${lang}`));
    console.log();
  }
  
  console.log('🎉 Test complete! Listen to the audio files to verify quality.');
  console.log();
  console.log('💡 If authentication failed, enable Cloud Text-to-Speech API at:');
  console.log('   https://console.cloud.google.com/apis/library/texttospeech.googleapis.com');
}

main().catch(console.error);
