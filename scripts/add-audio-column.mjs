import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addAudioColumn() {
  console.log('📝 Adding audio_url column to vocabulary_translations...\n');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE vocabulary_translations 
      ADD COLUMN IF NOT EXISTS audio_url TEXT;
      
      CREATE INDEX IF NOT EXISTS idx_vocabulary_translations_audio 
      ON vocabulary_translations(vocabulary_id, language_code) 
      WHERE audio_url IS NOT NULL;
    `
  });
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard:\n');
    console.log('ALTER TABLE vocabulary_translations ADD COLUMN IF NOT EXISTS audio_url TEXT;\n');
    console.log('CREATE INDEX IF NOT EXISTS idx_vocabulary_translations_audio ON vocabulary_translations(vocabulary_id, language_code) WHERE audio_url IS NOT NULL;\n');
  } else {
    console.log('✅ Column added successfully!');
  }
}

addAudioColumn().catch(console.error);
