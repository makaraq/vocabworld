/**
 * Generate TTS Audio for Common Phrases Topic
 * 
 * This script:
 * 1. Fetches all 794 Common Phrases vocabulary from database
 * 2. Generates audio using Google Cloud TTS for all 46 languages
 * 3. Uploads audio files to Backblaze B2
 * 4. Creates a CSV mapping file for the universal audio API
 * 
 * Prerequisites:
 * - npm install @google-cloud/text-to-speech
 * - Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * - Set B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY in .env.local
 * 
 * Usage: node scripts/generate-common-phrases-audio.mjs
 */

import { createClient } from '@supabase/supabase-js';
import textToSpeech from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Configuration
const TOPIC_ID = 42;
const TOPIC_FOLDER = 'CommonPhrases';
const OUTPUT_DIR = 'scripts/common-phrases-audio';

// Language code to Google TTS language code mapping (BCP-47)
// Based on official Google Cloud TTS supported languages
// Now includes all 47 languages with working TTS voices
const languageToTTSCode = {
  ar: 'ar-EG',      // Arabic (Egypt) - GA
  bg: 'bg-BG',      // Bulgarian - Preview
  bn: 'bn-BD',      // Bangla (Bangladesh) - GA
  ca: 'ca-ES',      // Catalan (Spain) - Preview
  cs: 'cs-CZ',      // Czech - Preview
  da: 'da-DK',      // Danish - Preview
  de: 'de-DE',      // German - GA
  el: 'el-GR',      // Greek - Preview
  en: 'en-US',      // English (United States) - GA
  es: 'es-ES',      // Spanish (Spain) - GA
  et: 'et-EE',      // Estonian - Preview
  eu: 'eu-ES',      // Basque (Spain) - Preview
  fi: 'fi-FI',      // Finnish - Preview
  fr: 'fr-FR',      // French (France) - GA
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
  ml: 'ml-IN',      // Malayalam (India) - Preview
  mr: 'mr-IN',      // Marathi (India) - GA
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

// Languages to generate audio for (47 languages with translations ready)
const AUDIO_LANGUAGES = Object.keys(languageToTTSCode);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize with explicit credentials path
const credentialsPath = path.join(process.cwd(), 'vertexoc-09f434d73abd.json');
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath
});

// File saving function
function saveAudioFile(audioBuffer, languageCode, sanitizedName) {
  const langDir = path.join(OUTPUT_DIR, TOPIC_FOLDER, languageCode);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }
  
  const fileName = `${sanitizedName}.wav`;
  const filePath = path.join(langDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(audioBuffer));
  
  return `${TOPIC_FOLDER}/${languageCode}/${fileName}`;
}

// TTS Generation
async function generateTTS(text, languageCode) {
  const ttsLanguageCode = languageToTTSCode[languageCode];
  if (!ttsLanguageCode) {
    console.log(`⚠️  No TTS mapping for language: ${languageCode}`);
    return null;
  }
  
  const request = {
    input: { text },
    voice: { 
      languageCode: ttsLanguageCode, 
      ssmlGender: languageCode === 'en' ? 'MALE' : 'FEMALE'
    },
    audioConfig: { 
      audioEncoding: 'LINEAR16', 
      sampleRateHertz: 24000,
      pitch: 0.0,
      speakingRate: 1.0
    }
  };
  
  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    console.error(`❌ TTS error for "${text}" (${languageCode}):`, error.message);
    return null;
  }
}

function sanitizeFilename(word) {
  // Remove or replace characters that might cause issues
  // Keep it simple: letters, numbers, hyphens
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
    .substring(0, 50);              // Limit length
}

async function main() {
  console.log('🎵 Common Phrases Audio Generation');
  console.log('='.repeat(60));
  console.log();
  
  // Check credentials file exists
  const credentialsPath = path.join(process.cwd(), 'vertexoc-09f434d73abd.json');
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found:', credentialsPath);
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log('📁 Output directory:', path.resolve(OUTPUT_DIR));
  console.log();onsole.log('✅ Using credentials:', credentialsPath);
  console.log();
  
  if (!B2_KEY_ID || !B2_APP_KEY) {
    console.error('❌ B2 credentials not found in .env.local');
    process.exit(1);
  }
  
  // Step 1: Get vocabulary from database
  console.log('📚 Fetching Common Phrases vocabulary...');
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order', { ascending: true });
  
  if (vocabError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', vocabError);
    process.exit(1);
  }
  
  console.log(`✅ Found ${vocabulary.length} phrases\n`);
  
  // Step 2: Get translations only for supported audio languages
  console.log('📚 Fetching translations for 47 supported languages...');
  const vocabIds = vocabulary.map(v => v.id);
  let allTranslations = [];
  
  for (let i = 0; i < vocabIds.length; i += 100) {
    const batchIds = vocabIds.slice(i, i + 100);
    let offset = 0;
    
    while (true) {
      const { data, error } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, language_code, translated_word')
        .in('vocabulary_id', batchIds)
        .in('language_code', AUDIO_LANGUAGES)  // Only get supported languages
        .range(offset, offset + 999);
      
      if (error) {
        console.error('❌ Error fetching translations:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allTranslations.push(...data);
      offset += 1000;
      
      if (data.length < 1000) break;
    }
    
    process.stdout.write(`\r   Fetched: ${allTranslations.length} translations...`);
  }
  
  console.log(`\r✅ Found ${allTranslations.length} translations (47 languages)\n`);
  
  // Group translations by vocabulary_id
  const translationsByVocab = {};
  allTranslations.forEach(t => {
    if (!translationsByVocab[t.vocabulary_id]) {
      translationsByVocab[t.vocabulary_id] = {};
    }
    translationsByVocab[t.vocabulary_id][t.language_code] = t.translated_word;
  });Generate and save audio locally
  
  // Step 4: Generate and upload audio
  console.log('🎵 Generating and uploading audio files...');
  console.log(`   Total files to generate: ${vocabulary.length} phrases × 46 languages = ${vocabulary.length * 46} files`);
  console.log();
  
  const csvMappings = [];
  let successCount = 0;
  let errorCount = 0;
  let uploadData = null;
  
  for (let i = 0; i < vocabulary.length; i++) {
    const vocab = vocabulary[i];
    const translations = translationsByVocab[vocab.id] || {};
  
  for (let i = 0; i < vocabulary.length; i++) {
    const vocab = vocabulary[i];
    const translations = translationsByVocab[vocab.id] || {};
    const englishWord = vocab.word_en;
    const sanitized = sanitizeFilename(englishWord);
    
    console.log(`\n[${i + 1}/${vocabulary.length}] "${englishWord}"`);
    
    // Generate and save English audio
    const englishAudio = await generateTTS(englishWord, 'en');
    if (englishAudio) {
      const filePath = saveAudioFile(englishAudio, 'en', sanitized);
      csvMappings.push(`${vocab.id},en,${filePath}`);
      successCount++;
      process.stdout.write(`   ✅ en`);
    } else {
      console.log(`   ❌ en failed`);
      errorCount++;
    }
    
    // Generate and save translations
    for (const [langCode, translation] of Object.entries(translations)) {
      const audioBuffer = await generateTTS(translation, langCode);
      if (audioBuffer) {
        const filePath = saveAudioFile(audioBuffer, langCode, sanitized);
        csvMappings.push(`${vocab.id},${langCode},${filePath}`);
        successCount++;
        process.stdout.write(` ${langCode}`);
      } else {
        errorCount++;
  }
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount} files`);
  console.log(`   ❌ Errors: ${errorCount} files`);
  console.log();
  
  // Step 5: Save CSV mapping
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const csvFilename = `scripts/common-phrases-b2-urls-${timestamp}.csv`;
  
  const csvContent = 'vocabulary_id,language_code,file_path\n' + csvMappings.join('\n');
  fs.writeFileSync(csvFilename, csvContent);
  
  console.log(`✅ CSV mapping saved: ${csvFilename}`);
  console.log(`   Total mappings: ${csvMappings.length}`);
  console.log();
  console.log('🎉 Audio generation complete!');
  console.log();
  console.log('📝 Next steps:');
  console.log('   1. Update backblaze-urls CSV file with new mappings');
  console.log('   2. Test audio playback in the app');
}

main().catch(console.error);
4: Save CSV mapping for later B2 upload
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const csvFilename = `scripts/common-phrases-audio-mappings-${timestamp}.csv`;
  
  const csvContent = 'vocabulary_id,language_code,file_path\n' + csvMappings.join('\n');
  fs.writeFileSync(csvFilename, csvContent);
  
  console.log(`\n✅ CSV mapping saved: ${csvFilename}`);
  console.log(`   Total mappings: ${csvMappings.length}`);
  console.log();
  console.log(`📁 Audio files saved to: ${path.resolve(OUTPUT_DIR)}`);
  console.log();
  console.log('🎉 Audio generation complete!');
  console.log();
  console.log('📝 Next steps:');
  console.log('   1. Review audio quality in output folder');
  console.log('   2. Upload files to Backblaze B2');
  console.log('   3. Update backblaze-urls CSV file with mappings