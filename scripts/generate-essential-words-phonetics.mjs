/**
 * Generate phonetics for Essential Words topic using Gemini AI
 * Uses REST API approach for reliability
 * 
 * Usage:
 * node scripts/generate-essential-words-phonetics.mjs --test   (3 languages)
 * node scripts/generate-essential-words-phonetics.mjs --full   (all 50 languages)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const TOPIC_ID = 43 // Essential Words

// 50 languages (49 target + English)
const ALL_LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' }, { code: 'ca', name: 'Catalan' }, { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' }, { code: 'da', name: 'Danish' }, { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' }, { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' },
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

const TEST_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }
]

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Fetch vocabulary with translations
async function fetchVocabulary(languageCode) {
  const { data: words } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order', { ascending: true })

  if (languageCode === 'en') {
    return words.map(w => ({ id: w.id, word: w.word_en }))
  }

  const { data: translations } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, translated_word')
    .eq('language_code', languageCode)
    .in('vocabulary_id', words.map(w => w.id))

  const translationMap = {}
  translations?.forEach(t => {
    translationMap[t.vocabulary_id] = t.translated_word
  })

  return words.map(w => ({
    id: w.id,
    word: translationMap[w.id] || w.word_en
  }))
}

// Generate phonetics using Gemini
async function generatePhoneticsBatch(words, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const wordList = words.map((w, i) => `${i + 1}. ${w.word}`).join('\n')
  
  const prompt = `Generate IPA (International Phonetic Alphabet) pronunciations for these ${languageName} words.
Return ONLY the IPA transcriptions, one per line, in the exact same order.
Do not include any explanations, numbers, or extra text.
Each line should contain ONLY the IPA transcription.

Words:
${wordList}

IPA Transcriptions:`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No text in response')
    }

    // Parse phonetics
    const phonetics = text
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '')) // Remove numbering
    
    return phonetics
  } catch (error) {
    console.error(`  ❌ Gemini error:`, error.message)
    return null
  }
}

// Save phonetics to database
async function savePhonetics(vocabularyId, languageCode, phoneticIpa) {
  const { error } = await supabase
    .from('vocabulary_phonetics')
    .upsert({
      vocabulary_id: vocabularyId,
      language_code: languageCode,
      phonetic_ipa: phoneticIpa,
      phonetic_system: 'IPA',
      source: 'gemini',
      updated_at: new Date().toISOString()
    }, { onConflict: 'vocabulary_id,language_code' })

  if (error) {
    console.error(`  ❌ Database error:`, error.message)
    return false
  }

  return true
}

// Process a single language
async function processLanguage(language) {
  console.log(`\n📝 Processing ${language.name} (${language.code})`)
  
  // Fetch vocabulary with translations
  const words = await fetchVocabulary(language.code)
  console.log(`  Found ${words.length} words`)
  
  // Process in batches of 50 words
  const BATCH_SIZE = 50
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(words.length / BATCH_SIZE)
    
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} words)...`)
    
    // Generate phonetics
    const phonetics = await generatePhoneticsBatch(batch, language.name)
    
    if (!phonetics || phonetics.length !== batch.length) {
      console.log(`  ⚠️  Batch ${batchNum} failed or returned incorrect count`)
      errorCount += batch.length
      continue
    }
    
    // Save to database
    for (let j = 0; j < batch.length; j++) {
      const saved = await savePhonetics(batch[j].id, language.code, phonetics[j])
      if (saved) {
        successCount++
      } else {
        errorCount++
      }
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log(`  ✅ Success: ${successCount} | ❌ Errors: ${errorCount}`)
  return { successCount, errorCount }
}

// Main execution
async function main() {
  const testMode = process.argv.includes('--test')
  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║      GENERATE PHONETICS - ESSENTIAL WORDS              ║')
  console.log(`║              ${testMode ? 'TEST MODE' : 'FULL MODE'}                              ║`)
  console.log('╚════════════════════════════════════════════════════════╝')

  console.log(`\n📊 Configuration:`)
  console.log(`   Topic ID: ${TOPIC_ID} (Essential Words)`)
  console.log(`   Languages: ${languages.length}`)
  console.log(`   Model: ${GEMINI_MODEL}`)
  console.log(`   Batch size: 50 words per request`)

  const startTime = Date.now()
  const results = {}

  for (const language of languages) {
    const stats = await processLanguage(language)
    results[language.code] = stats
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `essential-words-phonetics-${testMode ? 'test' : 'full'}-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))

  // Calculate totals
  const totals = Object.values(results).reduce((acc, r) => ({
    success: acc.success + r.successCount,
    errors: acc.errors + r.errorCount
  }), { success: 0, errors: 0 })

  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║                  GENERATION COMPLETE                   ║`)
  console.log(`╚════════════════════════════════════════════════════════╝`)
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`📊 Languages processed: ${languages.length}`)
  console.log(`\n📈 Results:`)
  console.log(`   ✅ Success: ${totals.success}`)
  console.log(`   ❌ Errors: ${totals.errors}`)
  console.log(`\n📝 Results saved to: ${filename}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
