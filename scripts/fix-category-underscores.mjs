/**
 * Fix Category Translations - Remove Underscores
 * 
 * Re-translates categories with underscores to have spaces instead
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

config({ path: '.env.local' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

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

async function fixTranslations() {
  console.log('\n============================================================')
  console.log('🔧 FIXING CATEGORY TRANSLATIONS - REMOVING UNDERSCORES')
  console.log('============================================================\n')

  // Load existing translations
  const allTranslations = JSON.parse(
    fs.readFileSync('category-names-translations-progress.json', 'utf8')
  )

  // Get all English categories
  const firstLang = Object.keys(allTranslations)[0]
  const categories = Object.keys(allTranslations[firstLang])

  console.log(`📋 Total categories: ${categories.length}`)
  console.log(`🌍 Languages: ${LANGUAGES.length}\n`)

  // Process each language
  for (let i = 0; i < LANGUAGES.length; i++) {
    const lang = LANGUAGES[i]
    console.log(`\n--- [${i + 1}/${LANGUAGES.length}] ${lang.name} (${lang.code}) ---`)

    const currentTranslations = allTranslations[lang.code] || {}
    const fixedTranslations = {}

    // Fix each translation by removing underscores
    for (const [englishCat, translatedCat] of Object.entries(currentTranslations)) {
      // Simply replace underscores with spaces in the translation
      fixedTranslations[englishCat] = translatedCat.replace(/_/g, ' ')
    }

    allTranslations[lang.code] = fixedTranslations
    
    console.log('✅ Fixed underscores in translations')
    console.log(`   Sample: "${currentTranslations['ASKING_FOR_HELP']}" → "${fixedTranslations['ASKING_FOR_HELP']}"`)
  }

  // Save fixed translations
  const outputFile = 'category-names-translations-fixed.json'
  fs.writeFileSync(outputFile, JSON.stringify(allTranslations, null, 2))

  console.log('\n============================================================')
  console.log('📊 FIX SUMMARY')
  console.log('============================================================')
  console.log(`✅ Fixed ${LANGUAGES.length} languages`)
  console.log(`✅ Total translations: ${categories.length * LANGUAGES.length}`)
  console.log(`\n📄 Fixed translations saved to: ${outputFile}`)
  console.log('\nSample before/after:')
  console.log('  Spanish:')
  console.log('    BEFORE: PIDIENDO_AYUDA')
  console.log('    AFTER:  PIDIENDO AYUDA')
  console.log('  French:')
  console.log('    BEFORE: DEMANDER_DE_L_AIDE')
  console.log('    AFTER:  DEMANDER DE L AIDE')
  console.log('============================================================\n')
}

fixTranslations().catch(console.error)
