/**
 * Resume Missing Language Translations
 * Checks what's already translated and continues from there
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
  
  const prompt = `You are a professional translator. Translate these English phrases to ${targetLangName}. Provide natural, idiomatic translations.

${phraseList}

Respond in JSON format (no markdown):
{
  "phrase1": "translation1",
  "phrase2": "translation2"
}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!responseText) return null;
    
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    const cleaned = {};
    for (const [phrase, translation] of Object.entries(parsed)) {
      let cleanedTranslation = translation;
      if (cleanedTranslation.includes('/')) {
        cleanedTranslation = cleanedTranslation.split('/')[0].trim();
      }
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
  console.log('🔄 Resuming Missing Language Translations');
  console.log('='.repeat(60));
  
  // Get all vocabulary
  const { data: vocabulary } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', 42)
    .order('learning_order', { ascending: true });
  
  console.log(`✅ Loaded ${vocabulary.length} phrases\n`);
  
  const allTranslations = [];
  const BATCH_SIZE = 50;
  
  for (const [langCode, langName] of Object.entries(MISSING_LANGUAGES)) {
    // Check existing translations
    const { data: existing } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id')
      .eq('language_code', langCode)
      .in('vocabulary_id', vocabulary.map(v => v.id));
    
    const existingIds = new Set(existing?.map(e => e.vocabulary_id) || []);
    const remaining = vocabulary.filter(v => !existingIds.has(v.id));
    
    if (remaining.length === 0) {
      console.log(`✅ ${langName}: Already complete (${vocabulary.length}/${vocabulary.length})`);
      continue;
    }
    
    console.log(`\n🌍 ${langName} (${langCode}): ${existingIds.size}/${vocabulary.length} done, ${remaining.length} remaining`);
    console.log('-'.repeat(60));
    
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
      
      console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} phrases)...`);
      
      const phrases = batch.map(v => ({ id: v.id, phrase: v.word_en }));
      const translations = await translateBatch(phrases, langCode, langName);
      
      if (translations) {
        const toInsert = [];
        batch.forEach(vocab => {
          const translation = translations[vocab.word_en];
          if (translation) {
            toInsert.push({
              vocabulary_id: vocab.id,
              language_code: langCode,
              translated_word: translation
            });
          }
        });
        
        if (toInsert.length > 0) {
          const { error } = await supabase
            .from('vocabulary_translations')
            .insert(toInsert);
          
          if (error) {
            console.log(`      ❌ Insert failed: ${error.message}`);
          } else {
            console.log(`      ✅ Inserted ${toInsert.length} translations`);
            allTranslations.push(...toInsert);
          }
        }
      }
      
      await delay(5000);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete! Inserted ${allTranslations.length} new translations`);
}

main().catch(console.error);
