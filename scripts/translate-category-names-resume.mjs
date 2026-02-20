/**
 * Resume Category Translation - Continue from where we left off
 * Handles failures gracefully and saves progress incrementally
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

const OUTPUT_FILE = 'category-names-translations-progress.json'

function extractUniqueCategories() {
  const data = JSON.parse(fs.readFileSync('topic-categories-list-2026-02-20.json', 'utf8'))
  const allCategories = new Set()
  for (const [topicId, topicData] of Object.entries(data)) {
    topicData.categories.forEach(cat => allCategories.add(cat))
  }
  return Array.from(allCategories).sort()
}

function loadProgress() {
  if (fs.existsSync(OUTPUT_FILE)) {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
  }
  return {}
}

function saveProgress(allTranslations) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTranslations, null, 2))
}

async function translateCategoriesBatch(categories, languageCode, languageName, retries = 3) {
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
      const jsonText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const translations = JSON.parse(jsonText)
      return translations
    } catch (error) {
      if (attempt < retries) {
        const delay = attempt * 3000 // Increasing delay
        console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay/1000} seconds...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        console.error(`❌ Failed after ${retries} attempts: ${error.message}`)
        return null
      }
    }
  }
  return null
}

async function resumeTranslation() {
  console.log('\n============================================================')
  console.log('🔄 RESUMING CATEGORY TRANSLATION')
  console.log('============================================================\n')
  
  const categories = extractUniqueCategories()
  console.log(`📋 Total categories: ${categories.length}\n`)
  
  const allTranslations = loadProgress()
  const completedLanguages = Object.keys(allTranslations)
  
  console.log(`✅ Already completed: ${completedLanguages.length}/${LANGUAGES.length} languages`)
  if (completedLanguages.length > 0) {
    console.log(`   ${completedLanguages.join(', ')}`)
  }
  
  const remainingLanguages = LANGUAGES.filter(lang => !completedLanguages.includes(lang.code))
  console.log(`\n🔄 Remaining: ${remainingLanguages.length} languages\n`)
  
  for (let i = 0; i < remainingLanguages.length; i++) {
    const lang = remainingLanguages[i]
    const totalIndex = LANGUAGES.findIndex(l => l.code === lang.code) + 1
    
    console.log(`\n--- [${totalIndex}/${LANGUAGES.length}] ${lang.name} (${lang.code}) ---`)
    
    const translations = await translateCategoriesBatch(categories, lang.code, lang.name, 5)
    
    if (translations && Object.keys(translations).length > 0) {
      allTranslations[lang.code] = translations
      saveProgress(allTranslations)
      console.log(`✅ Translated ${Object.keys(translations).length}/${categories.length} categories`)
      console.log(`💾 Progress saved`)
    } else {
      console.log(`⏭️  Skipping ${lang.name} - will retry later`)
    }
    
    console.log(`⏳ Waiting 3 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  console.log('\n============================================================')
  console.log('📊 FINAL SUMMARY')
  console.log('============================================================')
  console.log(`Completed: ${Object.keys(allTranslations).length}/${LANGUAGES.length} languages`)
  console.log(`Total translations: ${Object.keys(allTranslations).length * categories.length}`)
  console.log(`\n✅ Results saved to: ${OUTPUT_FILE}`)
  console.log('============================================================\n')
}

resumeTranslation().catch(console.error)
