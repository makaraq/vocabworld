/**
 * Clean up translation formatting
 * - Remove everything after "/" (keep only first translation)
 * - Remove parentheses and their content
 * - Trim whitespace
 * 
 * Usage: node scripts/clean-translation-formatting.mjs
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

function cleanTranslation(text) {
  if (!text) return text;
  
  // Remove everything after "/" (keep only first translation)
  let cleaned = text.split('/')[0];
  
  // Remove parentheses and their content
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  
  // Remove brackets and their content (just in case)
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

async function cleanTranslations() {
  console.log('🧹 Cleaning translation formatting...\n');

  // Step 1: Get all vocabulary IDs for topic 42
  console.log('📌 Fetching vocabulary records...');
  const { data: vocabRecords, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', 42);

  if (vocabError || !vocabRecords) {
    console.error('❌ Error fetching vocabulary:', vocabError);
    return;
  }

  const vocabIds = vocabRecords.map(v => v.id);
  console.log(`✅ Found ${vocabRecords.length} vocabulary records\n`);

  // Step 2: Get all translations for these vocabulary IDs
  console.log('📌 Fetching translations...');
  const { data: translations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('id, vocabulary_id, language_code, translated_word')
    .in('vocabulary_id', vocabIds);

  if (transError || !translations) {
    console.error('❌ Error fetching translations:', transError);
    return;
  }

  console.log(`✅ Found ${translations.length} translations\n`);

  // Step 3: Clean translations and track changes
  console.log('📌 Cleaning translations...');
  let needsUpdate = 0;
  const updates = [];

  translations.forEach(trans => {
    const cleaned = cleanTranslation(trans.translated_word);
    if (cleaned !== trans.translated_word) {
      needsUpdate++;
      updates.push({
        id: trans.id,
        vocabulary_id: trans.vocabulary_id,
        language_code: trans.language_code,
        original: trans.translated_word,
        cleaned: cleaned
      });
    }
  });

  console.log(`📊 Analysis:`);
  console.log(`   Total translations: ${translations.length}`);
  console.log(`   Need cleaning: ${needsUpdate}`);
  console.log(`   Already clean: ${translations.length - needsUpdate}\n`);

  if (needsUpdate === 0) {
    console.log('✅ All translations are already clean!');
    return;
  }

  // Show sample of changes
  console.log('📝 Sample changes:');
  updates.slice(0, 10).forEach(u => {
    console.log(`   "${u.original}" → "${u.cleaned}"`);
  });
  console.log();

  // Step 4: Update translations in batches
  console.log('📌 Updating translations...');
  let updated = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('vocabulary_translations')
      .update({ translated_word: update.cleaned })
      .eq('id', update.id);

    if (updateError) {
      console.error(`\n❌ Error updating translation ${update.id}:`, updateError.message);
    } else {
      updated++;
      if (updated % 100 === 0) {
        process.stdout.write(`\r   Progress: ${updated}/${needsUpdate} updated`);
      }
    }
  }

  process.stdout.write(`\r   Progress: ${updated}/${needsUpdate} updated`);
  console.log(`\n\n✅ Cleanup complete!`);
  console.log(`   Updated: ${updated} translations\n`);
}

cleanTranslations().catch(console.error);
