/**
 * Generate TTS Audio for Common Phrases Topic - Google TTS
 * 794 phrases × 47 languages = 37,318 files
 */

import { createClient } from '@supabase/supabase-js';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TOPIC_ID = 42;
const TOPIC_FOLDER = 'CommonPhrases';
const OUTPUT_DIR = 'scripts/common-phrases-audio';

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
const ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: credentialsPath });

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

async function generateTTS(text, languageCode) {
  const ttsLanguageCode = languageToTTSCode[languageCode];
  if (!ttsLanguageCode) return null;
  
  try {
    const request = {
      input: { text },
      voice: { languageCode: ttsLanguageCode, ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, pitch: 0.0, speakingRate: 1.0 }
    };
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    try {
      const request = {
        input: { text },
        voice: { languageCode: ttsLanguageCode, ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, pitch: 0.0, speakingRate: 1.0 }
      };
      const [response] = await ttsClient.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      return null;
    }
  }
}

function sanitizeFilename(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 50);
}

async function main() {
  console.log('🎵 Google TTS - Common Phrases - 47 Languages');
  console.log('='.repeat(60));
  console.log();
  
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found:', credentialsPath);
    process.exit(1);
  }
  console.log('✅ Credentials:', credentialsPath);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log('📁 Output:', path.resolve(OUTPUT_DIR), '\n');
  
  console.log('📚 Fetching vocabulary...');
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('id');
  
  if (vocabError || !vocabulary) {
    console.error('❌ Error:', vocabError);
    process.exit(1);
  }
  console.log(`✅ ${vocabulary.length} phrases\n`);
  
  console.log('📚 Fetching translations...');
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
        .in('language_code', AUDIO_LANGUAGES)
        .range(offset, offset + 999);
      
      if (error || !data || data.length === 0) break;
      allTranslations.push(...data);
      offset += 1000;
      if (data.length < 1000) break;
    }
    process.stdout.write(`\r   ${allTranslations.length} translations...`);
  }
  console.log(`\r✅ ${allTranslations.length} translations\n`);
  
  const translationsByVocab = {};
  allTranslations.forEach(t => {
    if (!translationsByVocab[t.vocabulary_id]) translationsByVocab[t.vocabulary_id] = {};
    translationsByVocab[t.vocabulary_id][t.language_code] = t.translated_word;
  });
  
  console.log('🎙️  Generating audio...');
  console.log(`   Target: ${vocabulary.length} × 47 = ${vocabulary.length * 47} files\n`);
  
  const csvMappings = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < vocabulary.length; i++) {
    const vocab = vocabulary[i];
    const translations = translationsByVocab[vocab.id] || {};
    const englishWord = vocab.word_en;
    const sanitized = sanitizeFilename(englishWord);
    
    console.log(`\n[${i + 1}/${vocabulary.length}] "${englishWord}"`);
    
    // Check if English file exists
    const enPath = path.join(OUTPUT_DIR, TOPIC_FOLDER, 'en', `${sanitized}.wav`);
    if (fs.existsSync(enPath)) {
      csvMappings.push(`${vocab.id},en,${TOPIC_FOLDER}/en/${sanitized}.wav`);
      successCount++;
      process.stdout.write(`   ⏭️  en`);
    } else {
      const englishAudio = await generateTTS(englishWord, 'en');
      if (englishAudio) {
        const filePath = saveAudioFile(englishAudio, 'en', sanitized);
        csvMappings.push(`${vocab.id},en,${filePath}`);
        successCount++;
        process.stdout.write(`   ✅ en`);
      } else {
        errorCount++;
      }
    }
    
    for (const [langCode, translation] of Object.entries(translations)) {
      const langPath = path.join(OUTPUT_DIR, TOPIC_FOLDER, langCode, `${sanitized}.wav`);
      if (fs.existsSync(langPath)) {
        csvMappings.push(`${vocab.id},${langCode},${TOPIC_FOLDER}/${langCode}/${sanitized}.wav`);
        successCount++;
        process.stdout.write(` ⏭️ `);
      } else {
        const audioBuffer = await generateTTS(translation, langCode);
        if (audioBuffer) {
          const filePath = saveAudioFile(audioBuffer, langCode, sanitized);
          csvMappings.push(`${vocab.id},${langCode},${filePath}`);
          successCount++;
          process.stdout.write(` ${langCode}`);
        } else {
          errorCount++;
        }
      }
    }
  }
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}\n`);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const csvFilename = `scripts/google-audio-mappings-${timestamp}.csv`;
  const csvContent = 'vocabulary_id,language_code,file_path\n' + csvMappings.join('\n');
  fs.writeFileSync(csvFilename, csvContent);
  
  console.log(`✅ CSV: ${csvFilename}`);
  console.log(`   Mappings: ${csvMappings.length}`);
  console.log('🎉 Complete!');
}

main().catch(console.error);
