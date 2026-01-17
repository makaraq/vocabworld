/**
 * Translate Common Phrases to Missing Languages
 * 
 * Translates all 794 Common Phrases to 8 missing languages:
 * gu (Gujarati), id (Indonesian), is (Icelandic), ml (Malayalam),
 * mr (Marathi), ta (Tamil), te (Telugu), ur (Urdu)
 * 
 * Usage: node scripts/translate-missing-languages.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 8 Missing Languages
const MISSING_LANGUAGES = {
  gu: 'Gujarati',
  id: 'Indonesian',
  is: 'Icelandic',
  ml: 'Malayalam',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  ur: 'Urdu'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function translateBatch(phrases, targetLangCode, targetLangName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const phraseList = phrases.map((p, i) => `${i + 1}. ${p.phrase}`).join('\n');
  
  const prompt = `You are a professional translator specializing in natural, context-aware translations.

Target Language: ${targetLangName}

TASK:
Translate the following English phrases into ${targetLangName}. Provide natural, idiomatic translations commonly used in everyday speech.

PHRASES:
${phraseList}

Respond in this exact JSON format (no markdown, no code blocks):
{
  "phrase1": "translation1",
  "phrase2": "translation2"
}

Replace "phrase1", "phrase2" with the EXACT English phrases from the list above.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      console.error(`    ❌ API Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!responseText) return null;
    
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    // Clean translations: remove "/" alternatives and "()" content
    const cleaned = {};
    for (const [phrase, translation] of Object.entries(parsed)) {
      let cleanedTranslation = translation;
      
      // Remove slash alternatives (take first option)
      if (cleanedTranslation.includes('/')) {
        cleanedTranslation = cleanedTranslation.split('/')[0].trim();
      }
      
      // Remove parentheses and content inside
      cleanedTranslation = cleanedTranslation.replace(/\s*\([^)]*\)/g, '').trim();
      
      cleaned[phrase] = cleanedTranslation;
    }
    
    return cleaned;
    
  } catch (error) {
    console.error(`    ❌ Error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🌍 Translating Common Phrases to 8 Missing Languages');
  console.log('='.repeat(60));
  console.log();
  
  // Get all Common Phrases vocabulary
  console.log('📚 Fetching vocabulary...');
  const { data: vocabulary, error } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', 42)
    .order('learning_order', { ascending: true });
  
  if (error || !vocabulary) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log(`✅ Loaded ${vocabulary.length} phrases\n`);
  
  const allTranslations = [];
  const BATCH_SIZE = 50;
  
  // Process each language
  for (const [langCode, langName] of Object.entries(MISSING_LANGUAGES)) {
    console.log(`\n🌍 Translating to ${langName} (${langCode})...`);
    console.log('-'.repeat(60));
    
    const languageTranslations = [];
    
    // Process in batches
    for (let i = 0; i < vocabulary.length; i += BATCH_SIZE) {
      const batch = vocabulary.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(vocabulary.length / BATCH_SIZE);
      
      console.log(`   Batch ${batchNum}/${totalBatches} (phrases ${i + 1}-${Math.min(i + BATCH_SIZE, vocabulary.length)})...`);
      
      const phrases = batch.map(v => ({ id: v.id, phrase: v.word_en }));
      const translations = await translateBatch(phrases, langCode, langName);
      
      if (translations) {
        let successCount = 0;
        batch.forEach(vocab => {
          const translation = translations[vocab.word_en];
          if (translation) {
            languageTranslations.push({
              vocabulary_id: vocab.id,
              language_code: langCode,
              translated_word: translation
            });
            allTranslations.push({
              vocabulary_id: vocab.id,
              language_code: langCode,
              translated_word: translation
            });
            successCount++;
          }
        });
        console.log(`      ✅ Translated ${successCount}/${batch.length} phrases`);
      } else {
        console.log(`      ❌ Batch failed`);
      }
      
      await delay(5000);
    }
    
    console.log(`   ✅ ${langName}: ${languageTranslations.length} translations`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Total translations: ${allTranslations.length}`);
  console.log(`   Expected: ${vocabulary.length * 8} (${vocabulary.length} phrases × 8 languages)`);
  console.log();
  
  // Save to file
  const outputFile = 'scripts/missing-languages-translations.json';
  fs.writeFileSync(outputFile, JSON.stringify(allTranslations, null, 2));
  console.log(`💾 Saved translations to: ${outputFile}\n`);
  
  // Insert to database
  console.log('💾 Inserting translations to database...');
  
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allTranslations.length; i += CHUNK_SIZE) {
    const chunk = allTranslations.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(chunk);
    
    if (error) {
      console.error(`❌ Error inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, error);
    } else {
      console.log(`   ✅ Inserted ${i + chunk.length}/${allTranslations.length} translations`);
    }
  }
  
  console.log('\n✅ Translation complete!');
  console.log();
  console.log('📝 Summary by language:');
  Object.keys(MISSING_LANGUAGES).forEach(lang => {
    const count = allTranslations.filter(t => t.language_code === lang).length;
    console.log(`   ${lang}: ${count}/${vocabulary.length}`);
  });
}

main().catch(console.error);
