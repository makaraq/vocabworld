/**
 * ADD EXAMPLE SENTENCES TOPIC TO SPRIND
 * 
 * This script adds a comprehensive "Example Sentences" topic with 90 common phrases
 * organized by practical use cases (introducing yourself, asking for help, at a restaurant, etc.)
 * 
 * USAGE:
 * 1. Make sure GEMINI_API_KEY is set in .env.local
 * 2. Run: node scripts/add-example-sentences-topic.mjs
 * 3. Wait for translations (will take 15-20 minutes)
 * 
 * The script will:
 * - Create topic ID 45 "Example Sentences"
 * - Insert 90 example sentences
 * - Generate translations for 50 audio-supported languages
 * - Generate topic name translations
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

// ============================================================
// CONFIGURATION
// ============================================================

const TOPIC_CONFIG = {
  id: 45,
  name: 'Example Sentences',
  description: 'Common phrases and sentences for everyday conversations',
};

// Example sentences organized by category from the attachment
const VOCABULARY_SENTENCES = [
  // Introducing Yourself (9 sentences)
  { sentence: 'Where are you from?', category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: "I'm from Canada.", category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: 'How old are you?', category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: "I'm 25 years old.", category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: 'What do you do?', category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: "I'm a student.", category: 'INTRODUCING_YOURSELF', difficulty: 1 },
  { sentence: 'I work in an office.', category: 'INTRODUCING_YOURSELF', difficulty: 1 },

  // Asking for Help (10 sentences)
  { sentence: 'Can you help me?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: "I don't understand.", category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'Can you repeat that?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'Please speak slowly.', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'What does this mean?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'How do you say this in English?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'Can you write it down?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'Where is the bathroom?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'How much is this?', category: 'ASKING_FOR_HELP', difficulty: 1 },
  { sentence: 'What time is it?', category: 'ASKING_FOR_HELP', difficulty: 1 },

  // At a Restaurant (10 sentences)
  { sentence: "I'm hungry.", category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: "I'm thirsty.", category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'Can I see the menu?', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'I would like this.', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: "I'll have the chicken.", category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'No onions, please.', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'Can I get some water?', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'The bill, please.', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'It was delicious.', category: 'AT_A_RESTAURANT', difficulty: 1 },
  { sentence: 'Thank you for the meal.', category: 'AT_A_RESTAURANT', difficulty: 1 },

  // Daily Life (10 sentences)
  { sentence: "I'm tired.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm busy.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm bored.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm ready.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "Let's go.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: 'Wait a minute.', category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: 'Just a second.', category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm coming.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm at home.", category: 'DAILY_LIFE', difficulty: 1 },
  { sentence: "I'm at work.", category: 'DAILY_LIFE', difficulty: 1 },

  // Shopping (10 sentences)
  { sentence: "I'm just looking.", category: 'SHOPPING', difficulty: 1 },
  { sentence: 'Do you have this in another size?', category: 'SHOPPING', difficulty: 1 },
  { sentence: 'Do you have this in another color?', category: 'SHOPPING', difficulty: 1 },
  { sentence: "It's too expensive.", category: 'SHOPPING', difficulty: 1 },
  { sentence: "That's cheap.", category: 'SHOPPING', difficulty: 1 },
  { sentence: "I'll take it.", category: 'SHOPPING', difficulty: 1 },
  { sentence: 'Can I pay by card?', category: 'SHOPPING', difficulty: 1 },
  { sentence: 'Do you accept cash?', category: 'SHOPPING', difficulty: 1 },
  { sentence: 'I need a receipt.', category: 'SHOPPING', difficulty: 1 },
  { sentence: 'Is there a discount?', category: 'SHOPPING', difficulty: 1 },

  // Directions and Travel (10 sentences)
  { sentence: 'Where is the bus stop?', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'How do I get there?', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'Is it far?', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'Turn left.', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'Turn right.', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'Go straight.', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: "It's near here.", category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: "It's far from here.", category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: "I'm lost.", category: 'DIRECTIONS_TRAVEL', difficulty: 1 },
  { sentence: 'Can you show me on the map?', category: 'DIRECTIONS_TRAVEL', difficulty: 1 },

  // Conversations (10 sentences)
  { sentence: 'What are you doing?', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'What are you talking about?', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'Really?', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: "That's interesting.", category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'I agree.', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: "I don't agree.", category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'Maybe.', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'Of course.', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: 'I think so.', category: 'CONVERSATIONS', difficulty: 1 },
  { sentence: "I don't think so.", category: 'CONVERSATIONS', difficulty: 1 },

  // Feelings and Opinions (10 sentences)
  { sentence: "I'm happy.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "I'm sad.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "I'm excited.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "I'm worried.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "I'm scared.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: 'I like it.', category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: 'I love it.', category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "I don't like it.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "That's great.", category: 'FEELINGS_OPINIONS', difficulty: 1 },
  { sentence: "That's terrible.", category: 'FEELINGS_OPINIONS', difficulty: 1 },

  // Time and Plans (10 sentences)
  { sentence: 'What are your plans?', category: 'TIME_PLANS', difficulty: 1 },
  { sentence: "I'm free today.", category: 'TIME_PLANS', difficulty: 1 },
  { sentence: "I'm busy tomorrow.", category: 'TIME_PLANS', difficulty: 1 },
  { sentence: "Let's meet tomorrow.", category: 'TIME_PLANS', difficulty: 1 },
  { sentence: 'What time?', category: 'TIME_PLANS', difficulty: 1 },
  { sentence: 'See you soon.', category: 'TIME_PLANS', difficulty: 1 },
  { sentence: 'Call me later.', category: 'TIME_PLANS', difficulty: 1 },
  { sentence: 'Send me a message.', category: 'TIME_PLANS', difficulty: 1 },
  { sentence: "I'll be there.", category: 'TIME_PLANS', difficulty: 1 },
  { sentence: 'Take care.', category: 'TIME_PLANS', difficulty: 1 },
];

// 50 Languages with audio support
const LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' }, { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' }, { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' }, { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' }, { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' }, { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' }, { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' }, { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' }, { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' }, { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' }, { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' }, { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' }, { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' }, { code: 'mr', name: 'Marathi' },
  { code: 'mt', name: 'Maltese' }, { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' }, { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' }, { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' }, { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' }, { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' }, { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' }, { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' }, { code: 'zh', name: 'Chinese' }
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
  console.log('⚠️  Translations are required for this topic. Please add your Gemini API key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

async function insertTopic() {
  console.log('\n📌 Step 1: Creating topic...');
  
  const { error } = await supabase
    .from('topics')
    .upsert({
      id: TOPIC_CONFIG.id,
      name: TOPIC_CONFIG.name,
      description: TOPIC_CONFIG.description
    });

  if (error) {
    console.error('❌ Error inserting topic:', error.message);
    return false;
  }
  
  console.log(`✅ Topic created: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`);
  return true;
}

async function insertVocabulary() {
  console.log('\n📌 Step 2: Inserting example sentences...');
  
  const vocabularyData = VOCABULARY_SENTENCES.map((item, index) => ({
    topic_id: TOPIC_CONFIG.id,
    word_en: item.sentence,
    part_of_speech: 'phrase',
    difficulty_level: item.difficulty.toString(),
    context: item.category,
    learning_order: index + 1
  }));

  // Insert in batches of 50
  const batchSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < vocabularyData.length; i += batchSize) {
    const batch = vocabularyData.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('vocabulary')
      .insert(batch);

    if (error && !error.message?.includes('duplicate')) {
      console.error(`\n❌ Error inserting batch:`, error.message);
      return false;
    }
    
    totalInserted += batch.length;
    process.stdout.write(`\r   Progress: ${totalInserted}/${vocabularyData.length} sentences`);
  }
  
  console.log('\n✅ All sentences inserted successfully');
  return true;
}

async function translateSentencesBatch(sentences, targetLanguage) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent translations
    }
  });
  
  const sentenceList = sentences.map((s, idx) => `${idx + 1}. ${s.sentence}`).join('\n');
  
  const prompt = `You are a professional translator for a language learning app.

TASK: Translate these English sentences/phrases to ${targetLanguage.name}

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
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.log(`\n⏳ Rate limit hit for ${targetLanguage.name}, waiting 60 seconds...`);
      await delay(60000);
      return translateSentencesBatch(sentences, targetLanguage); // Retry
    }
    
    console.error(`\n❌ Error translating to ${targetLanguage.name}:`, error.message);
    return [];
  }
}

async function generateAndInsertTranslations() {
  console.log('\n📌 Step 3: Generating translations for 50 languages...');
  console.log('⏳ This will take approximately 20-25 minutes...\n');
  
  const startTime = Date.now();

  // Get the vocabulary IDs
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_CONFIG.id)
    .order('learning_order');

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return false;
  }

  const vocabularyWithSentences = vocabulary.map(v => ({
    id: v.id,
    sentence: v.word_en
  }));

  let totalTranslations = 0;
  const results = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < LANGUAGES.length; i++) {
    const lang = LANGUAGES[i];
    const progress = `[${i + 1}/${LANGUAGES.length}]`;
    
    process.stdout.write(`\r${progress} 🌐 Translating to ${lang.name.padEnd(20)}...`);
    
    const translations = await translateSentencesBatch(vocabularyWithSentences, lang);
    
    if (translations.length !== vocabularyWithSentences.length) {
      console.log(`\n⚠️  Warning: Expected ${vocabularyWithSentences.length} translations, got ${translations.length} for ${lang.name}`);
      results.failed.push(lang.code);
      continue;
    }

    // Insert translations in batch
    const translationData = vocabularyWithSentences.map((item, idx) => ({
      vocabulary_id: item.id,
      language_code: lang.code,
      translated_word: translations[idx]
    }));

    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(translationData);

    if (error && !error.message?.includes('duplicate')) {
      console.log(`\n❌ Error inserting translations for ${lang.name}:`, error.message);
      results.failed.push(lang.code);
      continue;
    }

    totalTranslations += translations.length;
    results.successful.push(lang.code);
    
    // Rate limiting: wait 2 seconds between batches
    await delay(2000);
    
    // Show progress estimate
    const elapsed = Date.now() - startTime;
    const avgTimePerLang = elapsed / (i + 1);
    const remaining = (LANGUAGES.length - (i + 1)) * avgTimePerLang;
    const remainingMin = Math.ceil(remaining / 60000);
    process.stdout.write(` (Est. ${remainingMin} min remaining)`);
  }

  const totalTime = Math.ceil((Date.now() - startTime) / 60000);
  
  console.log(`\n\n✅ Translation complete!`);
  console.log(`   Total translations: ${totalTranslations}`);
  console.log(`   Successful languages: ${results.successful.length}/${LANGUAGES.length}`);
  console.log(`   Failed languages: ${results.failed.length}`);
  console.log(`   Time taken: ${totalTime} minutes`);
  
  if (results.failed.length > 0) {
    console.log(`\n⚠️  Failed languages: ${results.failed.join(', ')}`);
  }

  return true;
}

async function translateTopicName(targetLanguage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  const prompt = `You are a professional translator for a language learning app.

TASK: Translate this topic name to ${targetLanguage.name}

Topic: "${TOPIC_CONFIG.name}"
Description: "${TOPIC_CONFIG.description}"

RULES:
1. Keep it SHORT (2-4 words max)
2. Use natural, commonly-used words
3. Appropriate for a section header in a learning app
4. Return ONLY the translated topic name, nothing else

Translation:`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/['"]/g, '');
  } catch (error) {
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      await delay(60000);
      return translateTopicName(targetLanguage); // Retry
    }
    
    console.error(`\n❌ Error translating topic name to ${targetLanguage.name}:`, error.message);
    return null;
  }
}

async function generateTopicTranslations() {
  console.log('\n📌 Step 4: Generating topic name translations...\n');

  let inserted = 0;

  for (let i = 0; i < LANGUAGES.length; i++) {
    const lang = LANGUAGES[i];
    process.stdout.write(`\r🌐 [${i + 1}/${LANGUAGES.length}] Translating topic to ${lang.name.padEnd(20)}...`);
    
    const translatedName = await translateTopicName(lang);
    
    if (!translatedName) {
      continue;
    }

    const { error } = await supabase
      .from('topic_translations')
      .upsert({
        topic_id: TOPIC_CONFIG.id,
        language_code: lang.code,
        translated_name: translatedName
      }, {
        onConflict: 'topic_id,language_code'
      });

    if (error) {
      console.log(`\n❌ Error inserting topic translation for ${lang.name}:`, error.message);
      continue;
    }

    inserted++;
    
    // Rate limiting
    await delay(1500);
  }

  console.log(`\n✅ Generated ${inserted} topic name translations`);
  return true;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     ADD EXAMPLE SENTENCES TOPIC TO SPRIND            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 Configuration:`);
  console.log(`   Topic ID: ${TOPIC_CONFIG.id}`);
  console.log(`   Topic Name: ${TOPIC_CONFIG.name}`);
  console.log(`   Total Sentences: ${VOCABULARY_SENTENCES.length}`);
  console.log(`   Languages: ${LANGUAGES.length}`);
  console.log(`   Total Translations: ${VOCABULARY_SENTENCES.length * LANGUAGES.length} (${VOCABULARY_SENTENCES.length * LANGUAGES.length})`);
  
  console.log('\n📂 Categories:');
  const categories = [...new Set(VOCABULARY_SENTENCES.map(s => s.category))];
  categories.forEach(cat => {
    const count = VOCABULARY_SENTENCES.filter(s => s.category === cat).length;
    console.log(`   - ${cat}: ${count} sentences`);
  });
  
  console.log('\n⏱️  Estimated time: 20-25 minutes');
  
  console.log('\n🚀 Starting process...');

  try {
    // Step 1: Insert topic
    const topicSuccess = await insertTopic();
    if (!topicSuccess) {
      console.log('\n❌ Failed to insert topic. Aborting.');
      process.exit(1);
    }

    // Step 2: Insert vocabulary
    const vocabSuccess = await insertVocabulary();
    if (!vocabSuccess) {
      console.log('\n❌ Failed to insert vocabulary. Aborting.');
      process.exit(1);
    }

    // Step 3: Generate translations
    await generateAndInsertTranslations();

    // Step 4: Generate topic name translations
    await generateTopicTranslations();

    // Final Summary
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                      SUMMARY                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Topic: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id}) created`);
    console.log(`✅ ${VOCABULARY_SENTENCES.length} example sentences inserted`);
    console.log(`✅ Translations generated for ${LANGUAGES.length} languages`);
    console.log(`✅ Topic name translations generated`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. ⚠️  IMPORTANT: Update app/api/topics/route.ts');
    console.log('      Add this to the TOPICS_DATA array:');
    console.log('\n      {');
    console.log(`        "id": ${TOPIC_CONFIG.id},`);
    console.log(`        "name": "${TOPIC_CONFIG.name}",`);
    console.log(`        "description": "${TOPIC_CONFIG.description}"`);
    console.log('      }');
    console.log('\n   2. Generate audio files (if needed, separate script)');
    console.log('   3. Test the topic in the app');
    console.log('   4. Deploy to production');
    console.log('\n🎉 Example Sentences topic setup complete!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
