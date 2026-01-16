/**
 * Re-insert all translations for Common Phrases vocabulary
 * Maps current vocabulary IDs to their translations from the JSON file
 * 
 * Usage: node scripts/reinsert-common-phrases-translations.mjs
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

// Language code mapping
const LANGUAGE_MAP = {
  ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan',
  co: 'Corsican', cs: 'Czech', cy: 'Welsh', da: 'Danish',
  de: 'German', el: 'Greek', es: 'Spanish', et: 'Estonian',
  eu: 'Basque', fa: 'Persian', fi: 'Finnish', fr: 'French',
  ga: 'Irish', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian',
  hu: 'Hungarian', it: 'Italian', ja: 'Japanese', ka: 'Georgian',
  ko: 'Korean', lb: 'Luxembourgish', lt: 'Lithuanian', lv: 'Latvian',
  mk: 'Macedonian', mt: 'Maltese', nl: 'Dutch', no: 'Norwegian',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian',
  sk: 'Slovak', sl: 'Slovenian', sq: 'Albanian', sr: 'Serbian',
  sv: 'Swedish', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian',
  vi: 'Vietnamese', zh: 'Chinese'
};

async function reinsertTranslations() {
  console.log('🔄 Re-inserting translations for Common Phrases...\n');

  // Step 1: Load translation data
  const translationsFile = 'scripts/common-phrases-translations-batch.json';
  if (!fs.existsSync(translationsFile)) {
    console.error(`❌ File not found: ${translationsFile}`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(translationsFile, 'utf8'));
  const phrases = Object.values(rawData);
  console.log(`📝 Loaded ${phrases.length} phrases with translations\n`);

  // Step 2: Get current vocabulary records
  console.log('📌 Fetching current vocabulary records...');
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

  // Step 3: Create map of word_en to vocabulary_id
  const vocabIdMap = {};
  vocabRecords.forEach(record => {
    vocabIdMap[record.word_en] = record.id;
  });

  // Step 4: Delete existing translations for topic 42 vocabulary
  console.log('📌 Deleting old translations...');
  const vocabIds = vocabRecords.map(v => v.id);
  const { error: deleteError } = await supabase
    .from('vocabulary_translations')
    .delete()
    .in('vocabulary_id', vocabIds);

  if (deleteError) {
    console.error('❌ Error deleting old translations:', deleteError);
    return;
  }
  console.log('✅ Old translations deleted\n');

  // Step 5: Insert new translations
  console.log('📌 Inserting new translations...');
  const translationData = [];
  let notFound = 0;

  phrases.forEach(phrase => {
    const vocabId = vocabIdMap[phrase.english];
    if (!vocabId) {
      console.log(`⚠️  No vocab ID found for: "${phrase.english}"`);
      notFound++;
      return;
    }

    Object.entries(phrase.translations).forEach(([langCode, translation]) => {
      if (translation && LANGUAGE_MAP[langCode]) {
        translationData.push({
          vocabulary_id: vocabId,
          language_code: langCode,
          translated_word: translation
        });
      }
    });
  });

  console.log(`📊 Prepared ${translationData.length} translations`);
  console.log(`   Phrases not found: ${notFound}\n`);

  // Insert in batches
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < translationData.length; i += batchSize) {
    const batch = translationData.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('vocabulary_translations')
      .insert(batch);

    if (insertError) {
      console.error(`\n❌ Error inserting batch:`, insertError.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r   Progress: ${inserted}/${translationData.length} translations inserted`);
    }
  }

  console.log(`\n\n✅ Re-insertion complete!`);
  console.log(`   Total translations inserted: ${inserted}\n`);

  // Step 6: Verify
  const { count: finalCount } = await supabase
    .from('vocabulary_translations')
    .select('*', { count: 'exact', head: true })
    .in('vocabulary_id', vocabIds);

  console.log(`📊 Final verification: ${finalCount} translations in database`);
  console.log(`   Expected: ${translationData.length}`);
  console.log(`   Match: ${finalCount === translationData.length ? '✅' : '❌'}`);
}

reinsertTranslations().catch(console.error);
