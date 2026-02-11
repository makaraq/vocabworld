/**
 * Add Bad Words topic with 40 profanity/curse words
 * Topic ID: 44
 * Uses Gemini REST API for translations to 50 languages
 * 
 * Usage:
 * node scripts/add-bad-words-topic-rest-api.mjs --test   (3 languages)
 * node scripts/add-bad-words-topic-rest-api.mjs --full   (all 50 languages)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const TOPIC_ID = 44
const TOPIC_NAME = 'Bad Words'
const TOPIC_DESCRIPTION = 'Profanity and curse words - understand, don\'t use offensively'

// 40 words organized by severity
const BAD_WORDS = [
  // Mild Profanity (1-10)
  { order: 1, word: 'damn', category: 'Mild Profanity' },
  { order: 2, word: 'hell', category: 'Mild Profanity' },
  { order: 3, word: 'crap', category: 'Mild Profanity' },
  { order: 4, word: 'jerk', category: 'Mild Profanity' },
  { order: 5, word: 'idiot', category: 'Mild Profanity' },
  { order: 6, word: 'stupid', category: 'Mild Profanity' },
  { order: 7, word: 'dumb', category: 'Mild Profanity' },
  { order: 8, word: 'moron', category: 'Mild Profanity' },
  { order: 9, word: 'loser', category: 'Mild Profanity' },
  { order: 10, word: 'shut up', category: 'Mild Profanity' },
  
  // Moderate Profanity (11-20)
  { order: 11, word: 'ass', category: 'Moderate Profanity' },
  { order: 12, word: 'asshole', category: 'Moderate Profanity' },
  { order: 13, word: 'bastard', category: 'Moderate Profanity' },
  { order: 14, word: 'bloody', category: 'Moderate Profanity' },
  { order: 15, word: 'bullshit', category: 'Moderate Profanity' },
  { order: 16, word: 'piss', category: 'Moderate Profanity' },
  { order: 17, word: 'pissed', category: 'Moderate Profanity' },
  { order: 18, word: 'screw', category: 'Moderate Profanity' },
  { order: 19, word: 'screwed', category: 'Moderate Profanity' },
  { order: 20, word: 'sucks', category: 'Moderate Profanity' },
  
  // Strong Profanity (21-30)
  { order: 21, word: 'shit', category: 'Strong Profanity' },
  { order: 22, word: 'shitty', category: 'Strong Profanity' },
  { order: 23, word: 'fuck', category: 'Strong Profanity' },
  { order: 24, word: 'fucked', category: 'Strong Profanity' },
  { order: 25, word: 'fucking', category: 'Strong Profanity' },
  { order: 26, word: 'motherfucker', category: 'Strong Profanity' },
  { order: 27, word: 'son of a bitch', category: 'Strong Profanity' },
  { order: 28, word: 'bitch', category: 'Strong Profanity' },
  { order: 29, word: 'prick', category: 'Strong Profanity' },
  { order: 30, word: 'dick', category: 'Strong Profanity' },
  
  // Severe Profanity (31-40)
  { order: 31, word: 'cock', category: 'Severe Profanity' },
  { order: 32, word: 'pussy', category: 'Severe Profanity' },
  { order: 33, word: 'slut', category: 'Severe Profanity' },
  { order: 34, word: 'whore', category: 'Severe Profanity' },
  { order: 35, word: 'jackass', category: 'Severe Profanity' },
  { order: 36, word: 'douche', category: 'Severe Profanity' },
  { order: 37, word: 'douchebag', category: 'Severe Profanity' },
  { order: 38, word: 'arse', category: 'Severe Profanity' },
  { order: 39, word: 'bugger', category: 'Severe Profanity' },
  { order: 40, word: 'wanker', category: 'Severe Profanity' }
]

// 50 languages (49 target + English)
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
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Step 1: Create topic
async function insertTopic() {
  console.log('\n📚 Creating Bad Words topic...')
  
  const { error } = await supabase
    .from('topics')
    .upsert({
      id: TOPIC_ID,
      name: TOPIC_NAME,
      description: TOPIC_DESCRIPTION
    }, { onConflict: 'id' })

  if (error) {
    console.error('❌ Topic creation failed:', error.message)
    return false
  }

  console.log('✅ Topic created successfully')
  return true
}

// Step 2: Insert vocabulary
async function insertVocabulary() {
  console.log('\n📝 Inserting 40 bad words...')
  
  const records = BAD_WORDS.map(item => ({
    topic_id: TOPIC_ID,
    word_en: item.word,
    learning_order: item.order
  }))

  const { data, error } = await supabase
    .from('vocabulary')
    .insert(records)
    .select()

  if (error) {
    console.error('❌ Vocabulary insertion failed:', error.message)
    return null
  }

  console.log(`✅ ${data.length} words inserted`)
  return data
}

// Step 3: Translate using Gemini REST API
async function translateBatchWithGemini(words, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const wordList = words.map((w, i) => `${i + 1}. ${w.word_en}`).join('\n')
  
  const prompt = `Translate these English profanity/curse words to ${languageName}. Return culturally equivalent profanity.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "translations": [
    "translation1",
    "translation2",
    "translation3"
  ]
}

English words:
${wordList}

Return JSON with ${words.length} translations in exact order:`

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
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No text in response')
    }

    // Clean JSON
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanedText)
    
    if (!parsed.translations || !Array.isArray(parsed.translations)) {
      throw new Error('Invalid JSON format')
    }

    return parsed.translations
  } catch (error) {
    console.error(`  ❌ Error:`, error.message)
    return null
  }
}

// Step 4: Generate translations
async function generateTranslations(vocabulary, languages) {
  console.log(`\n🌍 Generating translations for ${languages.length} languages...\n`)
  
  const BATCH_SIZE = 10
  let totalSuccess = 0
  let totalErrors = 0

  for (const language of languages) {
    console.log(`📝 Processing ${language.name}...`)
    
    // Process in batches
    for (let i = 0; i < vocabulary.length; i += BATCH_SIZE) {
      const batch = vocabulary.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(vocabulary.length / BATCH_SIZE)
      
      console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} words)...`)
      
      const translations = await translateBatchWithGemini(batch, language.name)
      
      if (!translations || translations.length !== batch.length) {
        console.log(`  ⚠️  Batch ${batchNum} failed or incorrect count`)
        totalErrors += batch.length
        continue
      }

      // Save translations
      const records = batch.map((word, idx) => ({
        vocabulary_id: word.id,
        language_code: language.code,
        translated_word: translations[idx]
      }))

      const { error } = await supabase
        .from('vocabulary_translations')
        .upsert(records, { onConflict: 'vocabulary_id,language_code' })

      if (error) {
        console.log(`  ❌ Database error: ${error.message}`)
        totalErrors += batch.length
      } else {
        totalSuccess += batch.length
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log(`  ✅ ${language.name} complete\n`)
  }

  return { totalSuccess, totalErrors }
}

// Main execution
async function main() {
  const testMode = process.argv.includes('--test')
  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║           ADD BAD WORDS TOPIC                          ║')
  console.log(`║              ${testMode ? 'TEST MODE' : 'FULL MODE'}                              ║`)
  console.log('╚════════════════════════════════════════════════════════╝')

  const startTime = Date.now()

  // Step 1: Create topic
  const topicCreated = await insertTopic()
  if (!topicCreated) {
    console.error('\n❌ Failed to create topic')
    process.exit(1)
  }

  // Step 2: Check if vocabulary already exists, otherwise insert
  let vocabulary = null
  const { data: existing, count: existingCount } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact' })
    .eq('topic_id', TOPIC_ID)
  
  if (existingCount > 0) {
    console.log(`\n📝 Vocabulary already exists (${existingCount} words), skipping insertion`)
    vocabulary = existing
  } else {
    vocabulary = await insertVocabulary()
    if (!vocabulary) {
      console.error('\n❌ Failed to insert vocabulary')
      process.exit(1)
    }
  }

  // Step 3: Generate translations
  const { totalSuccess, totalErrors } = await generateTranslations(vocabulary, languages)

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `bad-words-results-${testMode ? 'test' : 'full'}-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify({
    topic_id: TOPIC_ID,
    words_count: vocabulary.length,
    languages_count: languages.length,
    translations_success: totalSuccess,
    translations_errors: totalErrors,
    duration_minutes: duration
  }, null, 2))

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║                  GENERATION COMPLETE                   ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`📊 Statistics:`)
  console.log(`   Words: ${vocabulary.length}`)
  console.log(`   Languages: ${languages.length}`)
  console.log(`   Target translations: ${vocabulary.length * languages.length}`)
  console.log(`   ✅ Success: ${totalSuccess}`)
  console.log(`   ❌ Errors: ${totalErrors}`)
  console.log(`\n📝 Results saved to: ${filename}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
