/**
 * TEST: Google TTS API with REST API (no service account)
 * Generate audio for 1 word in all 47 supported languages
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TEST_OUTPUT_DIR = 'scripts/test-tts-audio';

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

const API_KEY = process.env.GEMINI_API_KEY;

async function generateTTS(text, languageCode) {
  const ttsLanguageCode = languageToTTSCode[languageCode];
  if (!ttsLanguageCode) return null;

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
  
  const requestBody = {
    input: { text },
    voice: {
      languageCode: ttsLanguageCode,
      ssmlGender: 'NEUTRAL'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      pitch: 0.0,
      speakingRate: 1.0
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`\n   ❌ ${languageCode} (${ttsLanguageCode}): ${errorData.error?.message || response.statusText}`);
      
      // Try FEMALE voice as fallback
      requestBody.voice.ssmlGender = 'FEMALE';
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!retryResponse.ok) return null;
      const data = await retryResponse.json();
      return data.audioContent;
    }

    const data = await response.json();
    return data.audioContent;
  } catch (error) {
    console.error(`\n   ❌ ${languageCode}: ${error.message}`);
    return null;
  }
}

function saveAudioFile(audioBuffer, languageCode, filename) {
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
  const filePath = path.join(TEST_OUTPUT_DIR, `${filename}_${languageCode}.mp3`);
  fs.writeFileSync(filePath, Buffer.from(audioBuffer, 'base64'));
  return filePath;
}

async function main() {
  console.log('🧪 GOOGLE TTS API TEST');
  console.log('='.repeat(70));
  console.log();

  if (!API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env.local');
    process.exit(1);
  }
  console.log('✅ API Key configured\n');

  console.log('📚 Fetching test word from Essential Words topic...');
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 43)
    .limit(1)
    .single();

  if (vocabError || !vocabulary) {
    console.error('❌ Error:', vocabError);
    process.exit(1);
  }

  const testWord = vocabulary.word_en;
  console.log(`✅ Test word: "${testWord}" (ID: ${vocabulary.id})\n`);

  console.log('📚 Fetching translations...');
  const { data: translations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('language_code, translated_word')
    .eq('vocabulary_id', vocabulary.id)
    .in('language_code', AUDIO_LANGUAGES);

  if (transError) {
    console.error('❌ Error:', transError);
    process.exit(1);
  }

  const translationMap = {};
  translations.forEach(t => {
    translationMap[t.language_code] = t.translated_word;
  });
  console.log(`✅ ${translations.length} translations found\n`);

  console.log(`🎙️  Testing TTS for ${AUDIO_LANGUAGES.length} languages...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const langCode of AUDIO_LANGUAGES) {
    const text = translationMap[langCode] || testWord;
    const ttsCode = languageToTTSCode[langCode];
    
    process.stdout.write(`   ${langCode.padEnd(4)} (${ttsCode.padEnd(8)}) ... `);
    
    const audioBuffer = await generateTTS(text, langCode);
    
    if (audioBuffer) {
      const filePath = saveAudioFile(audioBuffer, langCode, testWord.toLowerCase());
      console.log(`✅ "${text}" → ${path.basename(filePath)}`);
      successCount++;
      results.push({ lang: langCode, status: 'SUCCESS', text });
    } else {
      console.log(`❌ FAILED`);
      errorCount++;
      results.push({ lang: langCode, status: 'ERROR', text });
    }
    
    await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 TEST RESULTS:');
  console.log(`   ✅ Success: ${successCount}/${AUDIO_LANGUAGES.length}`);
  console.log(`   ❌ Errors: ${errorCount}/${AUDIO_LANGUAGES.length}`);
  console.log(`\n📁 Audio files saved to: ${path.resolve(TEST_OUTPUT_DIR)}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Failed languages:');
    results.filter(r => r.status === 'ERROR').forEach(r => {
      console.log(`   - ${r.lang}: "${r.text}"`);
    });
  }

  console.log('\n' + (successCount === AUDIO_LANGUAGES.length ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
  console.log('\n🎉 Test complete!');
}

main().catch(console.error);
