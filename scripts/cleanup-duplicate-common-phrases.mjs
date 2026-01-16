/**
 * Clean up duplicate Common Phrases vocabulary records
 * Keeps only the latest records (higher IDs) and removes older duplicates
 * 
 * Usage: node scripts/cleanup-duplicate-common-phrases.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate Common Phrases records...\n');

  // Step 1: Get all vocabulary records for topic 42
  console.log('📌 Fetching all vocabulary records...');
  const { data: allRecords, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', 42)
    .order('word_en', { ascending: true });

  if (fetchError || !allRecords) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return;
  }

  console.log(`✅ Found ${allRecords.length} total records\n`);

  // Step 2: Group by word_en and find duplicates
  const wordGroups = {};
  allRecords.forEach(record => {
    if (!wordGroups[record.word_en]) {
      wordGroups[record.word_en] = [];
    }
    wordGroups[record.word_en].push(record);
  });

  // Step 3: Identify duplicates and records to keep/delete
  const toDelete = [];
  const uniqueWords = Object.keys(wordGroups).length;
  let duplicateCount = 0;

  Object.entries(wordGroups).forEach(([word, records]) => {
    if (records.length > 1) {
      duplicateCount++;
      // Sort by ID descending (keep highest ID = most recent)
      records.sort((a, b) => b.id - a.id);
      const toKeep = records[0];
      const toRemove = records.slice(1);
      
      console.log(`🔍 "${word}": ${records.length} copies, keeping ID ${toKeep.id}, removing ${toRemove.map(r => r.id).join(', ')}`);
      toDelete.push(...toRemove.map(r => r.id));
    }
  });

  console.log(`\n📊 Analysis:`);
  console.log(`   Unique words: ${uniqueWords}`);
  console.log(`   Words with duplicates: ${duplicateCount}`);
  console.log(`   Records to delete: ${toDelete.length}`);
  console.log(`   Records to keep: ${allRecords.length - toDelete.length}\n`);

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  // Step 4: Delete duplicate records in batches
  console.log('📌 Deleting duplicate records...');
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('vocabulary')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`\n❌ Error deleting batch:`, deleteError.message);
    } else {
      deleted += batch.length;
      process.stdout.write(`\r   Progress: ${deleted}/${toDelete.length} deleted`);
    }
  }

  console.log(`\n\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deleted} duplicate records`);
  console.log(`   Remaining: ${allRecords.length - deleted} unique records\n`);
  
  // Step 5: Verify final count
  const { count: finalCount } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', 42);
    
  console.log(`📊 Final verification: ${finalCount} records in database`);
}

cleanupDuplicates().catch(console.error);
