/**
 * ADD GRAMMAR TOPIC - Using Direct REST API (No SDK issues)
 * Based on successful common-phrases translation approach
 * 
 * Usage:
 * Test: node scripts/add-grammar-topic-rest-api.mjs --test
 * Full: node scripts/add-grammar-topic-rest-api.mjs --full
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

// ============================================================
// CONFIGURATION
// ============================================================

const TOPIC_CONFIG = {
  id: 43,
  name: 'Grammar',
  description: 'Essential grammar words and structures'
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

// Grammar words with exact order
const GRAMMAR_WORDS = [
  // Subject Pronouns
  { word: 'I', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'you', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'he', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'she', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'it', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'we', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  { word: 'they', partOfSpeech: 'pronoun', difficulty: 1, context: 'SUBJECT PRONOUNS' },
  // Object Pronouns
  { word: 'me', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'you', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'him', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'her', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'it', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'us', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  { word: 'them', partOfSpeech: 'pronoun', difficulty: 1, context: 'OBJECT PRONOUNS' },
  // Possessive Adjectives
  { word: 'my', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'your', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'his', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'her', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'its', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'our', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  { word: 'their', partOfSpeech: 'adjective', difficulty: 1, context: 'POSSESSIVE ADJECTIVES' },
  // Possessive Pronouns
  { word: 'mine', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  { word: 'yours', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  { word: 'his', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  { word: 'hers', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  { word: 'ours', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  { word: 'theirs', partOfSpeech: 'pronoun', difficulty: 1, context: 'POSSESSIVE PRONOUNS' },
  // Reflexive Pronouns
  { word: 'myself', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'yourself', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'yourselves', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'himself', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'herself', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'itself', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'ourselves', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  { word: 'themselves', partOfSpeech: 'pronoun', difficulty: 2, context: 'REFLEXIVE PRONOUNS' },
  // Demonstrative Words
  { word: 'this', partOfSpeech: 'determiner', difficulty: 1, context: 'DEMONSTRATIVE WORDS' },
  { word: 'that', partOfSpeech: 'determiner', difficulty: 1, context: 'DEMONSTRATIVE WORDS' },
  { word: 'these', partOfSpeech: 'determiner', difficulty: 1, context: 'DEMONSTRATIVE WORDS' },
  { word: 'those', partOfSpeech: 'determiner', difficulty: 1, context: 'DEMONSTRATIVE WORDS' },
  // Interrogative & Relative Words
  { word: 'who', partOfSpeech: 'pronoun', difficulty: 1, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'whom', partOfSpeech: 'pronoun', difficulty: 2, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'whose', partOfSpeech: 'pronoun', difficulty: 2, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'what', partOfSpeech: 'pronoun', difficulty: 1, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'which', partOfSpeech: 'pronoun', difficulty: 1, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'that', partOfSpeech: 'pronoun', difficulty: 1, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'whoever', partOfSpeech: 'pronoun', difficulty: 2, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'whatever', partOfSpeech: 'pronoun', difficulty: 2, context: 'INTERROGATIVE & RELATIVE WORDS' },
  { word: 'whichever', partOfSpeech: 'pronoun', difficulty: 2, context: 'INTERROGATIVE & RELATIVE WORDS' },
  // Indefinite Pronouns
  { word: 'someone', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'anyone', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'everyone', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'no one', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'somebody', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'anybody', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'everybody', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'nobody', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'something', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'anything', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'everything', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  { word: 'nothing', partOfSpeech: 'pronoun', difficulty: 1, context: 'INDEFINITE PRONOUNS' },
  // Quantifiers
  { word: 'all', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'some', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'any', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'none', partOfSpeech: 'pronoun', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'each', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'every', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'both', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'either', partOfSpeech: 'determiner', difficulty: 2, context: 'QUANTIFIERS' },
  { word: 'neither', partOfSpeech: 'determiner', difficulty: 2, context: 'QUANTIFIERS' },
  { word: 'few', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'a few', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'little', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'a little', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'many', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'much', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'more', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'most', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'less', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  { word: 'least', partOfSpeech: 'determiner', difficulty: 1, context: 'QUANTIFIERS' },
  // Reciprocal Pronouns
  { word: 'each other', partOfSpeech: 'pronoun', difficulty: 2, context: 'RECIPROCAL PRONOUNS' },
  { word: 'one another', partOfSpeech: 'pronoun', difficulty: 2, context: 'RECIPROCAL PRONOUNS' },
  // Reference / Substitute Words
  { word: 'one', partOfSpeech: 'pronoun', difficulty: 1, context: 'REFERENCE / SUBSTITUTE WORDS' },
  { word: 'ones', partOfSpeech: 'pronoun', difficulty: 1, context: 'REFERENCE / SUBSTITUTE WORDS' },
  { word: 'other', partOfSpeech: 'pronoun', difficulty: 1, context: 'REFERENCE / SUBSTITUTE WORDS' },
  { word: 'another', partOfSpeech: 'pronoun', difficulty: 1, context: 'REFERENCE / SUBSTITUTE WORDS' },
  { word: 'same', partOfSpeech: 'adjective', difficulty: 1, context: 'REFERENCE / SUBSTITUTE WORDS' },
  // Existential / Dummy Words
  { word: 'there', partOfSpeech: 'adverb', difficulty: 1, context: 'EXISTENTIAL / DUMMY WORDS' },
  { word: 'it', partOfSpeech: 'pronoun', difficulty: 1, context: 'EXISTENTIAL / DUMMY WORDS' },
  // Verb "To Be"
  { word: 'am', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'is', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'are', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'was', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'were', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'be', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'being', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  { word: 'been', partOfSpeech: 'verb', difficulty: 1, context: 'VERB "TO BE"' },
  // Auxiliary & Modal Verbs
  { word: 'do', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'does', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'did', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'have', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'has', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'had', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'will', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'would', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'can', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'could', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'shall', partOfSpeech: 'verb', difficulty: 2, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'should', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'may', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'might', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'must', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  // Negation & Limiting Words
  { word: 'no', partOfSpeech: 'determiner', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'not', partOfSpeech: 'adverb', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'never', partOfSpeech: 'adverb', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'none', partOfSpeech: 'pronoun', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'nothing', partOfSpeech: 'pronoun', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'nobody', partOfSpeech: 'pronoun', difficulty: 1, context: 'NEGATION & LIMITING WORDS' },
  { word: 'neither', partOfSpeech: 'determiner', difficulty: 2, context: 'NEGATION & LIMITING WORDS' },
  // Conjunctions
  { word: 'and', partOfSpeech: 'conjunction', difficulty: 1, context: 'CONJUNCTIONS' },
  { word: 'or', partOfSpeech: 'conjunction', difficulty: 1, context: 'CONJUNCTIONS' },
  { word: 'but', partOfSpeech: 'conjunction', difficulty: 1, context: 'CONJUNCTIONS' },
  { word: 'so', partOfSpeech: 'conjunction', difficulty: 1, context: 'CONJUNCTIONS' },
  { word: 'yet', partOfSpeech: 'conjunction', difficulty: 2, context: 'CONJUNCTIONS' },
  // Prepositions
  { word: 'in', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'on', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'at', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'to', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'for', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'with', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'from', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'by', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
  { word: 'of', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' }
];

const ALL_LANGUAGES = [
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

const TEST_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }
];

// ============================================================
// SUPABASE INIT
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function translateBatchWithGemini(words, targetLanguageCode, targetLanguageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const wordList = words.map((w, idx) => `${idx + 1}. ${w.word_en}`).join('\n');
  
  const prompt = `You are a professional translator specializing in grammar and linguistic terminology.

TASK: Translate these English grammar words to ${targetLanguageName}

CONTEXT: These are grammatical function words (pronouns, determiners, conjunctions, prepositions, auxiliary verbs).

WORDS (${words.length} total):
${wordList}

RULES:
1. Provide accurate grammatical equivalents in ${targetLanguageName}
2. For pronouns, use the most common/neutral form
3. For verbs, use the infinitive or most basic form
4. For multi-word expressions, keep as single unit
5. Return EXACT number of translations: ${words.length}

Respond in this exact JSON format (no markdown, no code blocks, just pure JSON):
{
  "word1": "translation1",
  "word2": "translation2"
}

Replace "word1", "word2" with the EXACT English words from the list above.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `API Error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!responseText) {
      return { error: 'Empty response from API' };
    }

    // Clean response
    let cleanedResponse = responseText;
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    try {
      const translations = JSON.parse(cleanedResponse);
      return { success: true, translations };
    } catch (parseError) {
      return { error: `JSON parse error: ${parseError.message}` };
    }
  } catch (error) {
    return { error: `Network error: ${error.message}` };
  }
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

async function insertTopic() {
  console.log('\n📌 Step 1: Upserting topic...');
  
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
  
  console.log(`✅ Topic ready: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`);
  return true;
}

async function cleanupDuplicates() {
  console.log('\n📌 Step 2: Cleaning up any duplicate words...');
  
  // Delete all existing words for this topic
  const { error } = await supabase
    .from('vocabulary')
    .delete()
    .eq('topic_id', TOPIC_CONFIG.id);

  if (error) {
    console.error('❌ Error cleaning up:', error);
    return false;
  }
  
  console.log('✅ Cleanup complete');
  return true;
}

async function insertVocabulary() {
  console.log(`\n📌 Step 3: Inserting ${GRAMMAR_WORDS.length} vocabulary words...`);
  
  const vocabularyData = GRAMMAR_WORDS.map((word, index) => ({
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

    if (error) {
      console.error(`\n❌ Error inserting batch:`, error.message);
      return false;
    }
    
    inserted += batch.length;
    process.stdout.write(`\r   Progress: ${inserted}/${vocabularyData.length} words`);
  }
  
  console.log('\n✅ Vocabulary words inserted');
  return true;
}

async function generateTranslations(languages, testMode) {
  const modeLabel = testMode ? 'TEST' : 'FULL';
  console.log(`\n📌 Step 4: Generating translations (${modeLabel} MODE)...`);
  console.log(`   Languages: ${languages.length}`);
  console.log('   ⏳ This will take several minutes...\n');

  // Fetch vocabulary
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_CONFIG.id)
    .order('learning_order');

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return false;
  }

  console.log(`   Vocabulary words: ${vocabulary.length}\n`);

  let totalTranslations = 0;
  let successfulLanguages = 0;
  const results = [];

  for (const lang of languages) {
    process.stdout.write(`\n🌐 ${lang.name.padEnd(15)} ... `);
    
    const result = await translateBatchWithGemini(vocabulary, lang.code, lang.name);
    
    if (result.error) {
      console.log(`❌ ${result.error}`);
      results.push({ lang: lang.name, status: 'ERROR', error: result.error });
      await delay(3000); // Wait longer on error
      continue;
    }

    const translations = result.translations;
    
    // Match translations to vocabulary
    const translationData = [];
    for (const word of vocabulary) {
      const translation = translations[word.word_en];
      if (translation) {
        translationData.push({
          vocabulary_id: word.id,
          language_code: lang.code,
          translated_word: translation
        });
      }
    }

    if (translationData.length !== vocabulary.length) {
      console.log(`⚠️  Got ${translationData.length}/${vocabulary.length} translations`);
    }

    // Insert translations
    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(translationData);

    if (error && !error.message?.includes('duplicate')) {
      console.log(`❌ DB Error: ${error.message}`);
      results.push({ lang: lang.name, status: 'DB_ERROR', error: error.message });
      continue;
    }

    console.log(`✅ ${translationData.length} translations`);
    totalTranslations += translationData.length;
    successfulLanguages++;
    results.push({ lang: lang.name, status: 'SUCCESS', count: translationData.length });
    
    // Rate limiting
    await delay(2000);
  }

  console.log(`\n\n✅ Translation complete!`);
  console.log(`   Successful: ${successfulLanguages}/${languages.length} languages`);
  console.log(`   Total translations: ${totalTranslations}`);

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `grammar-translations-${testMode ? 'test' : 'full'}-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify({ results, summary: { successfulLanguages, totalTranslations } }, null, 2));
  console.log(`\n📄 Results saved: ${filename}`);

  return successfulLanguages === languages.length;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const fullMode = args.includes('--full');

  if (!testMode && !fullMode) {
    console.log('\n❌ Specify mode: --test or --full\n');
    process.exit(1);
  }

  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║       GRAMMAR TOPIC - ${testMode ? 'TEST MODE ' : 'FULL MODE'}                   ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 Configuration:`);
  console.log(`   Topic ID: ${TOPIC_CONFIG.id}`);
  console.log(`   Words: ${GRAMMAR_WORDS.length}`);
  console.log(`   Languages: ${languages.length}`);
  console.log(`   Translations: ${GRAMMAR_WORDS.length * languages.length}\n`);

  // Execute steps
  if (!await insertTopic()) return;
  if (!await cleanupDuplicates()) return;
  if (!await insertVocabulary()) return;
  await generateTranslations(languages, testMode);

  console.log('\n🎉 Done!\n');
  
  if (testMode) {
    console.log('📋 Review results, then run: node scripts/add-grammar-topic-rest-api.mjs --full\n');
  } else {
    console.log('📋 Next: Update app/api/topics/route.ts to add topic to frontend\n');
  }
}

main().catch(console.error);
