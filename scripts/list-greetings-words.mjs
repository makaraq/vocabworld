/**
 * List all Greetings words with IDs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listGreetings() {
  console.log('\n📚 GREETINGS TOPIC - ALL WORDS\n');
  console.log('='.repeat(70));
  
  const { data, error } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', 1)
    .order('learning_order');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\nTotal words: ${data.length}\n`);
  
  data.forEach((word, index) => {
    console.log(`${String(index + 1).padStart(2)}. ID ${String(word.id).padStart(4)} - ${word.word_en}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\nTo remove a word (and ALL its translations):');
  console.log('DELETE FROM vocabulary WHERE id = <ID>;');
  console.log('\nExample: DELETE FROM vocabulary WHERE id = 2683;');
}

listGreetings().catch(console.error);
