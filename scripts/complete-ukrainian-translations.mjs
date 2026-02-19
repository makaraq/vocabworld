/**
 * Complete Ukrainian translations for Example Sentences topic
 * This script adds the missing Ukrainian translations that failed during initial run
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TOPIC_ID = 45; // Example Sentences
const LANGUAGE_CODE = 'uk';
const LANGUAGE_NAME = 'Ukrainian';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateSentencesBatch(sentences) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.3,
    }
  });
  
  const sentenceList = sentences.map((s, idx) => `${idx + 1}. ${s.sentence}`).join('\n');
  
  const prompt = `You are a professional translator for a language learning app.

TASK: Translate these English sentences/phrases to ${LANGUAGE_NAME}

SENTENCES:
${sentenceList}

RULES:
1. Provide natural, conversational translations that native speakers would actually use
2. Keep the same tone and context as the original
3. For contractions like "I'm", "I'll", use the natural equivalent in the target language
4. Maintain the same order
5. Return ONLY the translations, one per line, in this format:
1. [translation]
2. [translation]
...

NO explanations, NO additional text, NO commentary.

Translations:`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse numbered list
    const translations = responseText
      .trim()
      .split('\n')
      .map(line => {
        const match = line.match(/^\d+\.\s*(.+)$/);
        return match ? match[1].trim() : null;
      })
      .filter(t => t);

    return translations;
  } catch (error) {
    if (error.message?.includes('503') || error.message?.includes('high demand')) {
      console.log(`\n⏳ API overloaded, waiting 30 seconds before retry...`);
      await delay(30000);
      return translateSentencesBatch(sentences); // Retry
    }
    
    console.error(`\n❌ Error translating:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     COMPLETE UKRAINIAN TRANSLATIONS                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Get all sentences for topic 45
  console.log('📌 Fetching sentences...');
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order');

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Found ${vocabulary.length} sentences\n`);

  // Check if Ukrainian translations already exist
  const { data: existingTranslations } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id')
    .eq('language_code', LANGUAGE_CODE)
    .in('vocabulary_id', vocabulary.map(v => v.id));

  if (existingTranslations && existingTranslations.length > 0) {
    console.log(`⚠️  Found ${existingTranslations.length} existing Ukrainian translations`);
    console.log('   Deleting old translations before adding new ones...\n');
    
    await supabase
      .from('vocabulary_translations')
      .delete()
      .eq('language_code', LANGUAGE_CODE)
      .in('vocabulary_id', vocabulary.map(v => v.id));
  }

  const vocabularyWithSentences = vocabulary.map(v => ({
    id: v.id,
    sentence: v.word_en
  }));

  // Translate in batches of 30 to avoid overload
  const batchSize = 30;
  let allTranslations = [];
  
  for (let i = 0; i < vocabularyWithSentences.length; i += batchSize) {
    const batch = vocabularyWithSentences.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(vocabularyWithSentences.length / batchSize);
    
    console.log(`🌐 Translating batch ${batchNum}/${totalBatches} (${batch.length} sentences)...`);
    
    const translations = await translateSentencesBatch(batch);
    
    if (translations.length !== batch.length) {
      console.error(`\n❌ Translation mismatch: expected ${batch.length}, got ${translations.length}`);
      process.exit(1);
    }
    
    allTranslations.push(...translations);
    
    // Small delay between batches
    if (i + batchSize < vocabularyWithSentences.length) {
      console.log('   Waiting 3 seconds before next batch...\n');
      await delay(3000);
    }
  }

  console.log(`\n✅ Successfully translated all ${allTranslations.length} sentences\n`);

  // Insert translations
  console.log('📌 Inserting Ukrainian translations into database...');
  
  const translationData = vocabularyWithSentences.map((item, idx) => ({
    vocabulary_id: item.id,
    language_code: LANGUAGE_CODE,
    translated_word: allTranslations[idx]
  }));

  const { error: insertError } = await supabase
    .from('vocabulary_translations')
    .insert(translationData);

  if (insertError) {
    console.error('❌ Error inserting translations:', insertError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${translationData.length} Ukrainian translations\n`);

  // Also add topic name translation if missing
  console.log('📌 Adding Ukrainian topic name translation...');
  
  const topicNameModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const topicPrompt = `Translate "Example Sentences" to Ukrainian. Return ONLY the translation, nothing else.`;
  
  try {
    const result = await topicNameModel.generateContent(topicPrompt);
    const topicTranslation = result.response.text().trim().replace(/['"]/g, '');
    
    await supabase
      .from('topic_translations')
      .upsert({
        topic_id: TOPIC_ID,
        language_code: LANGUAGE_CODE,
        translated_name: topicTranslation
      }, {
        onConflict: 'topic_id,language_code'
      });
    
    console.log(`✅ Topic name: "${topicTranslation}"\n`);
  } catch (error) {
    console.log(`⚠️  Topic name translation skipped: ${error.message}\n`);
  }

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ COMPLETE!                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`🎉 Ukrainian translations for Example Sentences are complete!\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
