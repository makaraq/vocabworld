/**
 * Reorder Greetings Topic
 * Updates learning_order for specified words
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// New order (learning_order starts at 1)
const NEW_ORDER = [
  { id: 2682, word: 'hello', order: 1 },
  { id: 2683, word: 'good morning', order: 2 },
  { id: 2684, word: 'good evening', order: 3 },
  { id: 2685, word: 'good night', order: 4 },
  { id: 2689, word: 'how are you?', order: 5 },
  { id: 2690, word: "I'm fine, thank you", order: 6 },
  { id: 2687, word: 'what is your name?', order: 7 },
  { id: 2686, word: 'my name is Alex', order: 8 },
  { id: 2688, word: 'nice to meet you', order: 9 }
];

async function reorderGreetings() {
  console.log('\n🔄 REORDERING GREETINGS\n');
  console.log('='.repeat(70));
  
  for (const item of NEW_ORDER) {
    console.log(`${item.order}. ID ${item.id} - "${item.word}"`);
    
    const { error } = await supabase
      .from('vocabulary')
      .update({ learning_order: item.order })
      .eq('id', item.id);
    
    if (error) {
      console.error(`   ❌ Error updating ID ${item.id}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Learning order updated!\n');
  console.log('Note: Only the first 9 words were reordered.');
  console.log('Remaining words (IDs 2692-2717) keep their current order.\n');
}

reorderGreetings().catch(console.error);
