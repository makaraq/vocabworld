/**
 * Generate Google TTS Audio - Example Sentences (Topic 45)
 * 87 sentences × 47 languages = 4,089 MP3 files
 * Voice: Male, Natural, Crisp (Alnilam-style)
 * Resumable: Skips existing files
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TOPIC_ID = 45;
const TOPIC_FOLDER = 'ExampleSentences';
const OUTPUT_DIR = `scripts/example-sentences-audio/${TOPIC_FOLDER}`;

// Google TTS supports 47 languages (NOT 50)
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
      ssmlGender: 'MALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      pitch: 0.0,
      speakingRate: 0.95,  // Natural pace
      effectsProfileId: ['headphone-class-device']  // Crisp, clear sound
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Try NEUTRAL voice as fallback
      requestBody.voice.ssmlGender = 'NEUTRAL';
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
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

function sanitizeFilename(sentence) {
  // Create clean filename from sentence
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '')  // Remove special characters
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .substring(0, 60);               // Limit length
}

function saveAudioFile(audioBuffer, languageCode, filename) {
  const langDir = path.join(OUTPUT_DIR, languageCode);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }
  const filePath = path.join(langDir, `${filename}.mp3`);
  fs.writeFileSync(filePath, Buffer.from(audioBuffer, 'base64'));
  return `${TOPIC_FOLDER}/${languageCode}/${filename}.mp3`;
}

async function main() {
  console.log('🎙️  EXAMPLE SENTENCES AUDIO GENERATION');
  console.log('='.repeat(70));
  console.log('Voice: Male (Alnilam-style - Natural & Crisp)');
  console.log('='.repeat(70));
  console.log();

  if (!API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env.local');
    process.exit(1);
  }
  console.log('✅ API Key configured');
  console.log('📁 Output:', path.resolve(OUTPUT_DIR));
  console.log();

  console.log('📚 Fetching sentences...');
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order');

  if (vocabError || !vocabulary) {
    console.error('❌ Error:', vocabError);
    process.exit(1);
  }
  console.log(`✅ ${vocabulary.length} sentences\n`);

  console.log('📚 Fetching translations...');
  const vocabIds = vocabulary.map(v => v.id);
  let allTranslations = [];
  
  // Batch fetch with pagination to handle 1000-row Supabase limit
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
  }

  const translationsByVocab = {};
  allTranslations.forEach(t => {
    if (!translationsByVocab[t.vocabulary_id]) {
      translationsByVocab[t.vocabulary_id] = {};
    }
    translationsByVocab[t.vocabulary_id][t.language_code] = t.translated_word;
  });
  console.log(`✅ ${allTranslations.length} translations\n`);

  console.log(`🎙️  Generating audio...`);
  console.log(`   Target: ${vocabulary.length} sentences × 47 languages = ${vocabulary.length * 47} files\n`);

  const csvMappings = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < vocabulary.length; i++) {
    const vocab = vocabulary[i];
    const translations = translationsByVocab[vocab.id] || {};
    const englishSentence = vocab.word_en;
    const sanitized = sanitizeFilename(englishSentence);
    
    console.log(`\n[${i + 1}/${vocabulary.length}] "${englishSentence.substring(0, 50)}..." (ID: ${vocab.id})`);
    
    // Process all languages including English
    const languagesToProcess = [
      { code: 'en', text: englishSentence },
      ...AUDIO_LANGUAGES.filter(lang => lang !== 'en' && translations[lang]).map(lang => ({
        code: lang,
        text: translations[lang]
      }))
    ];

    for (const { code, text } of languagesToProcess) {
      const filePath = path.join(OUTPUT_DIR, code, `${sanitized}.mp3`);
      
      // Check if file exists (resume capability)
      if (fs.existsSync(filePath)) {
        csvMappings.push(`${vocab.id},${code},${TOPIC_FOLDER}/${code}/${sanitized}.mp3`);
        skippedCount++;
        process.stdout.write(` ⏭️`);
      } else {
        const audioBuffer = await generateTTS(text, code);
        
        if (audioBuffer) {
          const csvPath = saveAudioFile(audioBuffer, code, sanitized);
          csvMappings.push(`${vocab.id},${code},${csvPath}`);
          successCount++;
          process.stdout.write(` ${code}`);
        } else {
          errorCount++;
          process.stdout.write(` ❌`);
        }
        
        // Rate limit: 500ms delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Generated: ${successCount}`);
  console.log(`   ⏭️  Skipped (existing): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total files: ${successCount + skippedCount}`);

  const timestamp = new Date().toISOString().split('T')[0];
  const csvFilename = `scripts/example-sentences-b2-urls-${timestamp}.csv`;
  const csvContent = 'vocabulary_id,language_code,file_path\n' + csvMappings.join('\n');
  fs.writeFileSync(csvFilename, csvContent);

  console.log(`\n✅ CSV: ${csvFilename}`);
  console.log(`   Mappings: ${csvMappings.length}`);
  console.log('\n📦 NEXT STEPS:');
  console.log('   1. Upload files to B2: scripts/example-sentences-audio/');
  console.log('   2. Update B2 URLs in CSV (replace with full URLs)');
  console.log('   3. Import audio URLs to database or app');
  console.log('\n🎉 Generation complete!');
}

main().catch(console.error);
