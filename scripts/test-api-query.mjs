/**
 * Test API query to debug translation issue
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  const topicId = 42;
  const limit = 50;
  const offset = 200; // Check words 200-250
  
  console.log('🔍 Fetching vocabulary...\n');
  
  // Get English vocabulary
  const { data: englishWords, error: vocabError } = await supabase
    .from('vocabulary')
    .select(`
      id,
      word_en,
      context,
      part_of_speech,
      difficulty_level,
      example_sentence,
      learning_order
    `)
    .eq('topic_id', topicId)
    .order('learning_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (vocabError) {
    console.error('Error:', vocabError);
    return;
  }

  console.log(`Found ${englishWords.length} vocabulary words\n`);
  
  // Get vocabulary IDs
  const vocabularyIds = englishWords.map(word => word.id);
  console.log('Vocabulary IDs:', vocabularyIds, '\n');
  
  // Get Turkish translations
  const { data: turkishTranslations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, translated_word')
    .eq('language_code', 'tr')
    .in('vocabulary_id', vocabularyIds);

  if (transError) {
    console.error('Translation error:', transError);
    return;
  }

  console.log(`Found ${turkishTranslations?.length || 0} Turkish translations\n`);
  
  // Map translations
  const translationMap = {};
  (turkishTranslations || []).forEach(t => {
    translationMap[t.vocabulary_id] = t.translated_word;
  });
  
  // Display results
  console.log('Results:');
  console.log('========');
  englishWords.forEach(word => {
    const turkish = translationMap[word.id] || 'NOT FOUND';
    console.log(`${word.id} | ${word.word_en} → ${turkish}`);
  });
}

testQuery().catch(console.error);
