import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VOICES = {
  cy: { voice: 'cy-GB-NiaNeural', name: 'Welsh' },
  ga: { voice: 'ga-IE-OrlaNeural', name: 'Irish' },
  mt: { voice: 'mt-MT-GraceNeural', name: 'Maltese' }
};

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = 'westus';
const DELAY = 2000;

function sanitize(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 50);
}

async function generateAudio(text, voiceName, code) {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `<speak version='1.0' xml:lang='${code}-${code.toUpperCase()}'>
    <voice name='${voiceName}'>${text}</voice>
  </speak>`;

  let attempt = 0;
  while (attempt < 3) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
        },
        body: ssml
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      attempt++;
      if (attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
    }
  }
}

async function main() {
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('id');

  const allMissing = [];

  for (const [code, { voice, name }] of Object.entries(VOICES)) {
    const { data: translations } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, translated_word')
      .eq('language_code', code)
      .in('vocabulary_id', vocab.map(v => v.id));

    const dir = path.join(process.cwd(), 'scripts', 'common-phrases-audio', 'CommonPhrases', code);
    fs.mkdirSync(dir, { recursive: true });

    for (const item of vocab) {
      const translation = translations.find(t => t.vocabulary_id === item.id);
      if (!translation) continue;
      
      const filename = `${sanitize(translation.translated_word)}.wav`;
      const filepath = path.join(dir, filename);
      
      if (!fs.existsSync(filepath)) {
        allMissing.push({
          id: item.id,
          code,
          voice,
          name,
          word: item.word_en,
          translation: translation.translated_word,
          filepath
        });
      }
    }
  }

  console.log(`\n📋 Found ${allMissing.length} missing files across all languages\n`);

  let count = 0;
  for (const item of allMissing) {
    count++;
    try {
      const audioBuffer = await generateAudio(item.translation, item.voice, item.code);
      fs.writeFileSync(item.filepath, audioBuffer);
      console.log(`[${count}/${allMissing.length}] ✅ ${item.name}: "${item.word}" → "${item.translation}"`);
    } catch (error) {
      console.error(`[${count}/${allMissing.length}] ❌ ${item.name}: ${item.word} - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }

  console.log(`\n✅ Regeneration complete: ${count} files processed`);
}

main().catch(console.error);
