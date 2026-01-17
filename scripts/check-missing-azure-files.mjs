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

function sanitize(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 50);
}

async function main() {
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('id');

  for (const [code, { name }] of Object.entries(VOICES)) {
    const { data: translations } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, translated_word')
      .eq('language_code', code)
      .in('vocabulary_id', vocab.map(v => v.id));

    const dir = path.join(process.cwd(), 'scripts', 'common-phrases-audio', 'CommonPhrases', code);
    const missing = [];

    for (const item of vocab) {
      const translation = translations.find(t => t.vocabulary_id === item.id);
      if (!translation) continue;
      
      const filename = `${sanitize(translation.translated_word)}.wav`;
      const filepath = path.join(dir, filename);
      
      if (!fs.existsSync(filepath)) {
        missing.push({ id: item.id, word: item.word_en, translation: translation.translated_word });
      }
    }

    console.log(`\n${name} (${code}): ${794 - missing.length}/794 files`);
    if (missing.length > 0) {
      console.log(`Missing ${missing.length} files:`);
      missing.slice(0, 10).forEach(m => {
        console.log(`  - ID ${m.id}: "${m.word}" → "${m.translation}"`);
      });
      if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more`);
    }
  }
}

main().catch(console.error);
