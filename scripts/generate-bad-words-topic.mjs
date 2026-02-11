/**
 * Generate Bad Words topic with translations
 * Based on Essential Words (topic 43) script architecture
 * 
 * Usage:
 * node scripts/generate-bad-words-topic.mjs --test   (3 languages)
 * node scripts/generate-bad-words-topic.mjs --full   (49 languages)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const TOPIC_CONFIG = {
  id: 44,
  name: 'Bad Words',
  description: 'Profanity and curse words - understand, don\'t use offensively'
}

const BAD_WORDS = [
  'damn', 'hell', 'crap', 'jerk', 'idiot', 'stupid', 'dumb', 'moron', 'loser', 'shut up',
  'ass', 'asshole', 'bastard', 'bloody', 'bullshit', 'piss', 'pissed', 'screw', 'screwed', 'sucks',
  'shit', 'shitty', 'fuck', 'fucked', 'fucking', 'motherfucker', 'son of a bitch', 'bitch', 'prick', 'dick',
  'cock', 'pussy', 'slut', 'whore', 'jackass', 'douche', 'douchebag', 'arse', 'bugger', 'wanker'
]

const ALL_LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' }, { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' }, { code: 'cs', name: 'Czech' }, { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' }, { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' },
  { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' }, { code: 'eu', name: 'Basque' },
  { code: 'fa', name: 'Persian' }, { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' }, { code: 'gu', name: 'Gujarati' }, { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' }, { code: 'hr', name: 'Croatian' }, { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' }, { code: 'is', name: 'Icelandic' }, { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' }, { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' }, { code: 'mk', name: 'Macedonian' }, { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' }, { code: 'mt', name: 'Maltese' }, { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' }, { code: 'pl', name: 'Polish' }, { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' }, { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' }, { code: 'sv', name: 'Swedish' }, { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' }, { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' }, { code: 'ur', name: 'Urdu' }, { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' }
]

const TEST_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' }
]

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Translate batch using Gemini REST API
async function translateBatchWithGemini(words, langCode, langName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const wordList = words.map(w => `"${w}"`).join(', ')
  
  const prompt = `Translate these English profanity words to ${langName}. Return culturally equivalent profanity.

Words to translate: ${wordList}

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON object
2. Use this EXACT format: {"word1": "translation1", "word2": "translation2"}
3. Use the EXACT English word as the key
4. Include ALL ${words.length} words
5. NO markdown, NO code blocks, NO extra text

Example format:
{"damn": "translation", "hell": "translation"}

Translate all words now:`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { error: `API error ${response.status}` }
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      return { error: 'No response text' }
    }

    // Clean JSON
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanedText)
    
    if (typeof parsed !== 'object') {
      return { error: 'Invalid JSON format' }
    }

    return { translations: parsed }
  } catch (error) {
    return { error: error.message }
  }
}

// Step 1: Insert or update topic
async function setupTopic() {
  console.log('\n📌 Step 1: Setting up topic...')
  
  const { error } = await supabase
    .from('topics')
    .upsert({
      id: TOPIC_CONFIG.id,
      name: TOPIC_CONFIG.name,
      description: TOPIC_CONFIG.description
    })

  if (error) {
    console.error('❌ Error inserting topic:', error)
    return false
  }
  
  console.log(`✅ Topic ready: "${TOPIC_CONFIG.name}" (ID: ${TOPIC_CONFIG.id})`)
  return true
}

// Step 2: Clean up duplicates
async function cleanupDuplicates() {
  console.log('\n📌 Step 2: Cleaning up any duplicate words...')
  
  const { error } = await supabase
    .from('vocabulary')
    .delete()
    .eq('topic_id', TOPIC_CONFIG.id)

  if (error) {
    console.error('❌ Error cleaning up:', error)
    return false
  }
  
  console.log('✅ Cleanup complete')
  return true
}

// Step 3: Insert vocabulary
async function insertVocabulary() {
  console.log(`\n📌 Step 3: Inserting ${BAD_WORDS.length} vocabulary words...`)
  
  const vocabularyData = BAD_WORDS.map((word, index) => ({
    topic_id: TOPIC_CONFIG.id,
    word_en: word,
    learning_order: index + 1
  }))

  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < vocabularyData.length; i += batchSize) {
    const batch = vocabularyData.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from('vocabulary')
      .insert(batch)

    if (error) {
      console.error(`\n❌ Error inserting batch:`, error.message)
      return false
    }
    
    inserted += batch.length
    process.stdout.write(`\r   Progress: ${inserted}/${vocabularyData.length} words`)
  }
  
  console.log('\n✅ Vocabulary words inserted')
  return true
}

// Step 4: Generate translations
async function generateTranslations(languages, testMode) {
  const modeLabel = testMode ? 'TEST' : 'FULL'
  console.log(`\n📌 Step 4: Generating translations (${modeLabel} MODE)...`)
  console.log(`   Languages: ${languages.length}`)
  console.log('   ⏳ This will take several minutes...\n')

  // Fetch vocabulary
  const { data: vocabulary, error: fetchError } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_CONFIG.id)
    .order('learning_order')

  if (fetchError || !vocabulary) {
    console.error('❌ Error fetching vocabulary:', fetchError)
    return false
  }

  console.log(`   Vocabulary words: ${vocabulary.length}\n`)

  const words = vocabulary.map(v => v.word_en)
  let totalTranslations = 0
  let successfulLanguages = 0
  const results = []

  for (const lang of languages) {
    process.stdout.write(`\n🌐 ${lang.name.padEnd(15)} ... `)
    
    const result = await translateBatchWithGemini(words, lang.code, lang.name)
    
    if (result.error) {
      console.log(`❌ ${result.error}`)
      results.push({ lang: lang.name, status: 'ERROR', error: result.error })
      await delay(3000)
      continue
    }

    const translations = result.translations
    
    // Match translations to vocabulary
    const translationData = []
    for (const word of vocabulary) {
      const translation = translations[word.word_en]
      if (translation) {
        translationData.push({
          vocabulary_id: word.id,
          language_code: lang.code,
          translated_word: translation
        })
      }
    }

    if (translationData.length !== vocabulary.length) {
      console.log(`⚠️  Got ${translationData.length}/${vocabulary.length} translations`)
    }

    // Insert translations
    const { error } = await supabase
      .from('vocabulary_translations')
      .insert(translationData)

    if (error && !error.message?.includes('duplicate')) {
      console.log(`❌ DB Error: ${error.message}`)
      results.push({ lang: lang.name, status: 'DB_ERROR', error: error.message })
      continue
    }

    console.log(`✅ ${translationData.length} translations`)
    totalTranslations += translationData.length
    successfulLanguages++
    results.push({ lang: lang.name, status: 'SUCCESS', count: translationData.length })
    
    await delay(2000)
  }

  console.log(`\n\n✅ Translation complete!`)
  console.log(`   Successful: ${successfulLanguages}/${languages.length} languages`)
  console.log(`   Total translations: ${totalTranslations}`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `bad-words-translations-${testMode ? 'test' : 'full'}-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify({ results, summary: { successfulLanguages, totalTranslations } }, null, 2))
  console.log(`\n📄 Results saved: ${filename}`)

  return true
}

// Main execution
async function main() {
  const testMode = process.argv.includes('--test')
  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║           GENERATE BAD WORDS TOPIC                     ║')
  console.log(`║              ${testMode ? 'TEST MODE' : 'FULL MODE'}                              ║`)
  console.log('╚════════════════════════════════════════════════════════╝')

  const startTime = Date.now()

  // Step 1: Setup topic
  if (!await setupTopic()) {
    console.error('\n❌ Topic setup failed')
    process.exit(1)
  }

  // Step 2: Cleanup
  if (!await cleanupDuplicates()) {
    console.error('\n❌ Cleanup failed')
    process.exit(1)
  }

  // Step 3: Insert vocabulary
  if (!await insertVocabulary()) {
    console.error('\n❌ Vocabulary insertion failed')
    process.exit(1)
  }

  // Step 4: Generate translations
  if (!await generateTranslations(languages, testMode)) {
    console.error('\n❌ Translation generation failed')
    process.exit(1)
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║              GENERATION COMPLETE                       ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
