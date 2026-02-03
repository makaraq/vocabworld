/**
 * Test Script: Translate Vocabulary Categories
 * 
 * Translates category names like "BASIC GREETINGS", "NUMBERS", etc.
 * Test with 3 sample categories × 5 languages before full run
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Supabase with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env file')
  process.exit(1)
}

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env file')
  process.exit(1)
}

console.log('✅ Using Supabase key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// All 50 supported languages
const ALL_LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' }, { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' }, { code: 'cs', name: 'Czech' }, { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' }, { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' },
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' }, { code: 'fa', name: 'Persian' }, { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' }, { code: 'ga', name: 'Irish' }, { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' }, { code: 'hi', name: 'Hindi' }, { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' }, { code: 'id', name: 'Indonesian' }, { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' }, { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' },
  { code: 'lt', name: 'Lithuanian' }, { code: 'lv', name: 'Latvian' }, { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' }, { code: 'mr', name: 'Marathi' }, { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' }, { code: 'no', name: 'Norwegian' }, { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' }, { code: 'sl', name: 'Slovenian' }, { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' }, { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' }, { code: 'uk', name: 'Ukrainian' }, { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' }, { code: 'zh', name: 'Chinese' }
]

interface CategoryTranslation {
  category: string
  language_code: string
  translated_category: string
  created_at?: string
}

/**
 * Fetch unique category names from vocabulary table
 */
async function fetchUniqueCategories(): Promise<string[]> {
  console.log('📊 Fetching unique category names from vocabulary...\n')
  
  const { data, error } = await supabase
    .from('vocabulary')
    .select('context')
    .not('context', 'is', null)
    .not('context', 'eq', '')

  if (error) {
    console.error('❌ Error fetching categories:', error)
    return []
  }

  // Extract unique context values
  const categories = [...new Set(data.map(row => row.context))]
    .filter(cat => cat && cat.trim().length > 0)
    .sort()

  console.log(`✅ Found ${categories.length} unique categories\n`)
  return categories
}

/**
 * Batch translate categories using Gemini
 */
async function translateCategoriesBatch(
  categories: string[],
  targetLanguageCode: string,
  targetLanguageName: string
): Promise<Record<string, string>> {
  console.log(`\n🌐 Translating to ${targetLanguageName} (${targetLanguageCode})...`)
  
  const categoryList = categories.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')
  
  const prompt = `You are a professional translator specializing in vocabulary learning app UI.

CONTEXT:
These are category/section names that group vocabulary words in a language learning app.
Examples: "basic greetings", "numbers", "daily routine verbs", "food items"

TARGET LANGUAGE: ${targetLanguageName}

TASK:
Translate the following category names to ${targetLanguageName}. 

RULES:
1. Keep translations SHORT and CLEAR (2-4 words max)
2. Use natural, common phrases that ${targetLanguageName} speakers would use
3. Maintain the categorical/grouping nature (these are section headers)
4. Use title case or appropriate casing for ${targetLanguageName}
5. Return ONLY a JSON object mapping English to translated names

CATEGORIES TO TRANSLATE:
${categoryList}

Return format (JSON only, no markdown):
{
  "category 1 english text": "translated text",
  "category 2 english text": "translated text"
}

Translation:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    // Clean up response - remove markdown code blocks if present
    const jsonText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    const translations = JSON.parse(jsonText)
    
    console.log(`✅ Translated ${Object.keys(translations).length} categories`)
    return translations
    
  } catch (error) {
    console.error(`❌ Error translating to ${targetLanguageName}:`, error)
    return {}
  }
}

/**
 * Check if category already has translation in database
 */
async function checkExistingTranslation(
  category: string,
  languageCode: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('category_translations')
    .select('id')
    .eq('category', category)
    .eq('language_code', languageCode)
    .single()

  return !error && data !== null
}

/**
 * Save translations to database
 */
async function saveTranslations(translations: CategoryTranslation[]): Promise<void> {
  if (translations.length === 0) return

  const { error } = await supabase
    .from('category_translations')
    .upsert(translations, { onConflict: 'category,language_code' })

  if (error) {
    console.error('❌ Error saving translations:', error)
  } else {
    console.log(`✅ Saved ${translations.length} translations to database`)
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n============================================================')
  console.log('🧪 CATEGORY TRANSLATION TEST')
  console.log('============================================================\n')

  // Step 1: Fetch all unique categories
  const allCategories = await fetchUniqueCategories()
  
  if (allCategories.length === 0) {
    console.log('❌ No categories found. Exiting.')
    return
  }

  console.log('Sample categories (first 10):')
  allCategories.slice(0, 10).forEach((cat, idx) => {
    console.log(`  ${idx + 1}. "${cat}"`)
  })
  console.log(`\n📋 Processing ALL ${allCategories.length} categories...`)

  // Step 2: Translate to all languages
  const results: CategoryTranslation[] = []
  let languageCount = 0
  
  for (const lang of ALL_LANGUAGES) {
    languageCount++
    console.log(`\n--- [${languageCount}/${ALL_LANGUAGES.length}] Processing ${lang.name} (${lang.code}) ---`)
    
    // Check existing translations
    const toTranslate: string[] = []
    let skipped = 0

    for (const category of allCategories) {
      const exists = await checkExistingTranslation(category, lang.code)
      if (exists) {
        skipped++
      } else {
        toTranslate.push(category)
      }
    }

    console.log(`📊 Skipped: ${skipped}, To translate: ${toTranslate.length}`)

    if (toTranslate.length === 0) {
      console.log('✅ All categories already translated')
      continue
    }

    // Batch translate
    const translations = await translateCategoriesBatch(toTranslate, lang.code, lang.name)

    // Prepare for database
    for (const [englishCat, translatedCat] of Object.entries(translations)) {
      results.push({
        category: englishCat,
        language_code: lang.code,
        translated_category: translatedCat
      })
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  // Step 4: Save to database
  console.log('\n💾 Saving translations...')
  await saveTranslations(results)

  // Step 5: Save test results to JSON
  const outputFile = `category-translation-test-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
  console.log(`\n📄 Test results saved to: ${outputFile}`)

  // Step 6: Display summary
  console.log('\n============================================================')
  console.log('📊 TEST SUMMARY')
  console.log('============================================================')
  console.log(`Categories tested: ${testCategories.length}`)
  console.log(`Languages tested: ${TEST_LANGUAGES.length}`)
  console.log(`Translations created: ${results.length}`)
  console.log('\nSample translations:')
  
  // Group by category
  const byCategory: Record<string, any[]> = {}
  results.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = []
    byCategory[r.category].push({ lang: r.language_code, translation: r.translated_category })
  })

  Object.entries(byCategory).forEach(([cat, trans]) => {
    console.log(`\n"${cat}":`)
    trans.forEach(t => console.log(`  ${t.lang}: "${t.translation}"`))
  })

  console.log('\n✅ Test complete!')
  console.log('\nNext steps:')
  console.log('1. Review translations above for quality')
  console.log('2. Check database table: category_translations')
  console.log('3. If good, scale to all categories × 50 languages')
  console.log('============================================================\n')
}

// Run test
runTest().catch(console.error)
