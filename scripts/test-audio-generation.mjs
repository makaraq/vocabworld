/**
 * Test Audio Generation - 3 phrases only
 * Quick test to verify TTS quality before full generation
 */

import { createClient } from '@supabase/supabase-js';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TOPIC_ID = 42;
const TOPIC_FOLDER = 'CommonPhrases';
const OUTPUT_DIR = 'scripts/test-audio-output';

const languageToTTSCode = {
  ar: 'ar-EG', bg: 'bg-BG', bn: 'bn-BD', ca: 'ca-ES', cs: 'cs-CZ',
  da: 'da-DK', de: 'de-DE', el: 'el-GR', en: 'en-US', es: 'es-ES',
  et: 'et-EE', eu: 'eu-ES', fi: 'fi-FI', fr: 'fr-FR', gu: 'gu-IN',
  he: 'he-IL', hi: 'hi-IN', hr: 'hr-HR', hu: 'hu-HU', id: 'id-ID',
  is: 'is-IS', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR', lt: 'lt-LT',
  lv: 'lv-LV', ml: 'ml-IN', mr: 'mr-IN', nl: 'nl-NL', no: 'nb-NO',
  pl: 'pl-PL', pt: 'pt-PT', ro: 'ro-RO', ru: 'ru-RU', sk: 'sk-SK',
  sl: 'sl-SI', sq: 'sq-AL', sr: 'sr-RS', sv: 'sv-SE', ta: 'ta-IN',
  te: 'te-IN', th: 'th-TH', tr: 'tr-TR', uk: 'uk-UA', ur: 'ur-PK',
  vi: 'vi-VN', zh: 'cmn-CN'
};

const AUDIO_LANGUAGES = Object.keys(languageToTTSCode);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const credentialsPath = path.join(process.cwd(), 'vertexoc-09f434d73abd.json');
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath
});

async function generateTTS(text, languageCode) {
  const ttsLanguageCode = languageToTTSCode[languageCode];
  if (!ttsLanguageCode) return null;
  
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
    console.error(`   ❌ TTS error (${languageCode}):`, error.message.substring(0, 80));
    return null;
  }
}

function sanitizeFilename(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

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

async function main() {
  console.log('🎵 Test Audio Generation - 3 Phrases');
  console.log('='.repeat(60));
  console.log();
  
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found:', credentialsPath);
    process.exit(1);
  }
  
  console.log('✅ Using credentials:', credentialsPath);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log('📁 Output directory:', path.resolve(OUTPUT_DIR));
  console.log();
  
  // Get first 3 phrases
  console.log('📚 Fetching first 3 phrases...');
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order', { ascending: true })
    .limit(3);
  
  if (vocabError || !vocabulary) {
    console.error('❌ Error:', vocabError);
    process.exit(1);
  }
  
  console.log(`✅ Loaded ${vocabulary.length} phrases\n`);
  
  // Get translations
  console.log('📚 Fetching translations...');
  const vocabIds = vocabulary.map(v => v.id);
  const { data: allTranslations } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, language_code, translated_word')
    .in('vocabulary_id', vocabIds)
    .in('language_code', AUDIO_LANGUAGES);
  
  console.log(`✅ Found ${allTranslations?.length || 0} translations (47 languages)\n`);
  
  const translationsByVocab = {};
  allTranslations?.forEach(t => {
    if (!translationsByVocab[t.vocabulary_id]) {
      translationsByVocab[t.vocabulary_id] = {};
    }
    translationsByVocab[t.vocabulary_id][t.language_code] = t.translated_word;
  });
  
  console.log('🎵 Generating English audio only (test)...');
  console.log(`   Target: ${vocabulary.length} phrases\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < vocabulary.length; i++) {
    const vocab = vocabulary[i];
    const englishWord = vocab.word_en;
    const sanitized = sanitizeFilename(englishWord);
    
    console.log(`[${i + 1}/${vocabulary.length}] "${englishWord}"`);
    
    // Generate English only
    const englishAudio = await generateTTS(englishWord, 'en');
    if (englishAudio) {
      saveAudioFile(englishAudio, 'en', sanitized);
      successCount++;
      console.log(`   ✅ Male voice generated`);
    } else {
      console.log(`   ❌ Failed`);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${successCount} files`);
  console.log(`   ❌ Errors: ${errorCount} files`);
  console.log();
  console.log(`📁 Test audio saved to: ${path.resolve(OUTPUT_DIR)}`);
  console.log();
  console.log('🎧 Listen to the audio files to verify quality!');
  console.log('   If quality is good, run: node scripts/generate-common-phrases-audio.mjs');
}

main().catch(console.error);
