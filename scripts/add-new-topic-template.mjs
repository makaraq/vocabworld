/**
 * ADD NEW TOPIC TO VOCAB WORLD
 * 
 * This script helps you add a new topic to the app with all required data:
 * 1. Topic metadata (name, description)
 * 2. Vocabulary words
 * 3. Translations (50 languages)
 * 4. Topic name translations
 * 
 * USAGE:
 * 1. Configure TOPIC_CONFIG below with your topic details
 * 2. Add your vocabulary words to VOCABULARY_WORDS array
 * 3. Run: node scripts/add-new-topic-template.mjs
 * 4. Follow the prompts
 * 
 * NOTE: Audio generation and example sentences require separate scripts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

// ============================================================
// CONFIGURATION - EDIT THIS SECTION
// ============================================================

const TOPIC_CONFIG = {
  id: 43, // Next available topic ID
  name: 'Animals', // Topic name in English
  description: 'Common animals and wildlife vocabulary', // Brief description
  icon: null, // Optional SVG icon (or null)
};

const VOCABULARY_WORDS = [
  // Add your vocabulary words here in this format:
  { word: 'dog', partOfSpeech: 'noun', difficulty: 1, context: 'PETS' },
  { word: 'cat', partOfSpeech: 'noun', difficulty: 1, context: 'PETS' },
  { word: 'bird', partOfSpeech: 'noun', difficulty: 1, context: 'WILD ANIMALS' },
  { word: 'fish', partOfSpeech: 'noun', difficulty: 1, context: 'AQUATIC ANIMALS' },
  { word: 'horse', partOfSpeech: 'noun', difficulty: 1, context: 'FARM ANIMALS' },
  { word: 'cow', partOfSpeech: 'noun', difficulty: 1, context: 'FARM ANIMALS' },
  { word: 'chicken', partOfSpeech: 'noun', difficulty: 1, context: 'FARM ANIMALS' },
  { word: 'elephant', partOfSpeech: 'noun', difficulty: 2, context: 'WILD ANIMALS' },
  { word: 'lion', partOfSpeech: 'noun', difficulty: 2, context: 'WILD ANIMALS' },
  { word: 'tiger', partOfSpeech: 'noun', difficulty: 2, context: 'WILD ANIMALS' },
  // Add more words...
];

// ============================================================
// SUPPORTED LANGUAGES (50 languages)
// ============================================================

const LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' }, { code: 'ca', name: 'Catalan' },
  { code: 'co', name: 'Corsican' }, { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' }, { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' },
  { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' }, { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' }, { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' }, { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' }, { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' }, { code: 'ka', name: 'Georgian' },
  { code: 'ko', name: 'Korean' }, { code: 'lb', name: 'Luxembourgish' },
  { code: 'lt', name: 'Lithuanian' }, { code: 'lv', name: 'Latvian' },
  { code: 'mk', name: 'Macedonian' }, { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' }, { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' }, { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' }, { code: 'sl', name: 'Slovenian' },
  { code: 'sq', name: 'Albanian' }, { code: 'sr', name: 'Serbian' },
  { code: 'sv', name: 'Swedish' }, { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' }, { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' }, { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' }
];

// ============================================================
// INITIALIZATION
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY in .env.local');
  console.log('⚠️  You can continue without translations, but they\'ll need to be added later');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// ============================================================
// MAIN FUNCTIONS
// ============================================================

async function insertTopic() {
  console.log('\n📌 Step 1: Inserting topic...');
  
  const { error } = await supabase
    .from('topics')
    .upsert({
      id: TOPIC_CONFIG.id,
      name: TOPIC_CONFIG.name,
      description: TOPIC_CONFIG.description
    });

  if (error) {
    console.error('❌ Error inserting topic:', error);
    return false;
  }
  
  console.log(`✅ Topic inserted: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`);
  return true;
}

async function insertVocabulary() {
  console.log('\n📌 Step 2: Inserting vocabulary words...');
  
  const vocabularyData = VOCABULARY_WORDS.map((word, index) => ({
    topic_id: TOPIC_CONFIG.id,
    word_en: word.word,
    part_of_speech: word.partOfSpeech,
    difficulty_level: word.difficulty?.toString() || '1',
    context: word.context || '',
    learning_order: index + 1
  }));

  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < vocabularyData.length; i += batchSize) {
    const batch = vocabularyData.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('vocabulary')
      .insert(batch);

    if (error && !error.message?.includes('duplicate')) {
      console.error(`\n❌ Error inserting vocabulary batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      return false;
    }
    
    inserted += batch.length;
    process.stdout.write(`\r   Progress: ${inserted}/${vocabularyData.length} words`);
  }
  
  console.log('\n✅ Vocabulary words inserted');
  return true;
}

async function translateWordsBatch(words, targetLanguage) {
  if (!genAI) {
    console.log('⚠️  Skipping translations (no Gemini API key)');
    return [];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const wordList = words.map((w, idx) => `${idx + 1}. ${w.word}`).join('\n');
  
  const prompt = `You are a professional translator for a language learning app.

TASK: Translate these English words to ${targetLanguage.name}

WORDS:
${wordList}

RULES:
1. Provide natural, commonly-used translations
2. For nouns, use the singular form (unless the English word is plural)
3. Keep the same order
4. Return ONLY the translations, one per line, in this format:
1. [translation]
2. [translation]
...

NO explanations, NO additional text.`;

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
    console.error(`\n❌ Error translating to ${targetLanguage.name}:`, error.message);
    return [];
  }
}

async function generateAndInsertTranslations() {
  console.log('\n📌 Step 3: Generating translations for 50 languages...');
  console.log('⏳ This will take several minutes (API rate limits)...\n');

  // First, get the vocabulary IDs we just inserted
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_CONFIG.id)
    .order('learning_order');

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return false;
  }

  let totalTranslations = 0;

  for (const lang of LANGUAGES) {
    process.stdout.write(`\r🌐 Translating to ${lang.name.padEnd(15)}...`);
    
    const translations = await translateWordsBatch(vocabulary, lang);
    
    if (translations.length !== vocabulary.length) {
      console.log(`\n⚠️  Warning: Expected ${vocabulary.length} translations, got ${translations.length} for ${lang.name}`);
      continue;
    }

    // Insert translations
    const translationData = vocabulary.map((word, idx) => ({
      vocabulary_id: word.id,
      language_code: lang.code,
      translated_word: translations[idx],
      translation_source: 'gemini'
    }));

    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(translationData);

    if (error && !error.message?.includes('duplicate')) {
      console.log(`\n❌ Error inserting translations for ${lang.name}:`, error.message);
      continue;
    }

    totalTranslations += translations.length;
    
    // Rate limiting: wait 2 seconds between language batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Generated ${totalTranslations} translations across ${LANGUAGES.length} languages`);
  return true;
}

async function translateTopicName(targetLanguage) {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `You are a professional translator for a language learning app.

TASK: Translate this topic name to ${targetLanguage.name}

Topic: "${TOPIC_CONFIG.name}"
Description: "${TOPIC_CONFIG.description}"

RULES:
1. Keep it SHORT (1-3 words max)
2. Use natural, commonly-used words
3. Appropriate for a section header in a learning app
4. Return ONLY the translated topic name, nothing else

Translation:`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`\n❌ Error translating topic name to ${targetLanguage.name}:`, error.message);
    return null;
  }
}

async function generateTopicTranslations() {
  console.log('\n📌 Step 4: Generating topic name translations...\n');

  let inserted = 0;

  for (const lang of LANGUAGES) {
    process.stdout.write(`\r🌐 Translating topic name to ${lang.name.padEnd(15)}...`);
    
    const translatedName = await translateTopicName(lang);
    
    if (!translatedName) {
      continue;
    }

    const { error } = await supabase
      .from('topic_translations')
      .upsert({
        topic_id: TOPIC_CONFIG.id,
        language_code: lang.code,
        translated_name: translatedName,
        translated_description: TOPIC_CONFIG.description // English for now
      }, {
        onConflict: 'topic_id,language_code'
      });

    if (error) {
      console.log(`\n❌ Error inserting topic translation for ${lang.name}:`, error.message);
      continue;
    }

    inserted++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n✅ Generated ${inserted} topic name translations`);
  return true;
}

async function updateFrontendCode() {
  console.log('\n📌 Step 5: Frontend update required...');
  console.log('\n⚠️  MANUAL STEP REQUIRED:');
  console.log(`
Add this to app/api/topics/route.ts in the TOPICS_DATA array:

  {
    "id": ${TOPIC_CONFIG.id},
    "name": "${TOPIC_CONFIG.name}",
    "description": "${TOPIC_CONFIG.description}"${TOPIC_CONFIG.icon ? ',\n    "icon": "' + TOPIC_CONFIG.icon + '"' : ''}
  }

Insert it in the appropriate position (topics are currently ordered by ID).
  `);
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       ADD NEW TOPIC TO VOCAB WORLD                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 Topic Configuration:`);
  console.log(`   ID: ${TOPIC_CONFIG.id}`);
  console.log(`   Name: ${TOPIC_CONFIG.name}`);
  console.log(`   Description: ${TOPIC_CONFIG.description}`);
  console.log(`   Vocabulary Words: ${VOCABULARY_WORDS.length}`);
  console.log(`   Languages: ${LANGUAGES.length}`);
  console.log(`   Estimated Translations: ${VOCABULARY_WORDS.length * LANGUAGES.length}`);
  
  console.log('\n⏱️  Estimated time: ~15-20 minutes (with translations)');
  console.log('    - Topic insertion: ~1 second');
  console.log('    - Vocabulary insertion: ~5 seconds');
  console.log('    - Word translations: ~10-15 minutes');
  console.log('    - Topic translations: ~2-3 minutes');
  
  console.log('\n🚀 Starting process...');

  // Step 1: Insert topic
  const topicSuccess = await insertTopic();
  if (!topicSuccess) {
    console.log('\n❌ Failed to insert topic. Aborting.');
    return;
  }

  // Step 2: Insert vocabulary
  const vocabSuccess = await insertVocabulary();
  if (!vocabSuccess) {
    console.log('\n❌ Failed to insert vocabulary. Aborting.');
    return;
  }

  // Step 3: Generate translations (optional but recommended)
  if (geminiApiKey) {
    const translationsSuccess = await generateAndInsertTranslations();
    if (!translationsSuccess) {
      console.log('\n⚠️  Translations partially completed or failed');
    }

    // Step 4: Generate topic name translations
    await generateTopicTranslations();
  }

  // Step 5: Frontend update instructions
  await updateFrontendCode();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Topic: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`);
  console.log(`✅ Vocabulary: ${VOCABULARY_WORDS.length} words inserted`);
  console.log(`${geminiApiKey ? '✅' : '⚠️ '} Translations: ${geminiApiKey ? 'Generated' : 'SKIPPED (add Gemini API key)'}`);
  console.log(`${geminiApiKey ? '✅' : '⚠️ '} Topic translations: ${geminiApiKey ? 'Generated' : 'SKIPPED (add Gemini API key)'}`);
  console.log('\n📋 Next Steps:');
  console.log('   1. Update app/api/topics/route.ts (see instructions above)');
  console.log('   2. Generate audio files (separate script)');
  console.log('   3. Generate example sentences (optional, separate script)');
  console.log('   4. Deploy to production');
  console.log('\n🎉 Topic setup complete!\n');
}

// Run the script
main().catch(console.error);
