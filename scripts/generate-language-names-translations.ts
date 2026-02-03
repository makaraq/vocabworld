/**
 * Generate Language Name Translations
 * 
 * Translates language names so users see them in their native language
 * Example: Turkish user sees "İngilizce" instead of "English"
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// All 50 supported languages with their English names
const LANGUAGE_NAMES: Record<string, string> = {
  'ar': 'Arabic', 'bg': 'Bulgarian', 'bn': 'Bengali', 'ca': 'Catalan',
  'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish', 'de': 'German',
  'el': 'Greek', 'en': 'English', 'es': 'Spanish', 'et': 'Estonian',
  'eu': 'Basque', 'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French',
  'ga': 'Irish', 'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi',
  'hr': 'Croatian', 'hu': 'Hungarian', 'id': 'Indonesian', 'is': 'Icelandic',
  'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'lt': 'Lithuanian',
  'lv': 'Latvian', 'mk': 'Macedonian', 'ml': 'Malayalam', 'mr': 'Marathi',
  'mt': 'Maltese', 'nl': 'Dutch', 'no': 'Norwegian', 'pl': 'Polish',
  'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'sk': 'Slovak',
  'sl': 'Slovenian', 'sv': 'Swedish', 'ta': 'Tamil', 'te': 'Telugu',
  'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu',
  'vi': 'Vietnamese', 'zh': 'Chinese'
}

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

async function translateLanguageNamesBatch(
  targetLanguageCode: string,
  targetLanguageName: string,
  retries = 3
): Promise<Record<string, string>> {
  console.log(`\n🌐 Translating to ${targetLanguageName} (${targetLanguageCode})...`)
  
  const languagesList = Object.entries(LANGUAGE_NAMES)
    .map(([code, name]) => `${code}: "${name}"`)
    .join('\n')
  
  const prompt = `You are a professional translator specializing in language names for educational apps.

CONTEXT:
These are language names that will appear in a language selector dropdown.
Users need to see language names in their own language.

EXAMPLE:
If a Turkish user is selecting a target language, they should see:
- "İngilizce" (not "English")
- "İspanyolca" (not "Spanish")
- "Fransızca" (not "French")

TARGET LANGUAGE: ${targetLanguageName}

TASK:
Translate ALL language names below into ${targetLanguageName}.

RULES:
1. Use the STANDARD native name for each language (how native speakers call their language)
2. Use proper capitalization for ${targetLanguageName}
3. For non-Latin scripts (Arabic, Greek, Hebrew, etc.), use the native script
4. Return ONLY a JSON object mapping language codes to translated names
5. Be consistent with how language names appear in ${targetLanguageName}

LANGUAGES TO TRANSLATE:
${languagesList}

Return format (JSON only, no markdown):
{
  "ar": "translated name for Arabic",
  "bg": "translated name for Bulgarian",
  "bn": "translated name for Bengali"
}

Translation:`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text().trim()
      
      const jsonText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const translations = JSON.parse(jsonText)
      
      console.log(`✅ Translated ${Object.keys(translations).length} language names`)
      return translations
      
    } catch (error: any) {
      const isOverloaded = error?.status === 503 || error?.message?.includes('overloaded')
      
      if (isOverloaded && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 2000
        console.log(`⚠️  Model overloaded, retrying in ${waitTime/1000}s... (attempt ${attempt}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      console.error(`❌ Error translating to ${targetLanguageName}:`, error.message || error)
      return {}
    }
  }
  
  return {}
}

async function runGeneration() {
  console.log('\n============================================================')
  console.log('🌐 LANGUAGE NAME TRANSLATION GENERATOR')
  console.log('============================================================\n')

  console.log(`📋 Translating ${Object.keys(LANGUAGE_NAMES).length} language names into ${ALL_LANGUAGES.length} languages...\n`)

  const results: Record<string, Record<string, string>> = {
    en: LANGUAGE_NAMES
  }
  
  let languageCount = 0
  for (const lang of ALL_LANGUAGES) {
    languageCount++
    console.log(`\n--- [${languageCount}/${ALL_LANGUAGES.length}] Processing ${lang.name} (${lang.code}) ---`)
    
    const translations = await translateLanguageNamesBatch(lang.code, lang.name)
    results[lang.code] = translations

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  const outputFile = 'lib/i18n/language-names-translations.ts'
  
  const tsContent = `/**
 * Language Name Translations
 * Auto-generated on ${new Date().toISOString().slice(0, 10)}
 * 
 * Maps language codes to their translated names in all supported languages.
 * 
 * Usage:
 * import { languageNamesTranslations } from '@/lib/i18n/language-names-translations'
 * 
 * // Get language names in Turkish
 * const turkishNames = languageNamesTranslations['tr']
 * console.log(turkishNames['en']) // "İngilizce"
 * console.log(turkishNames['es']) // "İspanyolca"
 */

export const languageNamesTranslations: Record<string, Record<string, string>> = ${JSON.stringify(results, null, 2)}
`

  fs.writeFileSync(outputFile, tsContent)
  console.log(`\n📄 Translations saved to: ${outputFile}`)

  const jsonFile = `language-names-translations-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2))
  console.log(`📄 JSON backup saved to: ${jsonFile}`)

  console.log('\n============================================================')
  console.log('📊 GENERATION SUMMARY')
  console.log('============================================================')
  console.log(`Language names translated: ${Object.keys(LANGUAGE_NAMES).length}`)
  console.log(`Languages processed: ${ALL_LANGUAGES.length}`)
  console.log('\nSample translations (English language name in 5 languages):\n')
  
  console.log('"English":')
  const sampleLangs = ['tr', 'es', 'fr', 'de', 'ja']
  sampleLangs.forEach(langCode => {
    if (results[langCode] && results[langCode]['en']) {
      const langName = ALL_LANGUAGES.find(l => l.code === langCode)?.name
      console.log(`  ${langCode} (${langName}): "${results[langCode]['en']}"`)
    }
  })
  console.log(`  ... and ${ALL_LANGUAGES.length - sampleLangs.length} more languages\n`)

  console.log('✅ Full translation complete!')
  console.log('\nNext steps:')
  console.log('1. Review generated file: lib/i18n/language-names-translations.ts')
  console.log('2. Update language-selector.tsx to use translated language names')
  console.log('3. Test language selector with different main languages')
  console.log('============================================================\n')
}

runGeneration().catch(console.error)
