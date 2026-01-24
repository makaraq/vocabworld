/**
 * Script to generate example sentences for vocabulary words using Google Gemini AI
 * 
 * This script:
 * 1. Fetches vocabulary words from Supabase (with optional language and limit filters)
 * 2. Uses Google Gemini to generate 3 example sentences for each word
 * 3. Stores the sentences in both the target language and English translation
 * 4. Saves results to the database
 * 
 * Usage:
 * - Test batch (45 Turkish words): npm run generate-examples -- --language tr --limit 45
 * - Full generation: npm run generate-examples -- --language tr
 * - All languages: npm run generate-examples
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
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in environment variables')
  console.log('Please add GEMINI_API_KEY to your .env.local file')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash-exp' })

// Language code to full name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'tr': 'Turkish',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'pl': 'Polish',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'uk': 'Ukrainian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sk': 'Slovak',
  'lt': 'Lithuanian',
  'lv': 'Latvian',
  'et': 'Estonian',
  'sl': 'Slovenian',
  'sr': 'Serbian',
  'ca': 'Catalan',
  'eu': 'Basque',
  'gl': 'Galician',
  'cy': 'Welsh',
  'ga': 'Irish',
  'mt': 'Maltese',
  'is': 'Icelandic',
  'sq': 'Albanian',
  'mk': 'Macedonian',
  'bs': 'Bosnian',
  'sw': 'Swahili',
  'ms': 'Malay',
  'tl': 'Tagalog',
  'af': 'Afrikaans'
}

interface VocabularyWord {
  id: number
  word_en: string
  translated_word: string
  language_code: string
  part_of_speech?: string
  context?: string
}

interface ExampleSentence {
  sentence: string
  translation: string
}

interface GenerationResult {
  vocabulary_id: number
  word_en: string
  translated_word: string
  language_code: string
  sentences: ExampleSentence[]
  success: boolean
  error?: string
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    languageCode: null as string | null,
    limit: null as number | null,
    startFrom: 0,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--language' && args[i + 1]) {
      config.languageCode = args[i + 1]
      i++
    } else if (args[i] === '--limit' && args[i + 1]) {
      config.limit = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--start-from' && args[i + 1]) {
      config.startFrom = parseInt(args[i + 1])
      i++
    }
  }

  return config
}

// Fetch vocabulary words from database
async function fetchVocabulary(languageCode: string | null, limit: number | null): Promise<VocabularyWord[]> {
  console.log('📚 Fetching vocabulary words...')
  
  let query = supabase
    .from('vocabulary_translations')
    .select(`
      id,
      vocabulary_id,
      translated_word,
      language_code,
      vocabulary!inner (
        id,
        word_en,
        part_of_speech,
        context
      )
    `)
    .order('vocabulary_id', { ascending: true })

  if (languageCode) {
    query = query.eq('language_code', languageCode)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Error fetching vocabulary:', error)
    throw error
  }

  // Flatten the data structure
  const words: VocabularyWord[] = []
  for (const item of data || []) {
    const vocab = (item as any).vocabulary
    words.push({
      id: vocab.id,
      word_en: vocab.word_en,
      translated_word: item.translated_word,
      language_code: item.language_code,
      part_of_speech: vocab.part_of_speech,
      context: vocab.context,
    })
  }

  console.log(`✅ Fetched ${words.length} vocabulary words`)
  return words
}

// Generate example sentences using Gemini
async function generateExampleSentences(word: VocabularyWord): Promise<ExampleSentence[]> {
  const languageName = LANGUAGE_NAMES[word.language_code] || word.language_code
  
  const prompt = `Generate exactly 3 example sentences for the word "${word.translated_word}" in ${languageName}.

Context:
- English word: "${word.word_en}"
- ${languageName} translation: "${word.translated_word}"
${word.part_of_speech ? `- Part of speech: ${word.part_of_speech}` : ''}
${word.context ? `- Context: ${word.context}` : ''}

Requirements:
1. Each sentence should naturally use the word "${word.translated_word}"
2. Sentences should vary in complexity (beginner to intermediate level)
3. Sentences should be practical and useful for language learners
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
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const parsed = JSON.parse(cleanedResponse)
    
    if (!parsed.sentences || !Array.isArray(parsed.sentences) || parsed.sentences.length !== 3) {
      throw new Error('Invalid response format from Gemini')
    }
    
    return parsed.sentences
  } catch (error) {
    console.error(`❌ Error generating sentences for "${word.translated_word}":`, error)
    throw error
  }
}

// Save example sentences to database
async function saveExampleSentences(
  vocabularyId: number,
  languageCode: string,
  sentences: ExampleSentence[]
): Promise<void> {
  const records = sentences.map((sentence, index) => ({
    vocabulary_id: vocabularyId,
    language_code: languageCode,
    sentence: sentence.sentence,
    translation: sentence.translation,
    sentence_order: index + 1,
  }))

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

// Add delay to respect API rate limits
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main execution function
async function main() {
  const config = parseArgs()
  
  console.log('🚀 Starting example sentence generation')
  console.log('Configuration:', {
    languageCode: config.languageCode || 'all languages',
    limit: config.limit || 'no limit',
    startFrom: config.startFrom,
  })
  console.log('')

  try {
    // Fetch vocabulary
    const words = await fetchVocabulary(config.languageCode, config.limit)
    
    if (words.length === 0) {
      console.log('⚠️  No vocabulary words found with the specified criteria')
      return
    }

    const results: GenerationResult[] = []
    const startTime = Date.now()
    let successCount = 0
    let errorCount = 0

    // Process each word
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const progress = `[${i + 1}/${words.length}]`
      
      console.log(`${progress} Processing: "${word.word_en}" → "${word.translated_word}" (${word.language_code})`)

      try {
        // Check if sentences already exist
        const { data: existing } = await supabase
          .from('example_sentences')
          .select('id')
          .eq('vocabulary_id', word.id)
          .eq('language_code', word.language_code)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`  ⏭️  Skipping (already has example sentences)`)
          results.push({
            vocabulary_id: word.id,
            word_en: word.word_en,
            translated_word: word.translated_word,
            language_code: word.language_code,
            sentences: [],
            success: true,
          })
          continue
        }

        // Generate sentences
        const sentences = await generateExampleSentences(word)
        
        // Save to database
        await saveExampleSentences(word.id, word.language_code, sentences)
        
        console.log(`  ✅ Generated and saved 3 example sentences`)
        successCount++
        
        results.push({
          vocabulary_id: word.id,
          word_en: word.word_en,
          translated_word: word.translated_word,
          language_code: word.language_code,
          sentences,
          success: true,
        })

        // Delay to respect rate limits (10 requests per minute = 6 seconds per request)
        if (i < words.length - 1) {
          await delay(6000) // 6 second delay between requests
        }
      } catch (error) {
        console.error(`  ❌ Failed:`, error)
        errorCount++
        
        results.push({
          vocabulary_id: word.id,
          word_en: word.word_en,
          translated_word: word.translated_word,
          language_code: word.language_code,
          sentences: [],
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    // Save results to file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const resultsFile = path.join(process.cwd(), `example-sentences-results-${timestamp}.json`)
    
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))

    // Print summary
    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('📊 GENERATION SUMMARY')
    console.log('═══════════════════════════════════════════')
    console.log(`Total words processed: ${words.length}`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📁 Results saved to: ${resultsFile}`)
    console.log('═══════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()
