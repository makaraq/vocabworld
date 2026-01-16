/**
 * Common Phrases Translation Script using Gemini API (BATCH MODE)
 * Based on successful verbs translation approach
 * 
 * Usage: node scripts/translate-common-phrases-batch.mjs
 * Usage (full): node scripts/translate-common-phrases-batch.mjs --full
 */

import fs from 'fs';
import { config } from 'dotenv';

// Load .env.local file
config({ path: '.env.local' });

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Using v1 API with flash model (same as verbs)

// 49 Target Languages (excluding English)
const TARGET_LANGUAGES = {
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

// Helper to delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Translate a batch of phrases to a target language using Gemini API directly
 */
async function translateBatchWithGemini(phrases, category, categoryDescription, targetLanguageCode, targetLanguageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const phraseList = phrases.join('\n');
  
  const prompt = `You are a professional translator specializing in natural, context-aware translations.

CONTEXT:
Category: ${category}
Description: ${categoryDescription}
Target Language: ${targetLanguageName}

TASK:
Translate the following English phrases into ${targetLanguageName}. Consider:
1. The category context and how these phrases are typically used
2. Natural, idiomatic expressions in ${targetLanguageName}
3. Common everyday usage (not literal word-for-word translation)
4. Cultural appropriateness
5. Informal vs formal register based on the phrase style

PHRASES TO TRANSLATE:
${phraseList}

Respond in this exact JSON format (no markdown, no code blocks, just pure JSON):
{
  "phrase1": "translation1",
  "phrase2": "translation2"
}

Replace "phrase1", "phrase2" with the EXACT English phrases from the list above.`;

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
      console.error(`    ❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`       ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!responseText) {
      console.error(`    ❌ Empty response`);
      return null;
    }

    // Clean up the response - remove markdown code blocks if present
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
      return translations;
    } catch (parseError) {
      console.error(`    ❌ JSON parse error:`, parseError.message);
      console.error(`       Response was:`, cleanedResponse.substring(0, 300));
      return null;
    }
  } catch (error) {
    console.error(`    ❌ Network error:`, error.message);
    return null;
  }
}

/**
 * Main translation function
 */
async function translateAllPhrases() {
  // Check if running in test mode
  const isTestMode = !process.argv.includes('--full');
  
  const inputFile = isTestMode 
    ? 'scripts/common-phrases-test-batch.json'
    : 'scripts/common-phrases-data.json';
  
  const outputFile = isTestMode
    ? 'scripts/common-phrases-test-translations-batch.json'
    : 'scripts/common-phrases-translations-batch.json';

  console.log('\n============================================================');
  console.log('🌍 Common Phrases Translation Script (BATCH MODE)');
  console.log(`Mode: ${isTestMode ? 'TEST BATCH' : 'FULL DATASET'}`);
  console.log('============================================================\n');

  // Load data
  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(rawData);
  
  // Get phrases to translate
  let phrasesToTranslate = [];
  if (isTestMode && data.testBatch) {
    // Test batch format: [{category, categoryDescription, testPhrases: []}]
    phrasesToTranslate = data.testBatch.flatMap(cat => 
      cat.testPhrases.map(phrase => ({
        english: phrase,
        category: cat.category,
        categoryDescription: cat.categoryDescription,
        description: ''
      }))
    );
  } else if (data.categories) {
    // Full data format: [{name, description, phrases: ["phrase1", "phrase2", ...]}]
    phrasesToTranslate = data.categories.flatMap(cat => 
      cat.phrases.map(phrase => ({
        english: phrase, // phrase is a string, not an object
        category: cat.name,
        categoryDescription: cat.description,
        description: ''
      }))
    );
  } else {
    console.error('❌ Invalid input file format');
    return;
  }

  console.log(`📊 Total phrases: ${phrasesToTranslate.length}`);
  console.log(`📊 Target languages: ${Object.keys(TARGET_LANGUAGES).length}`);
  console.log(`📊 Total translations needed: ${phrasesToTranslate.length * Object.keys(TARGET_LANGUAGES).length}\n`);

  // Structure to hold all translations
  const allTranslations = {};
  
  // Initialize structure for each phrase
  let wordId = 60000; // Start with high ID to avoid conflicts
  for (const phraseData of phrasesToTranslate) {
    allTranslations[phraseData.english] = {
      id: wordId++,
      english: phraseData.english,
      category: phraseData.category,
      categoryDescription: phraseData.categoryDescription,
      description: phraseData.description || '',
      translations: {}
    };
  }

  // Translate to each language
  let languageCount = 0;
  for (const [langCode, langName] of Object.entries(TARGET_LANGUAGES)) {
    languageCount++;
    console.log(`\n🌍 [${languageCount}/${Object.keys(TARGET_LANGUAGES).length}] Translating to ${langName} (${langCode})...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process ALL phrases in large batches (not grouped by category)
    const batchSize = 50; // Maximum batch size
    const totalBatches = Math.ceil(phrasesToTranslate.length / batchSize);
    
    for (let i = 0; i < phrasesToTranslate.length; i += batchSize) {
      const batch = phrasesToTranslate.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      
      console.log(`  📦 Batch ${batchNum}/${totalBatches} (${batch.length} phrases)`);
      
      // Create a mixed context description for the batch
      const categories = [...new Set(batch.map(p => p.category))];
      const contextDescription = `Mixed categories: ${categories.join(', ')}`;
      
      // Extract just the English phrases for translation
      const phrasesToTranslateInBatch = batch.map(p => p.english);
      
      const translations = await translateBatchWithGemini(
        phrasesToTranslateInBatch, 
        categories[0], // Use first category as primary
        contextDescription, 
        langCode, 
        langName
      );
      
      if (translations) {
        // Show first 3 translations as sample
        const samplePhrases = phrasesToTranslateInBatch.slice(0, 3);
        for (const phrase of samplePhrases) {
          if (translations[phrase]) {
            console.log(`      "${phrase}" → "${translations[phrase]}"`);
          }
        }
        
        for (const phraseData of batch) {
          const phrase = phraseData.english;
          const translation = translations[phrase];
          if (translation) {
            allTranslations[phrase].translations[langCode] = translation;
            successCount++;
          } else {
            console.log(`    ⚠️ Missing translation for: "${phrase}"`);
            failCount++;
          }
        }
        console.log(`    ✅ Batch completed: ${Object.keys(translations).length}/${batch.length} translations`);
      } else {
        failCount += batch.length;
        console.log(`    ❌ Batch failed completely`);
      }
      
      // Rate limiting - wait 5 seconds between batches
      if (i + batchSize < phrasesToTranslate.length) {
        console.log(`    ⏳ Waiting 5s for rate limit...`);
        await delay(5000);
      }
    }
    
    const percentage = ((successCount / phrasesToTranslate.length) * 100).toFixed(1);
    console.log(`  ✅ ${langName}: ${successCount}/${phrasesToTranslate.length} translated (${percentage}%), ${failCount} failed`);
    
    // Save progress after each language
    fs.writeFileSync(outputFile, JSON.stringify(allTranslations, null, 2));
    console.log(`  💾 Progress saved (${languageCount}/${Object.keys(TARGET_LANGUAGES).length} languages)`);
    
    // Small delay between languages
    if (languageCount < Object.keys(TARGET_LANGUAGES).length) {
      await delay(2000);
    }
  }

  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(allTranslations, null, 2));
  console.log(`\n💾 Saved translations to ${outputFile}`);

  // Summary
  const totalExpected = phrasesToTranslate.length * Object.keys(TARGET_LANGUAGES).length;
  let totalCompleted = 0;
  for (const phrase of Object.values(allTranslations)) {
    totalCompleted += Object.keys(phrase.translations).length;
  }
  
  const completionRate = ((totalCompleted / totalExpected) * 100).toFixed(1);
  
  console.log('\n📊 Translation Summary:');
  console.log(`   Total phrases: ${phrasesToTranslate.length}`);
  console.log(`   Languages: ${Object.keys(TARGET_LANGUAGES).length}`);
  console.log(`   Expected translations: ${totalExpected}`);
  console.log(`   Completed translations: ${totalCompleted}`);
  console.log(`   Completion rate: ${completionRate}%`);
  console.log('\n✨ Translation complete!\n');
  
  return allTranslations;
}

// Run the translation
translateAllPhrases().catch(console.error);
