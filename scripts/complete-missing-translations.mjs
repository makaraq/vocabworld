/**
 * Complete Missing Translations
 * Retries failed translations for specific languages
 * 
 * Usage: node scripts/complete-missing-translations.mjs <language-code>
 * Example: node scripts/complete-missing-translations.mjs sq
 */

import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function translateBatchWithGemini(phrases, targetLanguageCode, targetLanguageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const phraseList = phrases.join('\n');
  
  const prompt = `You are a professional translator. Translate the following English phrases into ${targetLanguageName}.

TASK:
Translate these common everyday phrases to ${targetLanguageName}. Use natural, idiomatic expressions.

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`    ❌ API Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!responseText) return null;

    let cleanedResponse = responseText;
    if (cleanedResponse.startsWith('```json')) cleanedResponse = cleanedResponse.slice(7);
    else if (cleanedResponse.startsWith('```')) cleanedResponse = cleanedResponse.slice(3);
    if (cleanedResponse.endsWith('```')) cleanedResponse = cleanedResponse.slice(0, -3);
    cleanedResponse = cleanedResponse.trim();

    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error(`    ❌ Error:`, error.message);
    return null;
  }
}

async function completeMissingTranslations(targetLangCode) {
  const targetLangName = TARGET_LANGUAGES[targetLangCode];
  if (!targetLangName) {
    console.error(`❌ Unknown language code: ${targetLangCode}`);
    console.log('Available codes:', Object.keys(TARGET_LANGUAGES).join(', '));
    return;
  }

  console.log('\n============================================================');
  console.log('🔧 Complete Missing Translations');
  console.log(`Language: ${targetLangName} (${targetLangCode})`);
  console.log('============================================================\n');

  // Load existing translations
  const translationsFile = 'scripts/common-phrases-translations-batch.json';
  const data = JSON.parse(fs.readFileSync(translationsFile, 'utf-8'));

  // Find missing translations
  const missingPhrases = [];
  for (const [phrase, phraseData] of Object.entries(data)) {
    if (!phraseData.translations[targetLangCode]) {
      missingPhrases.push({
        english: phrase,
        category: phraseData.category,
        categoryDescription: phraseData.categoryDescription
      });
    }
  }

  console.log(`📊 Found ${missingPhrases.length} missing translations\n`);

  if (missingPhrases.length === 0) {
    console.log('✅ All translations complete for this language!');
    return;
  }

  // Process in batches
  const batchSize = 50;
  const totalBatches = Math.ceil(missingPhrases.length / batchSize);
  let completed = 0;

  for (let i = 0; i < missingPhrases.length; i += batchSize) {
    const batch = missingPhrases.slice(i, i + batchSize);
    const batchNum = Math.floor(i/batchSize) + 1;
    
    console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} phrases)`);
    
    const phrasesArray = batch.map(p => p.english);
    const translations = await translateBatchWithGemini(phrasesArray, targetLangCode, targetLangName);
    
    if (translations) {
      // Show samples
      const samples = phrasesArray.slice(0, 3);
      for (const phrase of samples) {
        if (translations[phrase]) {
          console.log(`      "${phrase}" → "${translations[phrase]}"`);
        }
      }
      
      // Update data
      for (const phrase of phrasesArray) {
        if (translations[phrase]) {
          data[phrase].translations[targetLangCode] = translations[phrase];
          completed++;
        }
      }
      
      console.log(`    ✅ Batch completed: ${Object.keys(translations).length}/${batch.length} translations`);
      
      // Save progress
      fs.writeFileSync(translationsFile, JSON.stringify(data, null, 2));
      console.log(`    💾 Progress saved (${completed}/${missingPhrases.length})`);
    } else {
      console.log(`    ❌ Batch failed`);
    }
    
    if (i + batchSize < missingPhrases.length) {
      console.log(`    ⏳ Waiting 5s...\n`);
      await delay(5000);
    }
  }

  console.log('\n✨ Completion summary:');
  console.log(`   Completed: ${completed}/${missingPhrases.length}`);
  console.log(`   Success rate: ${((completed / missingPhrases.length) * 100).toFixed(1)}%\n`);
}

// Get language code from command line
const langCode = process.argv[2];
if (!langCode) {
  console.error('❌ Please provide a language code');
  console.log('Usage: node scripts/complete-missing-translations.mjs <language-code>');
  console.log('Example: node scripts/complete-missing-translations.mjs sq');
  process.exit(1);
}

completeMissingTranslations(langCode).catch(console.error);
