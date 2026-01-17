/**
 * Check Common Phrases vocabulary IDs in database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCommonPhrases() {
  console.log('🔍 Checking Common Phrases vocabulary IDs...\n');
  
  // Get Common Phrases topic info
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('*')
    .eq('id', 42)
    .single();
    
  if (topicError) {
    console.error('❌ Error fetching topic:', topicError);
    return;
  }
  
  console.log('✅ Topic found:', topic);
  console.log();
  
  // Get vocabulary for Common Phrases
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('id');
    
  if (vocabError) {
    console.error('❌ Error fetching vocabulary:', vocabError);
    return;
  }
  
  console.log(`📚 Found ${vocabulary.length} vocabulary items`);
  console.log(`📊 ID Range: ${vocabulary[0].id} - ${vocabulary[vocabulary.length - 1].id}`);
  console.log();
  
  // Show first 5 and last 5
  console.log('🔤 First 5 phrases:');
  vocabulary.slice(0, 5).forEach(v => {
    console.log(`  ${v.id}: ${v.word_en}`);
  });
  
  console.log();
  console.log('🔤 Last 5 phrases:');
  vocabulary.slice(-5).forEach(v => {
    console.log(`  ${v.id}: ${v.word_en}`);
  });
  
  // Check CSV range expectation
  const csvRange = { min: 4172, max: 4965 };
  const actualRange = { min: vocabulary[0].id, max: vocabulary[vocabulary.length - 1].id };
  
  console.log();
  console.log('🎯 Range Comparison:');
  console.log(`  Expected (CSV): ${csvRange.min} - ${csvRange.max}`);
  console.log(`  Actual (DB):    ${actualRange.min} - ${actualRange.max}`);
  
  if (actualRange.min === csvRange.min && actualRange.max === csvRange.max) {
    console.log('  ✅ MATCH - CSV range matches database IDs');
  } else {
    console.log('  ❌ MISMATCH - CSV range does NOT match database IDs!');
    console.log('     This is why audio is not playing!');
  }
}

checkCommonPhrases().catch(console.error);
