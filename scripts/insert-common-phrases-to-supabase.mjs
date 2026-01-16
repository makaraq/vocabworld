/**
 * Insert Common Phrases Topic Directly to Supabase
 * Batch insert script that avoids SQL size limits
 * 
 * Usage: node scripts/insert-common-phrases-to-supabase.mjs
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

async function insertCommonPhrasesTopic() {
  console.log('\n============================================================');
  console.log('📝 Inserting Common Phrases Topic to Supabase');
  console.log('============================================================\n');

  const translationFile = 'scripts/common-phrases-translations-batch.json';
  console.log(`📂 Loading translations from: ${translationFile}`);
  
  const data = JSON.parse(fs.readFileSync(translationFile, 'utf-8'));
  const phrases = Object.values(data);
  
  console.log(`📊 Total phrases: ${phrases.length}\n`);

  // Step 1: Insert/Update Topic
  console.log('📌 Step 1: Inserting topic...');
  const { error: topicError } = await supabase
    .from('topics')
    .upsert({
      id: 42,
      name: 'Common Phrases',
      description: 'Essential everyday phrases and expressions'
    });

  if (topicError) {
    console.error('❌ Error inserting topic:', topicError);
    return;
  }
  console.log('✅ Topic inserted\n');

  // Step 2: Insert Vocabulary in batches
  console.log('📌 Step 2: Inserting vocabulary...');
  const vocabularyData = phrases.map((phrase, index) => ({
    topic_id: 42,
    word_en: phrase.english,
    part_of_speech: 'phrase',
    difficulty_level: 1,
    context: phrase.category || '', // Use category name, not description
    learning_order: index + 1 // Add learning order based on position
  }));

  const batchSize = 100;
  let vocabInserted = 0;

  for (let i = 0; i < vocabularyData.length; i += batchSize) {
    const batch = vocabularyData.slice(i, i + batchSize);
    
    const { error: vocabError } = await supabase
      .from('vocabulary')
      .insert(batch);

    if (vocabError) {
      // If duplicate, that's fine - skip and continue
      if (!vocabError.message?.includes('duplicate')) {
        console.error(`\n❌ Error inserting vocabulary batch ${Math.floor(i/batchSize) + 1}:`, vocabError.message);
      }
    }
    vocabInserted += batch.length;
    process.stdout.write(`\r   Progress: ${vocabInserted}/${vocabularyData.length} phrases`);
  }
  console.log('\n✅ Vocabulary inserted\n');

  // Step 3: Get vocabulary IDs
  console.log('📌 Step 3: Fetching vocabulary IDs...');
  const { data: vocabRecords, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42);

  if (fetchError || !vocabRecords) {
    console.error('❌ Error fetching vocabulary IDs:', fetchError);
    return;
  }

  const vocabIdMap = {};
  vocabRecords.forEach(record => {
    vocabIdMap[record.word_en] = record.id;
  });
  console.log(`✅ Fetched ${vocabRecords.length} vocabulary IDs\n`);

  // Step 4: Insert Translations in batches
  console.log('📌 Step 4: Inserting translations...');
  const translationData = [];
  
  phrases.forEach(phrase => {
    const vocabId = vocabIdMap[phrase.english];
    if (!vocabId) return;

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

  console.log(`   Total translations to insert: ${translationData.length}`);
  
  let transInserted = 0;
  const transBatchSize = 500; // Larger batch for translations

  for (let i = 0; i < translationData.length; i += transBatchSize) {
    const batch = translationData.slice(i, i + transBatchSize);
    
    const { error: transError } = await supabase
      .from('vocabulary_translations')
      .insert(batch);

    if (transError) {
      // If duplicate, that's fine - skip and continue
      if (!transError.message?.includes('duplicate')) {
        console.error(`\n❌ Error inserting translation batch ${Math.floor(i/transBatchSize) + 1}:`, transError.message);
      }
    }
    transInserted += batch.length;
    const percentage = ((transInserted / translationData.length) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${transInserted}/${translationData.length} (${percentage}%)`);
  }
  console.log('\n✅ Translations inserted\n');

  // Summary
  console.log('============================================================');
  console.log('✨ Common Phrases Topic Setup Complete!');
  console.log('============================================================');
  console.log(`📊 Summary:`);
  console.log(`   - Topic: Common Phrases (ID: 42)`);
  console.log(`   - Phrases: ${phrases.length}`);
  console.log(`   - Translations: ${translationData.length}`);
  console.log(`   - Languages: ${Object.keys(LANGUAGE_MAP).length}`);
  console.log('\n💡 Next: Refresh your app to see the new topic!\n');
}

// Run the insertion
insertCommonPhrasesTopic().catch(console.error);
