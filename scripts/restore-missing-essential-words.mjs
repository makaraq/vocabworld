/**
 * Restore missing 17 words to Essential Words topic
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const TOPIC_ID = 43

// Missing words that need to be restored (learning_order 112-132)
const MISSING_WORDS = [
  { word: 'no', order: 112 },
  { word: 'not', order: 113 },
  { word: 'never', order: 114 },
  { word: 'and', order: 119 },
  { word: 'or', order: 120 },
  { word: 'but', order: 121 },
  { word: 'so', order: 122 },
  { word: 'yet', order: 123 },
  { word: 'in', order: 124 },
  { word: 'on', order: 125 },
  { word: 'at', order: 126 },
  { word: 'to', order: 127 },
  { word: 'for', order: 128 },
  { word: 'with', order: 129 },
  { word: 'from', order: 130 },
  { word: 'by', order: 131 },
  { word: 'of', order: 132 }
]

const LANGUAGES = [
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

async function translateBatch(words, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const prompt = `Translate these English grammar words to ${languageName}:

${words.map(w => `"${w}"`).join('\n')}

IMPORTANT: Return ONLY a JSON object with English words as keys and ${languageName} translations as values.
Format: {"word1": "translation1", "word2": "translation2"}
Do not include any explanation, just the JSON.`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    })
  })

  if (!response.ok) throw new Error(`API Error: ${response.status}`)

  const result = await response.json()
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) throw new Error('No response from API')

  text = text.trim()
  if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '')

  return JSON.parse(text)
}

async function main() {
  console.log('🔧 RESTORING MISSING ESSENTIAL WORDS\n')
  console.log(`Words to restore: ${MISSING_WORDS.length}`)
  console.log(`Languages: ${LANGUAGES.length}\n`)

  // Step 1: Insert vocabulary
  console.log('Step 1: Inserting vocabulary...')
  const vocabularyData = MISSING_WORDS.map(w => ({
    topic_id: TOPIC_ID,
    word_en: w.word,
    learning_order: w.order
  }))

  const { data: insertedVocab, error: vocabError } = await supabase
    .from('vocabulary')
    .insert(vocabularyData)
    .select('id, word_en')

  if (vocabError) throw vocabError

  console.log(`✅ Inserted ${insertedVocab.length} words\n`)

  // Step 2: Generate translations
  console.log('Step 2: Generating translations...\n')
  const words = insertedVocab.map(v => v.word_en)
  let successCount = 0
  let errorCount = 0

  for (const lang of LANGUAGES) {
    try {
      process.stdout.write(`  ${lang.name.padEnd(15)} ... `)
      
      const translations = await translateBatch(words, lang.name)
      
      const translationData = insertedVocab.map(vocab => ({
        vocabulary_id: vocab.id,
        language_code: lang.code,
        translated_word: translations[vocab.word_en]
      }))

      const { error } = await supabase
        .from('vocabulary_translations')
        .insert(translationData)

      if (error && !error.message?.includes('duplicate')) {
        console.log(`❌ DB Error`)
        errorCount++
      } else {
        console.log(`✅ ${translationData.length} translations`)
        successCount++
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.log(`❌ ${error.message}`)
      errorCount++
    }
  }

  console.log('\n✅ RESTORATION COMPLETE!')
  console.log(`  Successful: ${successCount}/${LANGUAGES.length}`)
  console.log(`  Errors: ${errorCount}`)
}

main().catch(console.error)
