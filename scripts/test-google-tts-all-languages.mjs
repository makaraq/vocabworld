/**
 * Test Google TTS for all 47 languages
 * Generates audio for one phrase ("get up") in all supported languages
 */

import { createClient } from '@supabase/supabase-js';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const languageToTTSCode = {
  ar: 'ar-EG',
  bg: 'bg-BG',
  bn: 'bn-BD',
  ca: 'ca-ES',
  cs: 'cs-CZ',
  da: 'da-DK',
  de: 'de-DE',
  el: 'el-GR',
  en: 'en-US',
  es: 'es-ES',
  et: 'et-EE',
  eu: 'eu-ES',
  fi: 'fi-FI',
  fr: 'fr-FR',
  gu: 'gu-IN',
  he: 'he-IL',
  hi: 'hi-IN',
  hr: 'hr-HR',
  hu: 'hu-HU',
  id: 'id-ID',
  is: 'is-IS',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  lt: 'lt-LT',
  lv: 'lv-LV',
  ml: 'ml-IN',
  mr: 'mr-IN',
  nl: 'nl-NL',
  no: 'nb-NO',
  pl: 'pl-PL',
  pt: 'pt-PT',
  ro: 'ro-RO',
  ru: 'ru-RU',
  sk: 'sk-SK',
  sl: 'sl-SI',
  sq: 'sq-AL',
  sr: 'sr-RS',
  sv: 'sv-SE',
  ta: 'ta-IN',
  te: 'te-IN',
  th: 'th-TH',
  tr: 'tr-TR',
  uk: 'uk-UA',
  ur: 'ur-PK',
  vi: 'vi-VN',
  zh: 'cmn-CN'
};

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
  
  // Try male first, fallback to female if not available
  try {
    const request = {
      input: { text },
      voice: { 
        languageCode: ttsLanguageCode, 
        ssmlGender: 'MALE'
      },
      audioConfig: { 
        audioEncoding: 'LINEAR16', 
        sampleRateHertz: 24000,
        pitch: 0.0,
        speakingRate: 1.0
      }
    };
    
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    // If male not available, try female
    const request = {
      input: { text },
      voice: { 
        languageCode: ttsLanguageCode, 
        ssmlGender: 'FEMALE'
      },
      audioConfig: { 
        audioEncoding: 'LINEAR16', 
        sampleRateHertz: 24000,
        pitch: 0.0,
        speakingRate: 1.0
      }
    };
    
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  }
}

async function main() {
  console.log('🎵 Google TTS Test - All 47 Languages');
  console.log('='.repeat(60));
  console.log('Testing with phrase: "get up" (vocabulary_id: 4172)\n');
  
  // Check credentials
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found:', credentialsPath);
    process.exit(1);
  }
  console.log('✅ Credentials loaded\n');
  
  // Get translations for "get up" (vocabulary_id 4172)
  console.log('📚 Fetching translations...');
  const { data: translations, error } = await supabase
    .from('vocabulary_translations')
    .select('language_code, translated_word')
    .eq('vocabulary_id', 4172)
    .in('language_code', Object.keys(languageToTTSCode));
  
  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
  
  console.log(`✅ Found ${translations.length} translations\n`);
  
  // Create output directory
  const outputDir = path.join(process.cwd(), 'google-test-audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🎙️  Generating audio files...\n');
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (const translation of translations) {
    const { language_code, translated_word } = translation;
    const ttsCode = languageToTTSCode[language_code];
    
    try {
      const audioBuffer = await generateTTS(translated_word, language_code);
      const fileName = `get_up_${language_code}.wav`;
      const filePath = path.join(outputDir, fileName);
      
      fs.writeFileSync(filePath, Buffer.from(audioBuffer));
      
      console.log(`✅ ${language_code.padEnd(3)} (${ttsCode.padEnd(8)}) - "${translated_word}" - ${audioBuffer.length} bytes`);
      successCount++;
      results.push({ lang: language_code, status: 'success', word: translated_word });
    } catch (error) {
      console.log(`❌ ${language_code.padEnd(3)} (${ttsCode.padEnd(8)}) - "${translated_word}" - ${error.message}`);
      failCount++;
      results.push({ lang: language_code, status: 'failed', error: error.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Success: ${successCount}/${translations.length} languages`);
  console.log(`   ❌ Failed: ${failCount}/${translations.length} languages`);
  console.log(`   📁 Files saved to: ${outputDir}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Failed languages:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`   - ${r.lang}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Test complete!');
}

main().catch(console.error);
