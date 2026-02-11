/**
 * Test Bad Words translation generation with 1 language
 * Verifies the upsert logic and vocabulary check work correctly
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

const TOPIC_ID = 44

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test with Arabic (currently has 0 translations)
const TEST_LANGUAGE = { code: 'ar', name: 'Arabic' }

async function translateBatchWithGemini(words, languageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const wordList = words.map((w, i) => `${i + 1}. ${w.word_en}`).join('\n')
  
  const prompt = `Translate these English profanity/curse words to ${languageName}. Return culturally equivalent profanity.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "translations": [
    "translation1",
    "translation2"
  ]
}

English words:
${wordList}

Return JSON with ${words.length} translations in exact order:`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
    })
  })

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  
  let cleanedText = text.trim()
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  const parsed = JSON.parse(cleanedText)
  return parsed.translations
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     TEST BAD WORDS TRANSLATION (1 LANGUAGE)            ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Get vocabulary
  const { data: vocabulary } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order')

  console.log(`📝 Vocabulary: ${vocabulary.length} words`)
  console.log(`🌍 Test language: ${TEST_LANGUAGE.name} (${TEST_LANGUAGE.code})\n`)

  // Check existing translations
  const { count: beforeCount } = await supabase
    .from('vocabulary_translations')
    .select('*', { count: 'exact', head: true })
    .eq('language_code', TEST_LANGUAGE.code)
    .in('vocabulary_id', vocabulary.map(w => w.id))

  console.log(`📊 Before: ${beforeCount || 0} translations\n`)

  // Process in batches
  const BATCH_SIZE = 10
  let successCount = 0

  for (let i = 0; i < vocabulary.length; i += BATCH_SIZE) {
    const batch = vocabulary.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(vocabulary.length / BATCH_SIZE)
    
    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} words)...`)
    
    const translations = await translateBatchWithGemini(batch, TEST_LANGUAGE.name)
    
    if (!translations || translations.length !== batch.length) {
      console.log(`  ⚠️  Failed`)
      continue
    }

    const records = batch.map((word, idx) => ({
      vocabulary_id: word.id,
      language_code: TEST_LANGUAGE.code,
      translated_word: translations[idx]
    }))

    const { error } = await supabase
      .from('vocabulary_translations')
      .upsert(records, { onConflict: 'vocabulary_id,language_code' })

    if (!error) {
      successCount += batch.length
      console.log(`  ✅ Saved`)
    } else {
      console.log(`  ❌ Error: ${error.message}`)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Check after
  const { count: afterCount } = await supabase
    .from('vocabulary_translations')
    .select('*', { count: 'exact', head: true })
    .eq('language_code', TEST_LANGUAGE.code)
    .in('vocabulary_id', vocabulary.map(w => w.id))

  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║                    TEST COMPLETE                       ║`)
  console.log(`╚════════════════════════════════════════════════════════╝`)
  console.log(`\n📊 Results:`)
  console.log(`   Before: ${beforeCount || 0}`)
  console.log(`   After: ${afterCount || 0}`)
  console.log(`   Added: ${afterCount - (beforeCount || 0)}`)
  console.log(`   Success: ${successCount}`)
  console.log(`\n${afterCount === 40 ? '✅' : '⚠️'} Status: ${afterCount}/40 translations\n`)
}

main().catch(console.error)
