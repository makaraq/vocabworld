/**
 * Translate Category Names to 49 Languages
 * 
 * Takes all category names from topic-categories-list-2026-02-20.json
 * and translates them to 49 languages using Gemini API
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables
config({ path: '.env.local' })

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// All 49 languages (excluding English)
const LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'es', name: 'Spanish' },
  { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' },
  { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' }
]

/**
 * Extract all unique category names from the JSON file
 */
function extractUniqueCategories() {
  const data = JSON.parse(fs.readFileSync('topic-categories-list-2026-02-20.json', 'utf8'))
  
  const allCategories = new Set()
  
  for (const [topicId, topicData] of Object.entries(data)) {
    topicData.categories.forEach(cat => allCategories.add(cat))
  }
  
  return Array.from(allCategories).sort()
}

/**
 * Translate categories in batches using Gemini with retry logic
 */
async function translateCategoriesBatch(categories, languageCode, languageName, retries = 3) {
  console.log(`\n🌐 Translating ${categories.length} categories to ${languageName}...`)
  
  const categoryList = categories.map((cat, idx) => `${idx + 1}. "${cat}"`).join('\n')
  
  const prompt = `You are a professional translator for a language learning app.

CONTEXT: These are vocabulary category/section names that organize words in the app.
Examples: 
- "basic greetings - greetings" → translate both parts, keep " - "
- "AUXILIARY & MODAL VERBS" → keep UPPERCASE, translate content
- "ASKING_FOR_HELP" → keep UPPERCASE, replace underscores with spaces for translation

TARGET LANGUAGE: ${languageName}

TASK: Translate ALL category names to ${languageName}.

RULES:
1. If category has " - " separator: translate BOTH parts, keep the " - " separator
2. If category is UPPERCASE: keep UPPERCASE in translation
3. If category has underscores (_): convert to spaces, translate, then convert spaces back to underscores
   Example: "ASKING_FOR_HELP" → "PEDIR_AYUDA" (Spanish)
4. If category has & (ampersand): keep the & symbol
5. Use natural ${languageName} phrases that native speakers would use
6. Return ONLY a JSON object (no markdown, no code blocks)

EXAMPLES:
- "basic greetings - greetings" → "saludos básicos - saludos" (Spanish)
- "ASKING_FOR_HELP" → "PIDIENDO_AYUDA" (Spanish)
- "Agreement & Disagreement" → "Acuerdo y Desacuerdo" (Spanish)

CATEGORIES:
${categoryList}

Return format (JSON only):
{
  "original english 1": "translated text 1",
  "original english 2": "translated text 2"
}

Translation:`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text().trim()
      
      // Clean markdown
      const jsonText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const translations = JSON.parse(jsonText)
      
      console.log(`✅ Translated ${Object.keys(translations).length}/${categories.length} categories`)
      return translations
      
    } catch (error) {
      if (attempt < retries) {
        console.log(`⚠️  Attempt ${attempt} failed, retrying in 3 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        console.error(`❌ Error translating to ${languageName} after ${retries} attempts:`, error.message)
        return {}
      }
    }
  }
  
  return {}
}

/**
 * Main translation function
 */
async function translateAllCategories() {
  console.log('\n============================================================')
  console.log('🌍 CATEGORY TRANSLATION - 277 CATEGORIES × 49 LANGUAGES')
  console.log('============================================================\n')
  
  // Step 1: Extract unique categories
  const categories = extractUniqueCategories()
  console.log(`📋 Extracted ${categories.length} unique categories\n`)
  
  console.log('Sample categories (first 10):')
  categories.slice(0, 10).forEach((cat, idx) => {
    console.log(`  ${idx + 1}. "${cat}"`)
  })
  
  // Step 2: Translate to all languages
  const allTranslations = {}
  
  for (let i = 0; i < LANGUAGES.length; i++) {
    const lang = LANGUAGES[i]
    console.log(`\n--- [${i + 1}/${LANGUAGES.length}] ${lang.name} (${lang.code}) ---`)
    
    const translations = await translateCategoriesBatch(categories, lang.code, lang.name)
    
    // Store in format: { languageCode: { "category en": "category translated" } }
    allTranslations[lang.code] = translations
    
    // Rate limiting - longer delay to avoid API limits
    console.log('⏳ Waiting 2 seconds before next language...')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Step 3: Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const outputFile = `category-names-translations-${timestamp}.json`
  
  fs.writeFileSync(outputFile, JSON.stringify(allTranslations, null, 2))
  
  console.log('\n============================================================')
  console.log('📊 TRANSLATION SUMMARY')
  console.log('============================================================')
  console.log(`Categories: ${categories.length}`)
  console.log(`Languages: ${LANGUAGES.length}`)
  console.log(`Total translations: ${categories.length * LANGUAGES.length}`)
  console.log(`\n✅ Results saved to: ${outputFile}`)
  
  // Sample output
  console.log('\nSample translations (first category):')
  const firstCategory = categories[0]
  console.log(`\nEnglish: "${firstCategory}"`)
  Object.entries(allTranslations).slice(0, 5).forEach(([code, trans]) => {
    console.log(`${code}: "${trans[firstCategory]}"`)
  })
  
  console.log('\n============================================================\n')
}

translateAllCategories().catch(console.error)
