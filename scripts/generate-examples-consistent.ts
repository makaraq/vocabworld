/**
 * Script to generate consistent example sentences across all languages
 * 
 * Approach:
 * 1. Fetch vocabulary words (vocabulary table only)
 * 2. Generate 3 example sentences in ENGLISH for each word
 * 3. Translate those same 3 sentences to ALL 50 languages
 * 4. Store with matching sentence_order so they align across languages
 * 
 * Usage:
 * - Test batch: npx tsx scripts/generate-examples-consistent.ts --limit 10
 * - Full generation: npx tsx scripts/generate-examples-consistent.ts
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
// Using gemini-2.0-flash-lite - 4K RPM, 4M TPM, Unlimited RPD
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

// All supported languages
const LANGUAGES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'es', 
  'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi', 'hr',
  'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk', 'ms',
  'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq',
  'sr', 'sv', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ar': 'Arabic', 'bg': 'Bulgarian', 'bn': 'Bengali', 'ca': 'Catalan',
  'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish', 'de': 'German',
  'el': 'Greek', 'es': 'Spanish', 'et': 'Estonian', 'eu': 'Basque',
  'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French', 'ga': 'Irish',
  'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi', 'hr': 'Croatian',
  'hu': 'Hungarian', 'id': 'Indonesian', 'is': 'Icelandic', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'lt': 'Lithuanian', 'lv': 'Latvian',
  'mk': 'Macedonian', 'ms': 'Malay', 'mt': 'Maltese', 'nl': 'Dutch',
  'no': 'Norwegian', 'pl': 'Polish', 'pt': 'Portuguese', 'ro': 'Romanian',
  'ru': 'Russian', 'sk': 'Slovak', 'sl': 'Slovenian', 'sq': 'Albanian',
  'sr': 'Serbian', 'sv': 'Swedish', 'sw': 'Swahili', 'th': 'Thai',
  'tl': 'Tagalog', 'tr': 'Turkish', 'uk': 'Ukrainian', 'vi': 'Vietnamese',
  'zh': 'Chinese'
}

interface VocabularyWord {
  id: number
  word_en: string
  part_of_speech?: string
  context?: string
}

interface ExampleSentence {
  sentence: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    limit: null as number | null,
    startFrom: 0,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      config.limit = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--start-from' && args[i + 1]) {
      config.startFrom = parseInt(args[i + 1])
      i++
    }
  }

  return config
}

async function fetchVocabulary(limit: number | null, startFrom: number): Promise<VocabularyWord[]> {
  console.log('📚 Fetching vocabulary words...')
  
  // If no limit specified, fetch ALL words (need to paginate due to Supabase 1000 row limit)
  if (!limit && startFrom === 0) {
    console.log('📥 Fetching all vocabulary (paginating in batches of 1000)...')
    const allWords: VocabularyWord[] = []
    let page = 0
    const pageSize = 1000
    
    while (true) {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('id, word_en, part_of_speech, context')
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      
      if (error) {
        console.error('❌ Error fetching vocabulary:', error)
        throw error
      }
      
      if (!data || data.length === 0) break
      
      allWords.push(...data)
      console.log(`  📄 Page ${page + 1}: ${data.length} words (total: ${allWords.length})`)
      
      if (data.length < pageSize) break // Last page
      page++
    }
    
    console.log(`✅ Fetched ${allWords.length} vocabulary words`)
    return allWords
  }
  
  // Handle limit and startFrom cases
  let query = supabase
    .from('vocabulary')
    .select('id, word_en, part_of_speech, context')
    .order('id', { ascending: true })

  if (startFrom > 0) {
    // Always use ID filter, not row position
    query = query.gte('id', startFrom)
    if (limit) {
      query = query.limit(limit)
    }
  } else if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Error fetching vocabulary:', error)
    throw error
  }

  console.log(`✅ Fetched ${data?.length || 0} vocabulary words`)
  return data || []
}

async function generateAllLanguageSentences(word: VocabularyWord, retryCount = 0): Promise<Record<string, string[]>> {
  const maxRetries = 3
  const languageList = ['en', ...LANGUAGES].map(code => LANGUAGE_NAMES[code] || code).join(', ')
  
  const prompt = `Generate 3 example sentences for the word "${word.word_en}" in ALL of these languages at once: ${languageList}

Context:
- Word: "${word.word_en}"
${word.part_of_speech ? `- Part of speech: ${word.part_of_speech}` : ''}
${word.context ? `- Context: ${word.context}` : ''}

Requirements:
1. Create 3 example sentences that use the word "${word.word_en}"
2. The 3 sentences should be THE SAME across all languages (just translated)
3. Keep sentences practical and useful (5-12 words each)
4. Translate the SAME 3 sentences to ALL ${['en', ...LANGUAGES].length} languages

Return ONLY valid JSON in this exact format:

{
  "en": ["English sentence 1", "English sentence 2", "English sentence 3"],
  "ar": ["Arabic translation 1", "Arabic translation 2", "Arabic translation 3"],
  "bg": ["Bulgarian translation 1", "Bulgarian translation 2", "Bulgarian translation 3"],
  ...and so on for all ${['en', ...LANGUAGES].length} languages
}

Use these exact language codes: ${['en', ...LANGUAGES].join(', ')}

Do not include any text before or after the JSON. Make sure all languages have exactly 3 sentences.`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    try {
      const parsed = JSON.parse(cleanedResponse)
      
      // Validate all languages have 3 sentences
      for (const lang of ['en', ...LANGUAGES]) {
        if (!parsed[lang] || !Array.isArray(parsed[lang]) || parsed[lang].length !== 3) {
          console.warn(`⚠️  Missing or invalid data for language: ${lang}`)
        }
      }
      
      return parsed
    } catch (parseError: any) {
      // Log the problematic response for debugging
      console.error(`  ❌ JSON Parse Error: ${parseError.message}`)
      console.error(`  Response length: ${cleanedResponse.length} characters`)
      console.error(`  First 500 chars: ${cleanedResponse.substring(0, 500)}`)
      console.error(`  Last 500 chars: ${cleanedResponse.substring(cleanedResponse.length - 500)}`)
      throw parseError
    }
    
    return parsed
  } catch (error: any) {
    if (retryCount < maxRetries) {
      console.log(`  ⚠️  Retry ${retryCount + 1}/${maxRetries} after error...`)
      await delay(10000) // Wait 10 seconds before retry
      return generateAllLanguageSentences(word, retryCount + 1)
    }
    console.error(`❌ Error generating sentences after ${maxRetries} retries:`, error)
    throw error
  }
}

async function saveExampleSentences(
  vocabularyId: number,
  allLanguages: Record<string, string[]>
): Promise<void> {
  const records: any[] = []

  // Save all languages
  for (const [langCode, sentences] of Object.entries(allLanguages)) {
    if (sentences && sentences.length === 3) {
      sentences.forEach((sentence, index) => {
        records.push({
          vocabulary_id: vocabularyId,
          language_code: langCode,
          sentence: sentence,
          translation: allLanguages['en']?.[index] || sentence, // English version as translation
          sentence_order: index + 1,
        })
      })
    }
  }

  if (records.length === 0) {
    throw new Error('No valid sentences to save')
  }

  const { error } = await supabase
    .from('example_sentences')
    .upsert(records, {
      onConflict: 'vocabulary_id,language_code,sentence_order',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('❌ Error saving to database:', error)
    throw error
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const config = parseArgs()
  
  console.log('🚀 Starting consistent example sentence generation')
  console.log('Configuration:', {
    limit: config.limit || 'all words',
    startFrom: config.startFrom,
    languages: LANGUAGES.length,
  })
  console.log('')

  try {
    const words = await fetchVocabulary(config.limit, config.startFrom)
    
    if (words.length === 0) {
      console.log('⚠️  No vocabulary words found')
      return
    }

    const results: any[] = []
    const startTime = Date.now()
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const progress = `[${i + 1}/${words.length}]`
      
      console.log(`\n${progress} Processing: "${word.word_en}" (id: ${word.id})`)

      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('example_sentences')
          .select('id')
          .eq('vocabulary_id', word.id)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`  ⏭️  Skipping (already has example sentences)`)
          skippedCount++
          
          results.push({
            vocabulary_id: word.id,
            word_en: word.word_en,
            skipped: true,
          })
          continue
        }

        // Generate all languages in ONE request
        console.log(`  🌍 Generating sentences for ALL ${LANGUAGES.length + 1} languages...`)
        const allLanguages = await generateAllLanguageSentences(word)
        
        // Save to database
        console.log(`  💾 Saving to database...`)
        await saveExampleSentences(word.id, allLanguages)
        
        const languageCount = Object.keys(allLanguages).length
        console.log(`  ✅ Complete! Generated ${languageCount} language versions`)
        successCount++
        
        results.push({
          vocabulary_id: word.id,
          word_en: word.word_en,
          languages_generated: languageCount,
          success: true,
        })

        // Save progress every 10 words
        if ((i + 1) % 10 === 0) {
          const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
          const progressFile = path.join(process.cwd(), `progress-${timestamp}.json`)
          fs.writeFileSync(progressFile, JSON.stringify({
            lastProcessedId: word.id,
            lastProcessedIndex: i + 1,
            successCount,
            errorCount,
            skippedCount,
            timestamp: new Date().toISOString()
          }, null, 2))
          console.log(`  💾 Progress saved`)
        }

        // Rate limiting
        if (i < words.length - 1) {
          await delay(6000)
        }

      } catch (error) {
        console.error(`  ❌ Failed:`, error)
        errorCount++
        
        results.push({
          vocabulary_id: word.id,
          word_en: word.word_en,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
        
        // Don't stop on error, continue with next word
        await delay(10000) // Wait longer after error
      }
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2)

    // Save results
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const resultsFile = path.join(process.cwd(), `example-sentences-consistent-${timestamp}.json`)
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))

    // Print summary
    console.log('\n═══════════════════════════════════════════')
    console.log('📊 GENERATION SUMMARY')
    console.log('═══════════════════════════════════════════')
    console.log(`Total words processed: ${words.length}`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`⏭️  Skipped (existing): ${skippedCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`⏱️  Duration: ${duration} minutes`)
    console.log(`📁 Results: ${resultsFile}`)
    console.log('═══════════════════════════════════════════')
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some words failed. You can resume by running:')
      console.log(`npx tsx scripts/generate-examples-consistent.ts --start-from ${words[words.length - 1].id}`)
    }
    console.log('')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
