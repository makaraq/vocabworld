/**
 * Remove specific words from Greetings topic
 * Deletes vocabulary and all translations automatically cascade
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const WORDS_TO_REMOVE = [
  { id: 2691, word: 'pleased to meet you' }
];

async function removeWords() {
  console.log('\n🗑️  REMOVING GREETINGS WORDS\n');
  console.log('='.repeat(70));
  
  for (const item of WORDS_TO_REMOVE) {
    console.log(`\n📝 Removing: ID ${item.id} - "${item.word}"`);
    
    // Check translations before deleting
    const { count } = await supabase
      .from('vocabulary_translations')
      .select('*', { count: 'exact', head: true })
      .eq('vocabulary_id', item.id);
    
    console.log(`   Found ${count} translations across all languages`);
    
    // Delete vocabulary (translations will cascade delete)
    const { error } = await supabase
      .from('vocabulary')
      .delete()
      .eq('id', item.id);
    
    if (error) {
      console.error(`   ❌ Error:`, error);
    } else {
      console.log(`   ✅ Deleted vocabulary and all translations`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Complete! Removed word from greetings topic.');
  console.log('   Remaining greetings: 33 words\n');
}

removeWords().catch(console.error);
