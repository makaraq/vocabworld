/**
 * Generate Example Sentences for Essential Words Topic (ID 43)
 * Uses REST API approach for Gemini (gemini-2.5-flash-lite)
 * 
 * Usage:
 * node scripts/generate-essential-words-examples.mjs --test   (3 languages: Spanish, French, German)
 * node scripts/generate-essential-words-examples.mjs --full   (all 49 languages)
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

// Language configurations
const ALL_LANGUAGES = [
  { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' }, { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' }, { code: 'ru', name: 'Russian' }, { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' }, { code: 'bn', name: 'Bengali' }, { code: 'ca', name: 'Catalan' },
  { code: 'co', name: 'Corsican' }, { code: 'cs', name: 'Czech' }, { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' }, { code: 'el', name: 'Greek' }, { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' }, { code: 'fa', name: 'Persian' }, { code: 'fi', name: 'Finnish' },
  { code: 'ga', name: 'Irish' }, { code: 'he', name: 'Hebrew' }, { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' }, { code: 'hu', name: 'Hungarian' }, { code: 'ja', name: 'Japanese' },
  { code: 'ka', name: 'Georgian' }, { code: 'ko', name: 'Korean' }, { code: 'lb', name: 'Luxembourgish' },
  { code: 'lt', name: 'Lithuanian' }, { code: 'lv', name: 'Latvian' }, { code: 'mk', name: 'Macedonian' },
  { code: 'mt', name: 'Maltese' }, { code: 'no', name: 'Norwegian' }, { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' }, { code: 'sq', name: 'Albanian' }, { code: 'sr', name: 'Serbian' },
  { code: 'sv', name: 'Swedish' }, { code: 'ta', name: 'Tamil' }, { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' }, { code: 'tr', name: 'Turkish' }, { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' }, { code: 'vi', name: 'Vietnamese' }, { code: 'zh', name: 'Chinese' }
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

// Fetch vocabulary words for topic 43
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

// Fetch translations for a specific language
async function fetchTranslations(vocabularyIds, languageCode) {
  const { data, error } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, translated_word')
    .in('vocabulary_id', vocabularyIds)
    .eq('language_code', languageCode)
  
  if (error) {
    console.error(`❌ Error fetching translations for ${languageCode}:`, error)
    return {}
  }
  
  // Convert to map: vocabulary_id -> translated_word
  return data.reduce((acc, item) => {
    acc[item.vocabulary_id] = item.translated_word
    return acc
  }, {})
}

// Generate example sentences using Gemini REST API
async function generateExampleSentences(wordEn, translatedWord, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const prompt = `Generate exactly 3 example sentences for the word "${translatedWord}" in ${languageName}.

Context:
- English word: "${wordEn}"
- ${languageName} translation: "${translatedWord}"
- These are essential grammar words (pronouns, conjunctions, prepositions, auxiliary verbs)

Requirements:
1. Each sentence should naturally use the word "${translatedWord}"
2. Sentences should be simple and practical for language learners
3. Sentences should demonstrate different grammatical uses
4. Return ONLY valid JSON in this exact format:

{
  "sentences": [
    {
      "sentence": "Example sentence in ${languageName}",
      "translation": "English translation"
    },
    {
      "sentence": "Example sentence in ${languageName}",
      "translation": "English translation"
    },
    {
      "sentence": "Example sentence in ${languageName}",
      "translation": "English translation"
    }
  ]
}

Do not include any text before or after the JSON. The response must be valid JSON only.`

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

    // Clean up response
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
    console.error(`  ❌ Gemini API error:`, error.message)
    return null
  }
}

// Save example sentences to database
async function saveExampleSentences(vocabularyId, languageCode, sentences) {
  const records = sentences.map((sentence, index) => ({
    vocabulary_id: vocabularyId,
    language_code: languageCode,
    sentence: sentence.sentence,
    translation: sentence.translation,
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

// Main processing function
async function processLanguage(words, translationMap, language) {
  console.log(`\n📝 Processing ${language.name} (${language.code})`)
  
  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const translatedWord = translationMap[word.id]

    if (!translatedWord) {
      console.log(`  [${i + 1}/${words.length}] ⚠️  No translation for "${word.word_en}"`)
      skipCount++
      continue
    }

    // Check if already exists
    const exists = await checkExistingSentences(word.id, language.code)
    if (exists) {
      console.log(`  [${i + 1}/${words.length}] ⏭️  Already exists: "${word.word_en}" → "${translatedWord}"`)
      skipCount++
      continue
    }

    console.log(`  [${i + 1}/${words.length}] Processing: "${word.word_en}" → "${translatedWord}"`)

    // Generate sentences
    const sentences = await generateExampleSentences(word.word_en, translatedWord, language.name)
    
    if (!sentences) {
      errorCount++
      continue
    }

    // Save to database
    const saved = await saveExampleSentences(word.id, language.code, sentences)
    
    if (saved) {
      console.log(`    ✅ Saved 3 example sentences`)
      successCount++
    } else {
      errorCount++
    }

    // Rate limiting delay (2 seconds between requests)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log(`\n  Summary for ${language.name}:`)
  console.log(`    ✅ Success: ${successCount}`)
  console.log(`    ⏭️  Skipped: ${skipCount}`)
  console.log(`    ❌ Errors: ${errorCount}`)

  return { successCount, skipCount, errorCount }
}

// Main execution
async function main() {
  const testMode = process.argv.includes('--test')
  const languages = testMode ? TEST_LANGUAGES : ALL_LANGUAGES

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║   GENERATE EXAMPLE SENTENCES - ESSENTIAL WORDS         ║')
  console.log(`║              ${testMode ? 'TEST MODE' : 'FULL MODE'}                              ║`)
  console.log('╚════════════════════════════════════════════════════════╝')

  console.log(`\n📊 Configuration:`)
  console.log(`   Topic ID: ${TOPIC_ID} (Essential Words)`)
  console.log(`   Languages: ${languages.length} ${testMode ? '(test batch)' : '(all languages)'}`)
  console.log(`   Model: ${GEMINI_MODEL}`)

  // Fetch vocabulary
  const words = await fetchVocabularyWords()
  
  if (words.length === 0) {
    console.error('❌ No words found for topic 43')
    process.exit(1)
  }

  const vocabularyIds = words.map(w => w.id)
  const startTime = Date.now()
  const results = {
    totalLanguages: languages.length,
    totalWords: words.length,
    languages: {}
  }

  // Process each language
  for (const language of languages) {
    // Fetch translations
    const translationMap = await fetchTranslations(vocabularyIds, language.code)
    
    // Process language
    const stats = await processLanguage(words, translationMap, language)
    results.languages[language.code] = stats
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `essential-words-examples-${testMode ? 'test' : 'full'}-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))

  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║                  GENERATION COMPLETE                   ║`)
  console.log(`╚════════════════════════════════════════════════════════╝`)
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`📊 Total languages processed: ${languages.length}`)
  console.log(`📝 Results saved to: ${filename}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
