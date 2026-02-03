/**
 * Test Script: Translate Section Category Names
 * 
 * Translates section names like "FIRST AID KIT", "DAILY LIFE", etc.
 * Test with 5 languages before creating full i18n file
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: '.env.local' })

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

// Section names to translate (from language-selector.tsx)
const SECTION_NAMES: Record<string, string> = {
  'account': 'ACCOUNT',
  'first-aid-kit': 'FIRST AID KIT',
  'daily-life': 'DAILY LIFE',
  'work-school': 'WORK & SCHOOL',
  'personal-social': 'PERSONAL & SOCIAL LIFE',
  'culture-society': 'CULTURE & SOCIETY',
  'veteran-field': 'VETERAN FIELD',
  'my-words': 'MY WORDS'
}

/**
 * Batch translate section names using Gemini
 */
async function translateSectionsBatch(
  targetLanguageCode: string,
  targetLanguageName: string
): Promise<Record<string, string>> {
  console.log(`\n🌐 Translating to ${targetLanguageName} (${targetLanguageCode})...`)
  
  const sectionsList = Object.entries(SECTION_NAMES)
    .map(([key, value]) => `${key}: "${value}"`)
    .join('\n')
  
  const prompt = `You are a professional translator specializing in UI/UX text for language learning apps.

CONTEXT:
These are section category names that group vocabulary topics in a language learning app.
They appear as headers in a swipeable interface, similar to app categories.

EXAMPLES:
- "ACCOUNT" = User profile and settings section
- "FIRST AID KIT" = Essential beginner topics (greetings, numbers, emergency)
- "DAILY LIFE" = Everyday topics (shopping, food, home)
- "WORK & SCHOOL" = Professional/educational topics
- "MY WORDS" = User's custom word collection

TARGET LANGUAGE: ${targetLanguageName}

TASK:
Translate the following section category names to ${targetLanguageName}. 

RULES:
1. Keep translations SHORT and IMPACTFUL (2-4 words max)
2. Use UPPERCASE style if common in ${targetLanguageName} UI
3. Make them sound like app section headers (modern, clean)
4. Maintain the conceptual grouping (essential vs. daily vs. advanced, etc.)
5. Return ONLY a JSON object mapping keys to translated values

SECTIONS TO TRANSLATE:
${sectionsList}

Return format (JSON only, no markdown):
{
  "account": "translated text",
  "first-aid-kit": "translated text",
  "daily-life": "translated text"
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
    
    console.log(`✅ Translated ${Object.keys(translations).length} sections`)
    return translations
    
  } catch (error) {
    console.error(`❌ Error translating to ${targetLanguageName}:`, error)
    return {}
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n============================================================')
  console.log('🧪 SECTION NAME TRANSLATION TEST')
  console.log('============================================================\n')

  console.log(`📋 Testing ${Object.keys(SECTION_NAMES).length} section names:\n`)
  Object.entries(SECTION_NAMES).forEach(([key, value]) => {
    console.log(`  ${key}: "${value}"`)
  })
  console.log()

  // Translate to all languages
  const results: Record<string, Record<string, string>> = {
    en: SECTION_NAMES // Include English as base
  }
  
  let languageCount = 0
  for (const lang of ALL_LANGUAGES) {
    languageCount++
    console.log(`\n--- [${languageCount}/${ALL_LANGUAGES.length}] Processing ${lang.name} (${lang.code}) ---`)
    
    const translations = await translateSectionsBatch(lang.code, lang.name)
    
    // Override Turkish translation for 'my-words'
    if (lang.code === 'tr' && translations['my-words']) {
      translations['my-words'] = 'Kelimelerim'
    }
    
    results[lang.code] = translations

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  // Save test results to TypeScript file
  const outputFile = 'lib/i18n/section-names-translations.ts'
  
  const tsContent = `/**
 * Section Category Name Translations
 * Auto-generated on ${new Date().toISOString().slice(0, 10)}
 * 
 * Usage:
 * import { sectionNamesTranslations } from '@/lib/i18n/section-names-translations'
 * const t = sectionNamesTranslations[languageCode] || sectionNamesTranslations['en']
 */

export const sectionNamesTranslations: Record<string, Record<string, string>> = ${JSON.stringify(results, null, 2)}
`

  fs.writeFileSync(outputFile, tsContent)
  console.log(`\n📄 Translations saved to: ${outputFile}`)

  // Also save JSON version for reference
  const jsonFile = `section-translation-test-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2))
  console.log(`📄 JSON backup saved to: ${jsonFile}`)

  // Display summary
  console.log('\n============================================================')
  console.log('📊 TEST SUMMARY')
  console.log('============================================================')
  console.log(`Sections translated: ${Object.keys(SECTION_NAMES).length}`)
  console.log(`Languages processed: ${ALL_LANGUAGES.length}`)
  console.log('\nSample translations (first section, 5 languages):\n')
  
  const firstSection = Object.entries(SECTION_NAMES)[0]
  const [firstKey, firstEnglish] = firstSection
  console.log(`"${firstEnglish}":`)
  const sampleLangs = ['tr', 'es', 'fr', 'de', 'ja']
  sampleLangs.forEach(langCode => {
    if (results[langCode] && results[langCode][firstKey]) {
      console.log(`  ${langCode}: "${results[langCode][firstKey]}"`)
    }
  })
  console.log(`  ... and ${ALL_LANGUAGES.length - sampleLangs.length} more languages\n`)

  console.log('✅ Full translation complete!')
  console.log('\nNext steps:')
  console.log('1. Review generated file: lib/i18n/section-names-translations.ts')
  console.log('2. Verify Turkish has "Kelimelerim" for MY WORDS')
  console.log('3. Update language-selector.tsx to use translations')
  console.log('============================================================\n')
}

// Run test
runTest().catch(console.error)
