/**
 * Generate SQL Insert Script from Batch Translation Results
 * Converts batch translation JSON data into SQL statements for database insertion
 * 
 * Usage: node scripts/generate-sql-from-batch-translations.mjs
 */

import fs from 'fs';

// Escape single quotes for SQL
function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Language code to full name mapping
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

function generateSqlScript() {
  const translationFile = 'scripts/common-phrases-translations-batch.json';
  const outputFile = 'scripts/insert-common-phrases-topic.sql';
  
  console.log('\n============================================================');
  console.log('📝 Generating SQL Script for Common Phrases Topic');
  console.log('============================================================\n');
  console.log(`📂 Reading translations from: ${translationFile}`);
  
  const data = JSON.parse(fs.readFileSync(translationFile, 'utf-8'));
  const phrases = Object.values(data);
  
  const topicId = 42;
  const topicName = 'Common Phrases';
  const topicDescription = 'Essential everyday phrases and expressions';
  
  let sql = `-- =====================================================\n`;
  sql += `-- COMMON PHRASES TOPIC (ID: 42)\n`;
  sql += `-- ${phrases.length} phrases × 46 languages\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- =====================================================\n\n`;
  
  // Insert topic
  sql += `-- 1. Insert Topic\n`;
  sql += `INSERT INTO topics (id, name, description, display_order) VALUES\n`;
  sql += `  (${topicId}, '${escapeSql(topicName)}', '${escapeSql(topicDescription)}', 42)\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET \n`;
  sql += `  name = EXCLUDED.name, \n`;
  sql += `  description = EXCLUDED.description,\n`;
  sql += `  display_order = EXCLUDED.display_order;\n\n`;
  
  // Insert vocabulary
  console.log(`📝 Generating vocabulary inserts for ${phrases.length} phrases...`);
  sql += `-- 2. Insert Vocabulary (${phrases.length} phrases)\n`;
  sql += `INSERT INTO vocabulary (topic_id, word_en, part_of_speech, difficulty_level, context)\n`;
  sql += `VALUES\n`;
  
  const vocabValues = phrases.map((phrase, idx) => {
    const context = escapeSql(phrase.categoryDescription || '');
    const comma = idx < phrases.length - 1 ? ',' : '';
    return `  (${topicId}, '${escapeSql(phrase.english)}', 'phrase', 1, '${context}')${comma}`;
  });
  
  sql += vocabValues.join('\n');
  sql += `\nON CONFLICT (topic_id, word_en) DO NOTHING;\n\n`;
  
  // Insert translations
  console.log(`📝 Generating translation inserts...`);
  sql += `-- 3. Insert Translations\n`;
  sql += `-- Using a CTE to map vocabulary IDs\n`;
  sql += `WITH vocab_ids AS (\n`;
  sql += `  SELECT id, word_en FROM vocabulary WHERE topic_id = ${topicId}\n`;
  sql += `)\n`;
  sql += `INSERT INTO vocabulary_translations (vocabulary_id, language, translation)\n`;
  sql += `VALUES\n`;
  
  const translationValues = [];
  let translationCount = 0;
  
  phrases.forEach((phrase) => {
    const englishWord = phrase.english;
    
    Object.entries(phrase.translations).forEach(([langCode, translation]) => {
      if (translation && LANGUAGE_MAP[langCode]) {
        const langName = LANGUAGE_MAP[langCode];
        translationValues.push(
          `  ((SELECT id FROM vocab_ids WHERE word_en = '${escapeSql(englishWord)}'), '${langName}', '${escapeSql(translation)}')`
        );
        translationCount++;
      }
    });
  });
  
  sql += translationValues.join(',\n');
  sql += `\nON CONFLICT (vocabulary_id, language) DO UPDATE SET translation = EXCLUDED.translation;\n\n`;
  
  // Summary
  sql += `-- =====================================================\n`;
  sql += `-- SUMMARY\n`;
  sql += `-- Topic: ${topicName} (ID: ${topicId})\n`;
  sql += `-- Phrases: ${phrases.length}\n`;
  sql += `-- Translations: ${translationCount}\n`;
  sql += `-- Languages: ${Object.keys(LANGUAGE_MAP).length}\n`;
  sql += `-- =====================================================\n`;
  
  // Write to file
  fs.writeFileSync(outputFile, sql);
  
  console.log(`\n✅ SQL script generated successfully!`);
  console.log(`📁 Output: ${outputFile}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Phrases: ${phrases.length}`);
  console.log(`   - Translations: ${translationCount}`);
  console.log(`   - Languages: ${Object.keys(LANGUAGE_MAP).length}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the SQL file: ${outputFile}`);
  console.log(`   2. Run it in Supabase SQL Editor`);
  console.log(`   3. Verify the topic appears in the app\n`);
}

// Run the generator
generateSqlScript();
