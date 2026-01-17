/**
 * Generate audio for Welsh, Irish, Maltese using Azure TTS
 * All 794 Common Phrases (Topic 42) × 3 languages = 2,382 files
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';

// Azure Neural voices - natural sounding
const AZURE_VOICES = {
  'cy': { code: 'cy-GB', voice: 'cy-GB-NiaNeural', name: 'Welsh' },
  'ga': { code: 'ga-IE', voice: 'ga-IE-OrlaNeural', name: 'Irish' },
  'mt': { code: 'mt-MT', voice: 'mt-MT-GraceNeural', name: 'Maltese' }
};

// Sanitize filename for B2 compatibility
function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

async function synthesizeSpeech(text, languageCode, voiceName, retries = 3) {
  const ssml = `<speak version='1.0' xml:lang='${languageCode}'>
    <voice xml:lang='${languageCode}' name='${voiceName}'>
      ${text}
    </voice>
  </speak>`;

  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm'
        },
        body: ssml
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 5000; // Exponential backoff: 5s, 10s, 20s
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error('Rate limit exceeded after retries');
      }

      if (!response.ok) {
        throw new Error(`Azure TTS failed: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const waitTime = Math.pow(2, attempt) * 5000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

async function main() {
  console.log('🎙️  Azure TTS Audio Generation - Welsh, Irish, Maltese');
  console.log('='.repeat(60));
  console.log(`🔑 Azure Region: ${AZURE_REGION}`);
  console.log(`📁 Output: scripts/common-phrases-audio/CommonPhrases/{lang}/\n`);

  // Get all vocabulary for topic 42
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', 42)
    .order('learning_order', { ascending: true });

  if (vocabError) {
    console.error('Error fetching vocabulary:', vocabError);
    process.exit(1);
  }

  console.log(`✅ Loaded ${vocabulary.length} phrases\n`);

  // Get translations for all 3 languages
  const vocabIds = vocabulary.map(v => v.id);
  const { data: allTranslations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, language_code, translated_word')
    .in('vocabulary_id', vocabIds)
    .in('language_code', ['cy', 'ga', 'mt']);

  if (transError) {
    console.error('Error fetching translations:', transError);
    process.exit(1);
  }

  console.log(`✅ Found ${allTranslations.length} translations (3 languages)\n`);

  const stats = { success: 0, errors: 0 };
  const csvMappings = [];

  // Generate audio for each language
  for (const [langCode, config] of Object.entries(AZURE_VOICES)) {
    console.log(`\n🌍 ${config.name} (${langCode})`);
    console.log('-'.repeat(60));

    // Create output directory
    const outputDir = path.join(process.cwd(), 'scripts', 'common-phrases-audio', 'CommonPhrases', langCode);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let langSuccess = 0;
    let langErrors = 0;

    console.log(`   Starting generation for ${vocabulary.length} phrases...\n`);

    for (let i = 0; i < vocabulary.length; i++) {
      const vocab = vocabulary[i];
      
      if (i === 0) {
        console.log(`   First vocab: ID=${vocab.id}, word="${vocab.word_en}"`);
      }
      
      const translation = allTranslations.find(
        t => t.vocabulary_id === vocab.id && t.language_code === langCode
      );

      if (i === 0) {
        console.log(`   First translation: ${translation ? translation.translated_word : 'NOT FOUND'}`);
      }

      if (!translation) {
        console.log(`   [${i + 1}/${vocabulary.length}] ⚠️  No translation for "${vocab.word_en}"`);
        langErrors++;
        continue;
      }

      const sanitized = sanitizeFilename(translation.translated_word);
      const filename = `${sanitized}.wav`;
      const filePath = path.join(outputDir, filename);

      if (i === 0) {
        console.log(`   First file path: ${filePath}`);
        console.log(`   Attempting TTS...`);
      }

      try {
        const audioBuffer = await synthesizeSpeech(
          translation.translated_word,
          config.code,
          config.voice
        );

        if (i === 0) {
          console.log(`   First TTS succeeded! Buffer size: ${audioBuffer.byteLength}`);
          console.log(`   Writing file...`);
        }

        fs.writeFileSync(filePath, Buffer.from(audioBuffer));

        if (i === 0) {
          console.log(`   File written successfully!`);
        }

        // Add to CSV mapping
        const b2Path = `CommonPhrases/${langCode}/${filename}`;
        csvMappings.push({
          vocabulary_id: vocab.id,
          language_code: langCode,
          file_path: b2Path
        });

        langSuccess++;
        if ((i + 1) % 50 === 0 || i === vocabulary.length - 1) {
          console.log(`   [${i + 1}/${vocabulary.length}] ✅ Generated`);
        }
      } catch (error) {
        console.log(`   [${i + 1}/${vocabulary.length}] ❌ Error: ${error.message}`);
        langErrors++;
      }

      // 3 second delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n   ✅ Success: ${langSuccess} files`);
    console.log(`   ❌ Errors: ${langErrors} files`);
    stats.success += langSuccess;
    stats.errors += langErrors;
  }

  // Save CSV mapping
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const csvPath = path.join(
    process.cwd(),
    'scripts',
    `azure-audio-mappings-${timestamp}.csv`
  );

  const csvContent = [
    'vocabulary_id,language_code,file_path',
    ...csvMappings.map(m => `${m.vocabulary_id},${m.language_code},${m.file_path}`)
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent);

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Success: ${stats.success} files`);
  console.log(`   ❌ Errors: ${stats.errors} files`);
  console.log(`\n📁 Audio saved to: scripts/common-phrases-audio/CommonPhrases/`);
  console.log(`📄 CSV mapping: ${csvPath}\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});
