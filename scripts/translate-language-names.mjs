/**
 * Translate Language Names
 * 
 * Translates all 49 language names into all 49 languages
 * Uses Gemini API for translation
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

config({ path: '.env.local' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// 49 supported languages (from language selector)
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
  { code: 'en', name: 'English' },
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
 * Translate language names in batches using Gemini with retry logic
 */
async function translateLanguageNames(targetLanguageCode, targetLanguageName, retries = 5) {
  const languageList = LANGUAGES.map((lang, idx) => `${idx + 1}. ${lang.name}`).join('\n')
  
  const prompt = `You are a professional translator for a language learning app.

CONTEXT: These are language names that appear in a language selection screen.

TARGET LANGUAGE: ${targetLanguageName}

TASK: Translate ALL 49 language names to ${targetLanguageName}.

RULES:
1. Use the native/endonym name that speakers of ${targetLanguageName} would use
2. For example, if translating to Spanish:
   - "English" → "Inglés"
   - "Spanish" → "Español" (not "Spanish")
   - "French" → "Francés"
3. Keep proper capitalization as used in ${targetLanguageName}
4. Return ONLY a JSON object (no markdown, no code blocks, no explanation)

LANGUAGE NAMES TO TRANSLATE:
${languageList}

Return format (JSON only):
{
  "Arabic": "translated_name",
  "Bulgarian": "translated_name",
  ...
}

IMPORTANT: Your response must be ONLY the JSON object, nothing else.`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${retries}...`)
      
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      // Clean the response
      let cleanedText = text.trim()
      cleanedText = cleanedText.replace(/```json\n?/g, '')
      cleanedText = cleanedText.replace(/```\n?/g, '')
      cleanedText = cleanedText.trim()
      
      const translations = JSON.parse(cleanedText)
      
      // Validate we got all translations
      const translatedCount = Object.keys(translations).length
      if (translatedCount < LANGUAGES.length) {
        console.log(`   ⚠️  Only got ${translatedCount}/${LANGUAGES.length} translations, retrying...`)
        continue
      }
      
      return translations
      
    } catch (error) {
      console.log(`   ❌ Attempt ${attempt} failed:`, error.message)
      
      if (attempt < retries) {
        const waitTime = attempt * 2 // Exponential backoff
        console.log(`   ⏳ Waiting ${waitTime}s before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
      } else {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`)
      }
    }
  }
}

/**
 * Main translation workflow
 */
async function main() {
  console.log('\n🌍 Language Names Translation Generator')
  console.log('=' .repeat(50))
  console.log(`📊 Languages: ${LANGUAGES.length}`)
  console.log(`🎯 Target: Translate to all ${LANGUAGES.length} languages`)
  console.log(`📝 Total translations: ${LANGUAGES.length} × ${LANGUAGES.length} = ${LANGUAGES.length * LANGUAGES.length}`)
  console.log('=' .repeat(50) + '\n')

  const allTranslations = {}
  let completed = 0
  
  // Translate to each language (except English - skip it)
  const languagesToTranslate = LANGUAGES.filter(lang => lang.code !== 'en')
  
  for (const targetLang of languagesToTranslate) {
    console.log(`\n[${completed + 1}/${languagesToTranslate.length}] Translating to ${targetLang.name} (${targetLang.code})...`)
    
    try {
      const translations = await translateLanguageNames(targetLang.code, targetLang.name)
      allTranslations[targetLang.code] = translations
      completed++
      
      console.log(`   ✅ Success! Got ${Object.keys(translations).length} translations`)
      
      // Save progress after each language
      const progressFile = 'language-names-translations-progress.json'
      fs.writeFileSync(progressFile, JSON.stringify(allTranslations, null, 2))
      console.log(`   💾 Progress saved (${completed}/${languagesToTranslate.length} languages)`)
      
      // Delay between languages to avoid rate limits
      if (completed < languagesToTranslate.length) {
        console.log('   ⏳ Waiting 3 seconds...')
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to translate to ${targetLang.name}:`, error.message)
      console.log(`   ⚠️  Continuing with next language...`)
    }
  }

  // Final save
  const finalFile = `language-names-translations-${new Date().toISOString().split('T')[0]}.json`
  fs.writeFileSync(finalFile, JSON.stringify(allTranslations, null, 2))
  
  console.log('\n' + '=' .repeat(50))
  console.log('✅ Translation Complete!')
  console.log(`📁 Saved to: ${finalFile}`)
  console.log(`📊 Languages translated: ${completed}/${languagesToTranslate.length}`)
  console.log(`📝 Total translations: ${completed * LANGUAGES.length}`)
  console.log('=' .repeat(50) + '\n')
}

main().catch(console.error)
