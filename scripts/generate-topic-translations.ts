/**
 * Test Script: Translate Topic Names Only
 * 
 * Translates topic names ("Greetings" → "Selamlaşmalar")
 * Test with 3 topics × 5 languages before full run
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Supabase with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// All 50 supported languages
const ALL_LANGUAGES = [
  { code: 'ar', name: 'Arabic' }, { code: 'bg', name: 'Bulgarian' }, { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' }, { code: 'cs', name: 'Czech' }, { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' }, { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' },
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'et', name: 'Estonian' },
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

interface Topic {
  id: number
  name: string
  description: string
}

interface TopicTranslation {
  topic_id: number
  language_code: string
  translated_name: string
}

/**
 * Fetch topics from database
 */
async function fetchTopics(): Promise<Topic[]> {
  console.log('📊 Fetching topics from database...\n')
  
  const { data, error } = await supabase
    .from('topics')
    .select('id, name, description')
    .order('id')

  if (error) {
    console.error('❌ Error fetching topics:', error)
    return []
  }

  console.log(`✅ Found ${data.length} topics\n`)
  return data
}

/**
 * Batch translate topic names using Gemini
 */
async function translateTopicsBatch(
  topics: Topic[],
  targetLanguageCode: string,
  targetLanguageName: string
): Promise<TopicTranslation[]> {
  console.log(`\n🌐 Translating to ${targetLanguageName} (${targetLanguageCode})...`)
  
  const topicList = topics.map((topic, idx) => 
    `${idx + 1}. "${topic.name}"`
  ).join('\n')
  
  const prompt = `You are a professional translator specializing in educational content for language learning apps.

CONTEXT:
These are topic names for a vocabulary learning app.
Examples: "Greetings", "Numbers", "Food", "Travel", "Emergency"

TARGET LANGUAGE: ${targetLanguageName}

TASK:
Translate the topic names to ${targetLanguageName}. 

RULES:
1. Keep translations SHORT (1-3 words max)
2. Use natural, commonly-used words that learners would recognize
3. Maintain the educational/categorical nature (these are section headers)
4. Use appropriate casing for ${targetLanguageName}
5. Return ONLY a JSON object mapping numbers to translated names

TOPICS TO TRANSLATE:
${topicList}

Return format (JSON only, no markdown):
{
  "1": "translated topic name",
  "2": "translated topic name",
  "3": "translated topic name"
}

Translation:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    // Clean up response - remove markdown code blocks if present
    const jsonText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    const translations = JSON.parse(jsonText)
    
    // Convert to array format
    const results: TopicTranslation[] = []
    topics.forEach((topic, idx) => {
      const key = (idx + 1).toString()
      if (translations[key]) {
        results.push({
          topic_id: topic.id,
          language_code: targetLanguageCode,
          translated_name: translations[key]
        })
      }
    })
    
    console.log(`✅ Translated ${results.length} topics`)
    return results
    
  } catch (error) {
    console.error(`❌ Error translating to ${targetLanguageName}:`, error)
    return []
  }
}

/**
 * Check if topic already has translation in database
 */
async function checkExistingTranslation(
  topicId: number,
  languageCode: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('topic_translations')
    .select('id')
    .eq('topic_id', topicId)
    .eq('language_code', languageCode)
    .single()

  return !error && data !== null
}

/**
 * Save translations to database
 */
async function saveTranslations(translations: TopicTranslation[]): Promise<void> {
  if (translations.length === 0) return

  const { error } = await supabase
    .from('topic_translations')
    .upsert(translations, { onConflict: 'topic_id,language_code' })

  if (error) {
    console.error('❌ Error saving translations:', error)
  } else {
    console.log(`✅ Saved ${translations.length} translations to database`)
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n============================================================')
  console.log('🧪 TOPIC TRANSLATION TEST')
  console.log('============================================================\n')

  // Step 1: Fetch all topics
  const allTopics = await fetchTopics()
  
  if (allTopics.length === 0) {
    console.log('❌ No topics found. Exiting.')
    return
  }

  console.log('Sample topics (first 10):')
  allTopics.slice(0, 10).forEach((topic, idx) => {
    console.log(`  ${idx + 1}. "${topic.name}" - ${topic.description}`)
  })
  console.log(`\n📋 Processing ALL ${allTopics.length} topics...`)

  // Step 2: Translate to all languages
  const results: TopicTranslation[] = []
  let languageCount = 0
  
  for (const lang of ALL_LANGUAGES) {
    languageCount++
    console.log(`\n--- [${languageCount}/${ALL_LANGUAGES.length}] Processing ${lang.name} (${lang.code}) ---`)
    
    // Check existing translations
    const toTranslate: Topic[] = []
    let skipped = 0

    for (const topic of allTopics) {
      const exists = await checkExistingTranslation(topic.id, lang.code)
      if (exists) {
        skipped++
      } else {
        toTranslate.push(topic)
      }
    }

    console.log(`📊 Skipped: ${skipped}, To translate: ${toTranslate.length}`)

    if (toTranslate.length === 0) {
      console.log('✅ All topics already translated')
      continue
    }

    // Batch translate
    const translations = await translateTopicsBatch(toTranslate, lang.code, lang.name)
    results.push(...translations)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  // Step 4: Save to database
  console.log('\n💾 Saving translations...')
  await saveTranslations(results)

  // Step 5: Save test results to JSON
  const outputFile = `topic-translation-test-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
  console.log(`\n📄 Test results saved to: ${outputFile}`)

  // Step 6: Display summary
  console.log('\n============================================================')
  console.log('📊 TEST SUMMARY')
  console.log('============================================================')
  console.log(`Total topics: ${allTopics.length}`)
  console.log(`Total languages: ${ALL_LANGUAGES.length}`)
  console.log(`Translations created: ${results.length}`)
  console.log(`Expected total: ${allTopics.length * ALL_LANGUAGES.length}`)
  console.log('\nSample translations (first 3 topics):')
  
  // Group by topic
  const byTopic: Record<number, any[]> = {}
  results.forEach(r => {
    if (!byTopic[r.topic_id]) byTopic[r.topic_id] = []
    byTopic[r.topic_id].push({ 
      lang: r.language_code, 
      name: r.translated_name
    })
  })

  const sampleTopicIds = Object.keys(byTopic).slice(0, 3)
  sampleTopicIds.forEach(topicId => {
    const originalTopic = allTopics.find(t => t.id === parseInt(topicId))
    console.log(`\n"${originalTopic?.name}":`)
    const trans = byTopic[parseInt(topicId)].slice(0, 5)
    trans.forEach(t => console.log(`  ${t.lang}: "${t.name}"`))
    if (byTopic[parseInt(topicId)].length > 5) {
      console.log(`  ... and ${byTopic[parseInt(topicId)].length - 5} more`)
    }
  })

  console.log('\n✅ Full translation complete!')
  console.log('\nNext steps:')
  console.log('1. Review sample translations above')
  console.log('2. Check database table: topic_translations')
  console.log('3. Update app to use translated topics')
  console.log('============================================================\n')
}

// Run test
runTest().catch(console.error)
