/**
 * Update Common Phrases with learning_order and category
 * This script updates existing vocabulary records to add proper ordering and categories
 * 
 * Usage: node scripts/update-common-phrases-order.mjs
 */

import fs from 'fs';
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

async function updateCommonPhrasesOrder() {
  console.log('🔄 Updating Common Phrases with learning_order and category...\n');

  // Step 1: Load translation data
  const translationsFile = 'scripts/common-phrases-translations-batch.json';
  if (!fs.existsSync(translationsFile)) {
    console.error(`❌ File not found: ${translationsFile}`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(translationsFile, 'utf8'));
  
  // Convert object to array of phrases, maintaining order
  const phrases = Object.entries(rawData).map(([key, value]) => ({
    english: value.english,
    category: value.category,
    categoryDescription: value.categoryDescription
  }));

  console.log(`📝 Loaded ${phrases.length} phrases from translation file\n`);

  // Step 2: Get all vocabulary records for topic 42
  console.log('📌 Fetching existing vocabulary records...');
  const { data: vocabRecords, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('id', { ascending: true });

  if (fetchError || !vocabRecords) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return;
  }

  console.log(`✅ Found ${vocabRecords.length} vocabulary records\n`);

  // Step 3: Create map of word_en to learning_order and category
  const orderMap = {};
  phrases.forEach((phrase, index) => {
    orderMap[phrase.english] = {
      learning_order: index + 1,
      category: phrase.category
    };
  });

  // Step 4: Update each vocabulary record
  console.log('📌 Updating vocabulary records with learning_order and category...');
  let updated = 0;
  let notFound = 0;

  for (const vocab of vocabRecords) {
    const orderData = orderMap[vocab.word_en];
    
    if (!orderData) {
      console.log(`⚠️  No order data found for: "${vocab.word_en}"`);
      notFound++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('vocabulary')
      .update({
        learning_order: orderData.learning_order,
        context: orderData.category
      })
      .eq('id', vocab.id);

    if (updateError) {
      console.error(`❌ Error updating ${vocab.word_en}:`, updateError.message);
    } else {
      updated++;
      process.stdout.write(`\r   Progress: ${updated}/${vocabRecords.length} updated`);
    }
  }

  console.log(`\n\n✅ Update complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total: ${vocabRecords.length}\n`);
}

updateCommonPhrasesOrder().catch(console.error);
