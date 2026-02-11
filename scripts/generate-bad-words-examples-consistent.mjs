/**
 * Generate consistent example sentences for Bad Words topic
 * Generates 3 English sentences per word, then translates to all 49 languages
 * 
 * Usage:
 * node scripts/generate-bad-words-examples-consistent.mjs
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

// 49 target languages (excluding English)
const TARGET_LANGUAGES = [
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Generate 3 English example sentences for a word
async function generateEnglishSentences(word) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const prompt = `Generate 3 example sentences using the English profanity word "${word}".
The sentences should show how this word is used in casual/informal contexts.
Keep sentences realistic and conversational.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "sentences": [
    "sentence 1",
    "sentence 2",
    "sentence 3"
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
      throw new Error(`API Error: ${response.status}`)
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
    console.error(`  ❌ Error:`, error.message)
    return null
  }
}

// Translate 3 sentences to target language
async function translateSentences(sentences, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const prompt = `Translate these 3 English sentences to ${languageName}:

1. ${sentences[0]}
2. ${sentences[1]}
3. ${sentences[2]}

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "translations": [
    "translation 1",
    "translation 2",
    "translation 3"
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
      throw new Error(`API Error: ${response.status}`)
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
    return false
  }

  return true
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║    GENERATE EXAMPLE SENTENCES - BAD WORDS              ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Fetch vocabulary
  const { data: vocabulary } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order')

  console.log(`📊 Configuration:`)
  console.log(`   Words: ${vocabulary.length}`)
  console.log(`   Languages: ${TARGET_LANGUAGES.length + 1} (49 target + English)`)
  console.log(`   Target sentences: ${vocabulary.length * 50 * 3}`)
  console.log(`\n⏳ Starting generation...\n`)

  const startTime = Date.now()
  let totalSuccess = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (let i = 0; i < vocabulary.length; i++) {
    const word = vocabulary[i]
    const progress = `[${i + 1}/${vocabulary.length}]`
    
    console.log(`\n${progress} ${'━'.repeat(40)}`)
    console.log(`\n📝 Processing word: "${word.word_en}" (ID: ${word.id})`)
    
    // Step 1: Generate 3 English sentences
    console.log(`  Step 1/2: Generating 3 English example sentences...`)
    const englishSentences = await generateEnglishSentences(word.word_en)
    
    if (!englishSentences) {
      console.log(`  ❌ Failed to generate English sentences`)
      totalErrors += 50
      continue
    }

    console.log(`  ✅ Generated English sentences:`)
    englishSentences.forEach((s, idx) => console.log(`     ${idx + 1}. ${s}`))

    // Save English sentences
    const savedEnglish = await saveExampleSentences(word.id, 'en', englishSentences, englishSentences)
    
    // Step 2: Translate to 49 languages
    console.log(`  Step 2/2: Translating to ${TARGET_LANGUAGES.length} languages...`)
    
    let langSuccess = savedEnglish ? 1 : 0
    let langSkipped = 0
    let langErrors = savedEnglish ? 0 : 1

    for (const language of TARGET_LANGUAGES) {
      const translations = await translateSentences(englishSentences, language.name)
      
      if (!translations) {
        langErrors++
        continue
      }

      const saved = await saveExampleSentences(word.id, language.code, englishSentences, translations)
      
      if (saved) {
        langSuccess++
      } else {
        langSkipped++ // Already exists
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    totalSuccess += langSuccess
    totalSkipped += langSkipped
    totalErrors += langErrors

    console.log(`  Summary: ✅ ${langSuccess} | ⏭️  ${langSkipped} | ❌ ${langErrors}`)
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1)

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `bad-words-examples-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify({
    topic_id: TOPIC_ID,
    words: vocabulary.length,
    languages: TARGET_LANGUAGES.length + 1,
    total_success: totalSuccess,
    total_skipped: totalSkipped,
    total_errors: totalErrors,
    duration_minutes: duration
  }, null, 2))

  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║              GENERATION COMPLETE                       ║`)
  console.log(`╚════════════════════════════════════════════════════════╝`)
  console.log(`\n⏱️  Duration: ${duration} minutes`)
  console.log(`\n📊 Results:`)
  console.log(`   ✅ Success: ${totalSuccess}`)
  console.log(`   ⏭️  Skipped: ${totalSkipped}`)
  console.log(`   ❌ Errors: ${totalErrors}`)
  console.log(`\n📝 Results saved to: ${filename}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
