/**
 * Check how many sentences are in topic 45
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('id, word_en, context, learning_order')
    .eq('topic_id', 45)
    .order('learning_order');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nTotal sentences in Topic 45: ${data.length}\n`);

  // Group by context
  const byContext = {};
  data.forEach(item => {
    const ctx = item.context || 'NO_CONTEXT';
    if (!byContext[ctx]) byContext[ctx] = [];
    byContext[ctx].push(item);
  });

  console.log('Breakdown by category:');
  Object.keys(byContext).sort().forEach(ctx => {
    console.log(`  ${ctx}: ${byContext[ctx].length} sentences`);
  });

  // Check for duplicates
  const sentences = data.map(d => d.word_en);
  const duplicates = sentences.filter((item, index) => sentences.indexOf(item) !== index);
  
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate sentences:`);
    [...new Set(duplicates)].forEach(dup => {
      console.log(`  - "${dup}"`);
    });
  }

  // Show learning order issues
  const expectedOrder = data.map((_, i) => i + 1);
  const actualOrder = data.map(d => d.learning_order);
  if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) {
    console.log('\n⚠️  Learning order has gaps or duplicates');
  }
}

main();
