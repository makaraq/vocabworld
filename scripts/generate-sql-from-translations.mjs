/**
 * Generate SQL Insert Script from Translation Results
 * Converts JSON translation data into SQL statements for database insertion
 */

import fs from 'fs';

/**
 * Escape single quotes for SQL
 */
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

/**
 * Generate SQL script from translation JSON
 */
function generateSqlScript(translationFile, outputFile) {
  console.log(`📂 Reading translations from: ${translationFile}`);
  
  const data = JSON.parse(fs.readFileSync(translationFile, 'utf-8'));
  const { topicId, topicName, topicDescription, phrases } = data;
  
  let sql = `-- =====================================================\n`;
  sql += `-- ${topicName.toUpperCase()} TOPIC (ID: ${topicId})\n`;
  sql += `-- ${phrases.length} phrases × 49 languages = ${phrases.length * 49} translations\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- =====================================================\n\n`;
  
  // Insert topic
  sql += `-- 1. Insert Topic\n`;
  sql += `INSERT INTO topics (id, name, description) VALUES\n`;
  sql += `  (${topicId}, '${escapeSql(topicName)}', '${escapeSql(topicDescription)}')\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;\n\n`;
  
  // Reset sequence
  sql += `-- Reset vocabulary sequence to avoid conflicts\n`;
  sql += `SELECT setval('vocabulary_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM vocabulary), false);\n\n`;
  
  // Insert vocabulary
  sql += `-- 2. Insert Vocabulary (${phrases.length} phrases)\n`;
  sql += `INSERT INTO vocabulary (topic_id, word_en, part_of_speech, difficulty_level, context)\n`;
  sql += `SELECT * FROM (VALUES\n`;
  
  const vocabValues = phrases.map((phrase, idx) => {
    const context = escapeSql(phrase.categoryDescription);
    return `  (${topicId}, '${escapeSql(phrase.english)}', 'phrase', 1, '${context}')`;
  });
  
  sql += vocabValues.join(',\n');
  sql += `\n) AS t(topic_id, word_en, part_of_speech, difficulty_level, context)\n`;
  sql += `ON CONFLICT (topic_id, word_en) DO NOTHING;\n\n`;
  
  // Insert translations by language
  sql += `-- 3. Insert Translations by Language\n`;
  sql += `-- This will take a moment due to ${phrases.length * 49} total translations\n\n`;
  
  // Group translations by language for efficiency
  const languageCodes = [...new Set(phrases[0].translations.map(t => t.languageCode))];
  
  for (const langCode of languageCodes) {
    const langName = phrases[0].translations.find(t => t.languageCode === langCode).languageName;
    
    sql += `-- ${langName} (${langCode}) - ${phrases.length} translations\n`;
    sql += `INSERT INTO vocabulary_translations (vocabulary_id, language_code, translated_word, context)\n`;
    sql += `SELECT v.id, '${langCode}', t.translated_word, t.context\n`;
    sql += `FROM vocabulary v\n`;
    sql += `JOIN (\n  VALUES\n`;
    
    const translationValues = phrases.map((phrase, idx) => {
      const translation = phrase.translations.find(t => t.languageCode === langCode);
      const translatedWord = escapeSql(translation.translated);
      const context = escapeSql(phrase.categoryDescription);
      const englishWord = escapeSql(phrase.english);
      return `    ('${englishWord}', '${translatedWord}', '${context}')`;
    });
    
    sql += translationValues.join(',\n');
    sql += `\n) AS t(word_en, translated_word, context)\n`;
    sql += `ON v.word_en = t.word_en AND v.topic_id = ${topicId}\n`;
    sql += `ON CONFLICT (vocabulary_id, language_code) DO UPDATE\n`;
    sql += `SET translated_word = EXCLUDED.translated_word, context = EXCLUDED.context;\n\n`;
  }
  
  // Summary
  sql += `-- =====================================================\n`;
  sql += `-- INSERTION COMPLETE\n`;
  sql += `-- Topic: ${topicName} (ID: ${topicId})\n`;
  sql += `-- Total phrases: ${phrases.length}\n`;
  sql += `-- Total translations: ${phrases.length * 49}\n`;
  sql += `-- Languages: 49\n`;
  sql += `-- =====================================================\n\n`;
  
  // Verification query
  sql += `-- Verify insertion\n`;
  sql += `SELECT \n`;
  sql += `  (SELECT COUNT(*) FROM vocabulary WHERE topic_id = ${topicId}) as vocabulary_count,\n`;
  sql += `  (SELECT COUNT(*) FROM vocabulary_translations vt JOIN vocabulary v ON vt.vocabulary_id = v.id WHERE v.topic_id = ${topicId}) as translation_count;\n`;
  
  // Write to file
  fs.writeFileSync(outputFile, sql, 'utf-8');
  
  console.log(`✅ SQL script generated successfully!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Phrases: ${phrases.length}`);
  console.log(`   - Languages: 49`);
  console.log(`   - Total translations: ${phrases.length * 49}`);
  console.log(`💾 Saved to: ${outputFile}`);
  console.log(`\n📝 Run this script in your Supabase SQL Editor to insert the data.`);
}

// Determine which file to process
const isTestMode = !process.argv.includes('--full');
const inputFile = isTestMode 
  ? 'scripts/common-phrases-test-translations.json'
  : 'scripts/common-phrases-translations.json';

const outputFile = isTestMode
  ? 'scripts/insert-common-phrases-test.sql'
  : 'scripts/insert-common-phrases.sql';

console.log(`\n${'='.repeat(60)}`);
console.log(`🗄️  SQL Generator for Common Phrases`);
console.log(`Mode: ${isTestMode ? 'TEST BATCH' : 'FULL DATASET'}`);
console.log(`${'='.repeat(60)}\n`);

if (!fs.existsSync(inputFile)) {
  console.error(`❌ ERROR: Translation file not found: ${inputFile}`);
  console.log(`\nPlease run the translation script first:`);
  console.log(`  node scripts/translate-common-phrases.mjs ${isTestMode ? '' : '--full'}`);
  process.exit(1);
}

generateSqlScript(inputFile, outputFile);
