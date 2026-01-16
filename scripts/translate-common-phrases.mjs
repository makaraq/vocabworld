/**
 * Common Phrases Translation Script using Gemini AI
 * Node.js version - run with: node scripts/translate-common-phrases.mjs
 */

import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

// Load .env.local file
config({ path: '.env.local' });

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-exp-1206' });

// 49 target languages (excluding English)
const TARGET_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'et', name: 'Estonian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'is', name: 'Icelandic' },
  { code: 'el', name: 'Greek' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'fa', name: 'Persian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'sw', name: 'Swahili' },
  { code: 'am', name: 'Amharic' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' }
];

/**
 * Create context-aware translation prompt
 */
function createTranslationPrompt(phrase, category, categoryDescription, targetLanguage) {
  return `You are a professional translator specializing in natural, context-aware translations.

CONTEXT:
Category: ${category}
Description: ${categoryDescription}
English Phrase: "${phrase}"
Target Language: ${targetLanguage}

TASK:
Translate this phrase into ${targetLanguage}. Consider:
1. The category context and how this phrase is typically used
2. Natural, idiomatic expressions in ${targetLanguage}
3. Common everyday usage (not literal word-for-word translation)
4. Cultural appropriateness
5. Informal vs formal register based on the phrase style

RULES:
- Provide ONLY the translated phrase, nothing else
- Use the most natural, commonly-used equivalent
- If multiple words/variations exist, choose the most common one
- Match the casualness/formality level of the English
- No explanations, no quotation marks, just the translation

Translation:`;
}

/**
 * Translate a single phrase to one language
 */
async function translatePhrase(phrase, category, categoryDescription, targetLanguage) {
  try {
    const prompt = createTranslationPrompt(phrase, category, categoryDescription, targetLanguage.name);
    const result = await model.generateContent(prompt);
    const translated = result.response.text().trim();
    
    // Display translation in real-time
    console.log(`      ${targetLanguage.code.padEnd(4)} | ${translated}`);
    
    return {
      languageCode: targetLanguage.code,
      languageName: targetLanguage.name,
      translated
    };
  } catch (error) {
    console.error(`      ❌ ${targetLanguage.code.padEnd(4)} | Error: ${error.message}`);
    return {
      languageCode: targetLanguage.code,
      languageName: targetLanguage.name,
      translated: `[ERROR: ${phrase}]`
    };
  }
}

/**
 * Translate a phrase to all languages with rate limiting
 */
async function translatePhraseToAllLanguages(phrase, category, categoryDescription) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📝 "${phrase}" (${category})`);
  console.log(`${'─'.repeat(70)}`);
  
  const translations = [];
  
  // Process languages in batches to avoid rate limits (10 RPM for gemini-2.0-flash-exp)
  const batchSize = 2; // Reduced to 2 for 10 RPM limit
  for (let i = 0; i < TARGET_LANGUAGES.length; i += batchSize) {
    const batch = TARGET_LANGUAGES.slice(i, i + batchSize);
    
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(TARGET_LANGUAGES.length / batchSize)}:`);
    
    const batchTranslations = await Promise.all(
      batch.map(lang => translatePhrase(phrase, category, categoryDescription, lang))
    );
    
    translations.push(...batchTranslations);
    
    // Rate limiting delay between batches (10 RPM = 1 request per 6 seconds)
    if (i + batchSize < TARGET_LANGUAGES.length) {
      await new Promise(resolve => setTimeout(resolve, 7000)); // 7 seconds between batches
    }
  }
  
  return {
    english: phrase,
    category,
    categoryDescription,
    translations
  };
}

/**
 * Main translation function
 */
async function translateTestBatch(isTestMode = true) {
  const inputFile = isTestMode 
    ? 'scripts/common-phrases-test-batch.json'
    : 'scripts/common-phrases-data.json';
  
  const outputFile = isTestMode
    ? 'scripts/common-phrases-test-translations.json'
    : 'scripts/common-phrases-translations.json';
  
  console.log(`🚀 Starting ${isTestMode ? 'TEST BATCH' : 'FULL'} translation...`);
  console.log(`📂 Input: ${inputFile}`);
  console.log(`📂 Output: ${outputFile}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);
  
  // Read input data
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const results = [];
  
  if (isTestMode) {
    // Process test batch
    for (const categoryData of data.testBatch) {
      console.log(`\n📂 Category: ${categoryData.category}`);
      for (const phrase of categoryData.testPhrases) {
        const result = await translatePhraseToAllLanguages(
          phrase,
          categoryData.category,
          categoryData.categoryDescription
        );
        results.push(result);
      }
    }
  } else {
    // Process all phrases
    for (const categoryData of data.categories) {
      console.log(`\n📂 Category: ${categoryData.name}`);
      for (const phrase of categoryData.phrases) {
        const result = await translatePhraseToAllLanguages(
          phrase,
          categoryData.name,
          categoryData.description
        );
        results.push(result);
      }
    }
  }
  
  // Save results
  const output = {
    topicId: data.topicId,
    topicName: data.topicName,
    topicDescription: data.topicDescription,
    translatedAt: new Date().toISOString(),
    totalPhrases: results.length,
    totalTranslations: results.length * TARGET_LANGUAGES.length,
    phrases: results
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ Translation complete!`);
  console.log(`📊 Total phrases: ${results.length}`);
  console.log(`📊 Total translations: ${results.length * TARGET_LANGUAGES.length}`);
  console.log(`💾 Saved to: ${outputFile}`);
}

// Run
const isTestMode = !process.argv.includes('--full');
console.log(`\n${'='.repeat(60)}`);
console.log(`🌍 Common Phrases Translation Script`);
console.log(`Mode: ${isTestMode ? 'TEST BATCH (25 phrases)' : 'FULL (963 phrases)'}`);
console.log(`${'='.repeat(60)}\n`);

if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ ERROR: Please set GEMINI_API_KEY environment variable');
  console.log('\nUsage:');
  console.log('  export GEMINI_API_KEY=your_key_here  # Linux/Mac');
  console.log('  $env:GEMINI_API_KEY="your_key_here"  # Windows PowerShell');
  console.log('  node scripts/translate-common-phrases.mjs');
  process.exit(1);
}

translateTestBatch(isTestMode).catch(console.error);
