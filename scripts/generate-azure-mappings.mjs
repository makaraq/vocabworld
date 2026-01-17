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

  const mappings = [];

  for (const [code, { name }] of Object.entries(VOICES)) {
    console.log(`\n📝 Processing ${name} (${code})...`);
    
    const { data: translations } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, translated_word')
      .eq('language_code', code)
      .in('vocabulary_id', vocab.map(v => v.id));

    const dir = path.join(process.cwd(), 'scripts', 'common-phrases-audio', 'CommonPhrases', code);
    
    for (const item of vocab) {
      const translation = translations.find(t => t.vocabulary_id === item.id);
      if (!translation) continue;
      
      const filename = `${sanitize(translation.translated_word)}.wav`;
      const filepath = path.join(dir, filename);
      
      // Only add to mapping if file actually exists
      if (fs.existsSync(filepath)) {
        mappings.push(`${item.id},${code},CommonPhrases/${code}/${filename}`);
      } else {
        console.log(`  ⚠️  Missing: ID ${item.id} - ${item.word_en}`);
      }
    }
  }

  const csvPath = path.join(process.cwd(), 'scripts', 'azure-audio-mappings.csv');
  fs.writeFileSync(csvPath, mappings.join('\n'));
  
  console.log(`\n✅ Generated ${mappings.length} mappings`);
  console.log(`📄 Saved to: azure-audio-mappings.csv`);
}

main().catch(console.error);
