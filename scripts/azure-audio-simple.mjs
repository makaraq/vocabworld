/**
 * Generate Azure TTS audio for Welsh, Irish, Maltese
 * Simple, clean, robust version
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

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';

const VOICES = {
  cy: { voice: 'cy-GB-NiaNeural', name: 'Welsh' },
  ga: { voice: 'ga-IE-OrlaNeural', name: 'Irish' },
  mt: { voice: 'mt-MT-GraceNeural', name: 'Maltese' }
};

function sanitize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
}

async function generateAudio(text, voice, retries = 3) {
  const [lang] = voice.split('-');
  const ssml = `<speak version='1.0' xml:lang='${voice.substring(0, 5)}'>
    <voice name='${voice}'>${text}</voice>
  </speak>`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm'
          },
          body: ssml
        }
      );

      if (response.status === 429 && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log('🎙️  Azure TTS - Welsh, Irish, Maltese\n');

  // Get vocabulary
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('learning_order');

  console.log(`📚 ${vocab.length} phrases loaded\n`);

  const stats = { cy: { ok: 0, fail: 0 }, ga: { ok: 0, fail: 0 }, mt: { ok: 0, fail: 0 } };
  const mappings = [];

  for (const [code, { voice, name }] of Object.entries(VOICES)) {
    console.log(`\n🌍 ${name} (${code})`);
    console.log('─'.repeat(50));

    // Get translations
    console.log(`   Fetching translations...`);
    const { data: translations } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, translated_word')
      .eq('language_code', code)
      .in('vocabulary_id', vocab.map(v => v.id));

    console.log(`   Found ${translations?.length || 0} translations`);
    const transMap = new Map(translations.map(t => [t.vocabulary_id, t.translated_word]));
    console.log(`   Starting audio generation...\n`);

    // Create output dir
    const dir = path.join(process.cwd(), 'scripts', 'common-phrases-audio', 'CommonPhrases', code);
    fs.mkdirSync(dir, { recursive: true });

    // Generate audio
    for (let i = 0; i < vocab.length; i++) {
      const { id, word_en } = vocab[i];
      const translation = transMap.get(id);

      if (!translation) {
        stats[code].fail++;
        console.log(`[${i + 1}/${vocab.length}] ⚠️  Missing: ${word_en}`);
        continue;
      }

      const filename = `${sanitize(translation)}.wav`;
      const filepath = path.join(dir, filename);

      // Check if file already exists (for resume capability)
      if (fs.existsSync(filepath)) {
        stats[code].ok++;
        mappings.push(`${id},${code},CommonPhrases/${code}/${filename}`);
        if ((i + 1) % 50 === 0) {
          console.log(`[${i + 1}/${vocab.length}] ⏭️  Skipped (exists): ${word_en}`);
        }
        continue;
      }

      try {
        console.log(`[${i + 1}/${vocab.length}] Generating: ${word_en} → ${translation}`);
        const audio = await generateAudio(translation, voice);
        console.log(`   Got audio buffer: ${audio.length} bytes`);
        console.log(`   Saving to: ${filepath}`);

        fs.writeFileSync(filepath, audio);
        console.log(`   File saved`);

        mappings.push(`${id},${code},CommonPhrases/${code}/${filename}`);
        stats[code].ok++;

        if ((i + 1) % 50 === 0 || i === vocab.length - 1) {
          console.log(`[${i + 1}/${vocab.length}] ✅ Generated: ${word_en}`);
        }

        await new Promise(r => setTimeout(r, 2000)); // Rate limit
      } catch (error) {
        stats[code].fail++;
        console.error(`[${i + 1}/${vocab.length}] ❌ Failed: ${word_en}`, error);
      }
    }

    console.log(`\n✅ ${stats[code].ok} success  ❌ ${stats[code].fail} failed`);
  }

  // Save CSV
  const csv = ['vocabulary_id,language_code,file_path', ...mappings].join('\n');
  const csvPath = path.join(process.cwd(), 'scripts', 'azure-audio-mappings.csv');
  fs.writeFileSync(csvPath, csv);

  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Total: ${stats.cy.ok + stats.ga.ok + stats.mt.ok} files generated`);
  console.log(`📁 Saved to: scripts/common-phrases-audio/CommonPhrases/`);
  console.log(`📄 Mappings: ${csvPath}\n`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
