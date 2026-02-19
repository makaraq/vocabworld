/**
 * Clean up duplicate sentences in Topic 45 (Example Sentences)
 * Keep only the first occurrence of each unique sentence
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOPIC_ID = 45;

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     CLEAN UP DUPLICATE SENTENCES - TOPIC 45               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Get all sentences for topic 45
  console.log('📌 Fetching all sentences...');
  const { data: allSentences, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en, context, learning_order')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order');

  if (fetchError) {
    console.error('❌ Error fetching sentences:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${allSentences.length} total sentences\n`);

  // Find unique sentences (keep first occurrence)
  const seen = new Set();
  const toKeep = [];
  const toDelete = [];

  allSentences.forEach(sentence => {
    if (!seen.has(sentence.word_en)) {
      seen.add(sentence.word_en);
      toKeep.push(sentence);
    } else {
      toDelete.push(sentence.id);
    }
  });

  console.log(`📊 Analysis:`);
  console.log(`   Unique sentences: ${toKeep.length}`);
  console.log(`   Duplicates to delete: ${toDelete.length}\n`);

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found. Database is clean!\n');
    return;
  }

  // Delete duplicate sentences
  console.log('🗑️  Deleting duplicate sentences...');
  
  // First delete all translations for the duplicate sentences
  const { error: deleteTranslationsError } = await supabase
    .from('vocabulary_translations')
    .delete()
    .in('vocabulary_id', toDelete);

  if (deleteTranslationsError) {
    console.error('❌ Error deleting translations:', deleteTranslationsError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted translations for ${toDelete.length} duplicate sentences`);

  // Then delete the duplicate vocabulary entries
  const { error: deleteVocabError } = await supabase
    .from('vocabulary')
    .delete()
    .in('id', toDelete);

  if (deleteVocabError) {
    console.error('❌ Error deleting vocabulary:', deleteVocabError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${toDelete.length} duplicate vocabulary entries\n`);

  // Update learning order to be sequential
  console.log('📌 Updating learning order...');
  
  for (let i = 0; i < toKeep.length; i++) {
    await supabase
      .from('vocabulary')
      .update({ learning_order: i + 1 })
      .eq('id', toKeep[i].id);
  }

  console.log(`✅ Updated learning order for ${toKeep.length} sentences\n`);

  // Verify cleanup
  const { data: finalCheck } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', TOPIC_ID);

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ CLEANUP COMPLETE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Final count: ${finalCheck.length} unique sentences`);
  console.log(`🗑️  Removed: ${toDelete.length} duplicates\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
