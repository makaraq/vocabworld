/**
 * ADD GRAMMAR TOPIC TO SPRIND
 * 
 * This script adds the Grammar topic with all grammatical words and generates
 * translations for 50 languages.
 * 
 * USAGE:
 * 1. Test batch (3 categories, 5 languages): node scripts/add-grammar-topic.mjs --test
 * 2. Full run (all words, all languages): node scripts/add-grammar-topic.mjs --full
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
  id: 43,
  name: 'Grammar',
  description: 'Essential grammar words and structures'
};

// All grammar words organized by category (EXACT ORDER from file)
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

  // Auxiliary & Modal Verbs - Do
  { word: 'do', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'does', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'did', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },

  // Auxiliary & Modal Verbs - Have
  { word: 'have', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'has', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },
  { word: 'had', partOfSpeech: 'verb', difficulty: 1, context: 'AUXILIARY & MODAL VERBS' },

  // Auxiliary & Modal Verbs - Modals
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
  { word: 'of', partOfSpeech: 'preposition', difficulty: 1, context: 'PREPOSITIONS' },
];

// 50 Supported Languages
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

// Test configuration
const TEST_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'tr', name: 'Turkish' }
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// ============================================================
// FUNCTIONS
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

async function insertVocabulary(words) {
  console.log(`\n📌 Step 2: Inserting ${words.length} vocabulary words...`);
  
  const vocabularyData = words.map((word, index) => ({
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  const wordList = words.map((w, idx) => `${idx + 1}. ${w.word_en}`).join('\n');
  
  const prompt = `You are a professional translator specializing in grammar and linguistic terminology for language learning apps.

TASK: Translate these English grammar words to ${targetLanguage.name}

CONTEXT: These are grammatical function words (pronouns, determiners, conjunctions, prepositions, auxiliary verbs).
Many of these are fundamental building blocks of language and may have direct equivalents.

WORDS:
${wordList}

RULES:
1. Provide accurate grammatical equivalents in ${targetLanguage.name}
2. For pronouns, use the most common/neutral form
3. For verbs, use the infinitive or most basic form
4. For multi-word expressions (e.g., "no one", "each other"), keep as a single unit
5. Maintain the EXACT order
6. Return ONLY the translations in numbered list format:
1. [translation]
2. [translation]
...

CRITICAL: 
- Total lines MUST equal ${words.length}
- NO explanations, NO additional text
- Keep translations concise and accurate`;

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

async function generateAndInsertTranslations(languages, testMode = false) {
  const modeLabel = testMode ? 'TEST BATCH' : 'FULL';
  console.log(`\n📌 Step 3: Generating translations (${modeLabel})...`);
  console.log(`   Languages: ${languages.length}`);
  console.log('   ⏳ This will take several minutes...\n');

  // Fetch vocabulary IDs
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_CONFIG.id)
    .order('learning_order');

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError);
    return false;
  }

  console.log(`   Vocabulary words found: ${vocabulary.length}\n`);

  let totalTranslations = 0;
  let successfulLanguages = 0;
  const results = [];

  for (const lang of languages) {
    process.stdout.write(`\r🌐 Translating to ${lang.name.padEnd(15)}...`);
    
    const translations = await translateWordsBatch(vocabulary, lang);
    
    if (translations.length !== vocabulary.length) {
      console.log(`\n⚠️  Warning: Expected ${vocabulary.length} translations, got ${translations.length} for ${lang.name}`);
      results.push({ lang: lang.name, status: 'MISMATCH', expected: vocabulary.length, got: translations.length });
      continue;
    }

    // Insert translations
    const translationData = vocabulary.map((word, idx) => ({
      vocabulary_id: word.id,
      language_code: lang.code,
      translated_word: translations[idx]
    }));

    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(translationData);

    if (error && !error.message?.includes('duplicate')) {
      console.log(`\n❌ Error inserting translations for ${lang.name}:`, error.message);
      results.push({ lang: lang.name, status: 'ERROR', error: error.message });
      continue;
    }

    totalTranslations += translations.length;
    successfulLanguages++;
    results.push({ lang: lang.name, status: 'SUCCESS', count: translations.length });
    
    // Rate limiting: wait 2 seconds between language batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n\n✅ Translation complete!`);
  console.log(`   Successful languages: ${successfulLanguages}/${languages.length}`);
  console.log(`   Total translations: ${totalTranslations}`);

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `grammar-translations-${testMode ? 'test' : 'full'}-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${filename}`);

  return true;
}

async function translateTopicName(targetLanguage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  const prompt = `Translate this topic name to ${targetLanguage.name}:

Topic: "${TOPIC_CONFIG.name}"

Return ONLY the translated topic name (1-2 words), nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`\n❌ Error translating topic name to ${targetLanguage.name}:`, error.message);
    return null;
  }
}

async function generateTopicTranslations(languages, testMode = false) {
  const modeLabel = testMode ? 'TEST BATCH' : 'FULL';
  console.log(`\n📌 Step 4: Generating topic name translations (${modeLabel})...\n`);

  let inserted = 0;

  for (const lang of languages) {
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
        translated_description: TOPIC_CONFIG.description
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

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const fullMode = args.includes('--full');

  if (!testMode && !fullMode) {
    console.log('\n❌ Please specify mode:');
    console.log('   --test   Run test batch (first 3 categories, 5 languages)');
    console.log('   --full   Run full process (all words, all 50 languages)\n');
    console.log('Example: node scripts/add-grammar-topic.mjs --test');
    process.exit(1);
  }

  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES;
  const words = testMode ? GRAMMAR_WORDS.slice(0, 21) : GRAMMAR_WORDS; // First 3 categories for test

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║       ADD GRAMMAR TOPIC - ${testMode ? 'TEST MODE' : 'FULL MODE'}                    ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 Configuration:`);
  console.log(`   Topic ID: ${TOPIC_CONFIG.id}`);
  console.log(`   Topic Name: ${TOPIC_CONFIG.name}`);
  console.log(`   Vocabulary Words: ${words.length} ${testMode ? '(first 3 categories)' : '(all categories)'}`);
  console.log(`   Languages: ${languages.length} ${testMode ? '(test batch)' : '(all languages)'}`);
  console.log(`   Estimated Translations: ${words.length * languages.length}`);
  
  if (testMode) {
    console.log(`\n🧪 TEST MODE - Categories included:`);
    const categories = [...new Set(words.map(w => w.context))];
    categories.forEach(cat => console.log(`      - ${cat}`));
    console.log(`\n   Test Languages: ${languages.map(l => l.name).join(', ')}`);
  }
  
  console.log('\n⏱️  Estimated time:');
  console.log(`   - Topic insertion: ~1 second`);
  console.log(`   - Vocabulary insertion: ~5 seconds`);
  console.log(`   - Word translations: ~${Math.ceil(languages.length * 2 / 60)} minutes`);
  console.log(`   - Topic translations: ~${Math.ceil(languages.length * 1.5 / 60)} minutes`);
  
  console.log('\n🚀 Starting process...');

  // Step 1: Insert topic
  const topicSuccess = await insertTopic();
  if (!topicSuccess) {
    console.log('\n❌ Failed to insert topic. Aborting.');
    return;
  }

  // Step 2: Insert vocabulary
  const vocabSuccess = await insertVocabulary(words);
  if (!vocabSuccess) {
    console.log('\n❌ Failed to insert vocabulary. Aborting.');
    return;
  }

  // Step 3: Generate translations
  const translationsSuccess = await generateAndInsertTranslations(languages, testMode);
  if (!translationsSuccess) {
    console.log('\n⚠️  Translations partially completed or failed');
  }

  // Step 4: Generate topic name translations
  await generateTopicTranslations(languages, testMode);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Topic: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`);
  console.log(`✅ Vocabulary: ${words.length} words inserted`);
  console.log(`✅ Translations: Generated for ${languages.length} languages`);
  console.log(`✅ Topic translations: Generated for ${languages.length} languages`);
  
  if (testMode) {
    console.log('\n🧪 TEST BATCH COMPLETE!');
    console.log('\n📋 Review results, then run full batch:');
    console.log('   node scripts/add-grammar-topic.mjs --full');
  } else {
    console.log('\n🎉 FULL SETUP COMPLETE!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Update app/api/topics/route.ts');
    console.log('   2. Add to TOPICS_DATA array:');
    console.log('      {');
    console.log(`        "id": ${TOPIC_CONFIG.id},`);
    console.log(`        "name": "${TOPIC_CONFIG.name}",`);
    console.log(`        "description": "${TOPIC_CONFIG.description}"`);
    console.log('      }');
    console.log('   3. Deploy to production');
  }
  
  console.log('\n✨ Done!\n');
}

// Run the script
main().catch(console.error);
