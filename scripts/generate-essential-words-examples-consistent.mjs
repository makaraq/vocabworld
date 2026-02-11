/**
 * Generate CONSISTENT Example Sentences for Essential Words Topic (ID 43)
 * 
 * Approach:
 * 1. Generate 3 English example sentences for each word
 * 2. Translate those SAME 3 sentences to all 49 languages
 * 3. Store with matching sentence_order for consistency
 * 
 * Usage:
 * node scripts/generate-essential-words-examples-consistent.mjs --test   (3 languages)
 * node scripts/generate-essential-words-examples-consistent.mjs --full   (all 49 languages)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

// Load environment variables
config({ path: '.env.local' })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const TOPIC_ID = 43 // Essential Words

// 50 languages with audio support (matches config/languages.js AUDIO_SUPPORTED_LANGUAGES)
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

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY')
  process.exit(1)
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Fetch vocabulary words
async function fetchVocabularyWords() {
  console.log(`\n📚 Fetching vocabulary for topic ${TOPIC_ID}...`)
  
  const { data, error } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order', { ascending: true })
  
  if (error) {
    console.error('❌ Error fetching vocabulary:', error)
    return []
  }
  
  console.log(`✅ Found ${data.length} words`)
  return data
}

// Generate 3 English example sentences
async function generateEnglishSentences(wordEn) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const prompt = `Generate exactly 3 example sentences in ENGLISH for the word "${wordEn}".

Context: This is a grammar/function word (pronoun, conjunction, preposition, or auxiliary verb).

Requirements:
1. Each sentence should naturally use the word "${wordEn}"
2. Sentences should be simple and practical for language learners
3. Sentences should demonstrate different uses
4. Return ONLY valid JSON in this exact format:

{
  "sentences": [
    "First example sentence using ${wordEn}",
    "Second example sentence using ${wordEn}",
    "Third example sentence using ${wordEn}"
  ]
}

Do not include any text before or after the JSON.`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
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

    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanedText)
    
    if (!parsed.sentences || !Array.isArray(parsed.sentences) || parsed.sentences.length !== 3) {
      throw new Error('Invalid response format')
    }

    return parsed.sentences
  } catch (error) {
    console.error(`  ❌ Error generating English sentences:`, error.message)
    return null
  }
}

// Translate 3 English sentences to target language
async function translateSentences(englishSentences, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const sentenceList = englishSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')
  
  const prompt = `Translate these 3 English sentences to ${languageName}.

SENTENCES:
${sentenceList}

Requirements:
1. Provide natural, idiomatic translations
2. Keep the same meaning and context
3. Return ONLY valid JSON in this exact format:

{
  "translations": [
    "First sentence in ${languageName}",
    "Second sentence in ${languageName}",
    "Third sentence in ${languageName}"
  ]
}

Do not include any text before or after the JSON.`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
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

    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanedText)
    
    if (!parsed.translations || !Array.isArray(parsed.translations) || parsed.translations.length !== 3) {
      throw new Error('Invalid response format')
    }

    return parsed.translations
  } catch (error) {
    console.error(`  ❌ Translation error for ${languageName}:`, error.message)
    return null
  }
}

// Save example sentences to database
async function saveExampleSentences(vocabularyId, languageCode, sentences, translations) {
  const records = sentences.map((sentence, index) => ({
    vocabulary_id: vocabularyId,
    language_code: languageCode,
    sentence: translations[index],
    translation: sentence, // English is stored in 'translation' field
    sentence_order: index + 1
  }))

  const { error } = await supabase
    .from('example_sentences')
    .insert(records)

  if (error) {
    console.error(`  ❌ Database error:`, error.message)
    return false
  }

  return true
}

// Check if sentences already exist
async function checkExistingSentences(vocabularyId, languageCode) {
  const { data, error } = await supabase
    .from('example_sentences')
    .select('id')
    .eq('vocabulary_id', vocabularyId)
    .eq('language_code', languageCode)
    .limit(1)

  return !error && data && data.length > 0
}

// Process a single word across all languages
async function processWord(word, languages) {
  console.log(`\n📝 Processing word: "${word.word_en}" (ID: ${word.id})`)
  
  // Step 1: Generate English sentences once
  console.log(`  Step 1/2: Generating 3 English example sentences...`)
  const englishSentences = await generateEnglishSentences(word.word_en)
  
  if (!englishSentences) {
    console.log(`  ❌ Failed to generate English sentences, skipping word`)
    return { success: 0, skipped: languages.length, errors: 0 }
  }
  
  console.log(`  ✅ Generated English sentences:`)
  englishSentences.forEach((s, i) => console.log(`     ${i + 1}. ${s}`))
  
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 2: Translate to all target languages
  console.log(`  Step 2/2: Translating to ${languages.length} languages...`)
  
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  for (const language of languages) {
    // Check if already exists
    const exists = await checkExistingSentences(word.id, language.code)
    if (exists) {
      skipCount++
      continue
    }
    
    // Translate sentences
    const translations = await translateSentences(englishSentences, language.name)
    
    if (!translations) {
      errorCount++
      continue
    }
    
    // Save to database
    const saved = await saveExampleSentences(word.id, language.code, englishSentences, translations)
    
    if (saved) {
      successCount++
    } else {
      errorCount++
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log(`  Summary: ✅ ${successCount} | ⏭️  ${skipCount} | ❌ ${errorCount}`)
  
  return { success: successCount, skipped: skipCount, errors: errorCount }
}

// Main execution
async function main() {
  const testMode = process.argv.includes('--test')
  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║   CONSISTENT EXAMPLE SENTENCES - ESSENTIAL WORDS       ║')
  console.log(`║              ${testMode ? 'TEST MODE' : 'FULL MODE'}                              ║`)
  console.log('╚════════════════════════════════════════════════════════╝')

  console.log(`\n📊 Configuration:`)
  console.log(`   Topic ID: ${TOPIC_ID} (Essential Words)`)
  console.log(`   Languages: ${languages.length} ${testMode ? '(test batch)' : '(all languages)'}`)
  console.log(`   Model: ${GEMINI_MODEL}`)
  console.log(`   Approach: Generate English → Translate to all languages`)

  // Fetch vocabulary
  const words = await fetchVocabularyWords()
  
  if (words.length === 0) {
    console.error('❌ No words found for topic 43')
    process.exit(1)
  }

  const startTime = Date.now()
  const results = {
    totalLanguages: languages.length,
    totalWords: words.length,
    words: []
  }

  // Process each word
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    console.log(`\n[${i + 1}/${words.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    
    const stats = await processWord(word, languages)
    results.words.push({
      word_en: word.word_en,
      vocabulary_id: word.id,
      ...stats
    })
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  // Calculate totals
  const totals = results.words.reduce((acc, w) => ({
    success: acc.success + w.success,
    skipped: acc.skipped + w.skipped,
    errors: acc.errors + w.errors
  }), { success: 0, skipped: 0, errors: 0 })

  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `essential-words-consistent-${testMode ? 'test' : 'full'}-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))

  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║                  GENERATION COMPLETE                   ║`)
  console.log(`╚════════════════════════════════════════════════════════╝`)
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`📊 Words processed: ${words.length}`)
  console.log(`📊 Languages: ${languages.length}`)
  console.log(`\n📈 Total Results:`)
  console.log(`   ✅ Success: ${totals.success}`)
  console.log(`   ⏭️  Skipped: ${totals.skipped}`)
  console.log(`   ❌ Errors: ${totals.errors}`)
  console.log(`\n📝 Results saved to: ${filename}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
