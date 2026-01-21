/**
 * Generate Phonetic Transcriptions using eSpeak-NG
 * 
 * This script:
 * 1. Fetches all vocabulary words from database
 * 2. Generates IPA phonetics using eSpeak-NG
 * 3. Stores phonetics in vocabulary_phonetics table
 * 
 * Prerequisites:
 * - Install eSpeak-NG: https://github.com/espeak-ng/espeak-ng
 *   Windows: choco install espeak-ng
 *   Mac: brew install espeak-ng
 *   Linux: apt-get install espeak-ng
 * 
 * Usage:
 *   npm run generate-phonetics
 *   npm run generate-phonetics -- --language=es --limit=100
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const execAsync = promisify(exec)

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please ensure .env.local contains:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Language code mapping for eSpeak-NG
// Maps our 2-letter codes to eSpeak voice codes
const ESPEAK_LANGUAGE_MAP: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ja': 'ja',
  'ko': 'ko',
  'zh': 'zh',
  'ar': 'ar',
  'hi': 'hi',
  'nl': 'nl',
  'pl': 'pl',
  'tr': 'tr',
  'sv': 'sv',
  'no': 'no',
  'da': 'da',
  'fi': 'fi',
  'cs': 'cs',
  'el': 'el',
  'he': 'he',
  'hu': 'hu',
  'id': 'id',
  'th': 'th',
  'vi': 'vi',
  'uk': 'uk',
  'ro': 'ro',
  'sk': 'sk',
  'hr': 'hr',
  'bg': 'bg',
  'sr': 'sr',
  'ca': 'ca',
  'fa': 'fa',
  'bn': 'bn',
  'ta': 'ta',
  'te': 'te',
  'mr': 'mr',
  'ml': 'ml',
  'gu': 'gu',
  'ur': 'ur',
  'cy': 'cy',
  'ga': 'ga',
  'is': 'is',
  'mt': 'mt',
  'mk': 'mk',
  'sl': 'sl',
  'lv': 'lv',
  'lt': 'lt',
  'et': 'et',
  'eu': 'eu'
}

interface GenerateOptions {
  language?: string
  limit?: number
  offset?: number
  topicId?: number
  forceRegenerate?: boolean
}

/**
 * Generate IPA phonetic using eSpeak-NG
 */
async function generatePhonetic(text: string, languageCode: string): Promise<string | null> {
  const espeakLang = ESPEAK_LANGUAGE_MAP[languageCode] || 'en'
  
  try {
    // Escape quotes and special characters
    const escapedText = text.replace(/"/g, '\\"')
    
    // Run eSpeak-NG to get IPA output
    // -q: quiet (no audio), --ipa: output IPA, -v: voice
    const command = `espeak-ng -q --ipa -v ${espeakLang} "${escapedText}"`
    
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr && !stderr.includes('Warning')) {
      console.error(`⚠️ eSpeak warning for "${text}": ${stderr}`)
    }
    
    // Clean up the output (remove trailing newlines and spaces)
    const phonetic = stdout.trim()
    
    return phonetic || null
  } catch (error: any) {
    console.error(`❌ Failed to generate phonetic for "${text}" (${languageCode}):`, error.message)
    return null
  }
}

/**
 * Process vocabulary entries and generate phonetics
 */
async function processVocabulary(options: GenerateOptions = {}) {
  const { language, limit, offset = 0, topicId, forceRegenerate = false } = options
  
  console.log('🚀 Starting phonetic generation...')
  console.log('Options:', { language, limit, offset, topicId, forceRegenerate })
  
  // Fetch vocabulary with translations
  let query = supabase
    .from('vocabulary')
    .select(`
      id,
      word_en,
      topic_id,
      vocabulary_translations (
        id,
        language_code,
        translated_word
      )
    `)
    .order('id')
  
  if (topicId) {
    query = query.eq('topic_id', topicId)
  }
  
  if (limit) {
    query = query.range(offset, offset + limit - 1)
  }
  
  const { data: vocabulary, error } = await query
  
  if (error) {
    console.error('❌ Failed to fetch vocabulary:', error)
    return
  }
  
  if (!vocabulary || vocabulary.length === 0) {
    console.log('⚠️ No vocabulary entries found')
    return
  }
  
  console.log(`📚 Processing ${vocabulary.length} vocabulary entries...`)
  
  let successCount = 0
  let errorCount = 0
  let skipCount = 0
  
  for (const [index, vocab] of vocabulary.entries()) {
    const progress = `[${index + 1}/${vocabulary.length}]`
    console.log(`\n${progress} Processing: "${vocab.word_en}" (ID: ${vocab.id})`)
    
    // Process English word
    console.log(`  🇬🇧 Generating English phonetic...`)
    const englishPhonetic = await generatePhonetic(vocab.word_en, 'en')
    
    if (englishPhonetic) {
      await savePhonetic(vocab.id, 'en', englishPhonetic, forceRegenerate)
      successCount++
    } else {
      errorCount++
    }
    
    // Process translations
    if (vocab.vocabulary_translations && Array.isArray(vocab.vocabulary_translations)) {
      for (const translation of vocab.vocabulary_translations) {
        const langCode = translation.language_code
        
        // Skip if filtering by language and this isn't it
        if (language && langCode !== language) {
          continue
        }
        
        // Check if phonetic already exists
        if (!forceRegenerate) {
          const { data: existing } = await supabase
            .from('vocabulary_phonetics')
            .select('id')
            .eq('vocabulary_id', vocab.id)
            .eq('language_code', langCode)
            .single()
          
          if (existing) {
            console.log(`  ⏭️  Skipping ${langCode} (already exists)`)
            skipCount++
            continue
          }
        }
        
        console.log(`  🌍 Generating ${langCode} phonetic: "${translation.translated_word}"`)
        const phonetic = await generatePhonetic(translation.translated_word, langCode)
        
        if (phonetic) {
          await savePhonetic(vocab.id, langCode, phonetic, forceRegenerate)
          successCount++
        } else {
          errorCount++
        }
        
        // Removed delay for faster generation
        // await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
  
  console.log('\n✅ Phonetic generation complete!')
  console.log(`   Success: ${successCount}`)
  console.log(`   Errors: ${errorCount}`)
  console.log(`   Skipped: ${skipCount}`)
}

/**
 * Save phonetic to database
 */
async function savePhonetic(
  vocabularyId: number,
  languageCode: string,
  phoneticIpa: string,
  forceRegenerate: boolean
) {
  try {
    const data = {
      vocabulary_id: vocabularyId,
      language_code: languageCode,
      phonetic_ipa: phoneticIpa,
      phonetic_system: 'IPA',
      source: 'espeak-ng',
      updated_at: new Date().toISOString()
    }
    
    if (forceRegenerate) {
      // Upsert: update if exists, insert if not
      const { error } = await supabase
        .from('vocabulary_phonetics')
        .upsert(data, {
          onConflict: 'vocabulary_id,language_code'
        })
      
      if (error) {
        console.error(`     ❌ Failed to save phonetic:`, error.message)
      } else {
        console.log(`     ✅ Saved: /${phoneticIpa}/`)
      }
    } else {
      // Insert only
      const { error } = await supabase
        .from('vocabulary_phonetics')
        .insert(data)
      
      if (error) {
        console.error(`     ❌ Failed to save phonetic:`, error.message)
      } else {
        console.log(`     ✅ Saved: /${phoneticIpa}/`)
      }
    }
  } catch (error: any) {
    console.error(`     ❌ Unexpected error:`, error.message)
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options: GenerateOptions = {}
  
  console.log('Raw args:', args)
  
  for (const arg of args) {
    if (arg.startsWith('--language=')) {
      options.language = arg.split('=')[1]
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--offset=')) {
      options.offset = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--topic=')) {
      options.topicId = parseInt(arg.split('=')[1])
    } else if (arg === '--force') {
      options.forceRegenerate = true
    }
  }
  
  console.log('🎤 eSpeak-NG Phonetic Generator')
  console.log('================================\n')
  
  // Verify eSpeak-NG is installed
  try {
    await execAsync('espeak-ng --version')
    console.log('✅ eSpeak-NG detected\n')
  } catch (error) {
    console.error('❌ eSpeak-NG not found!')
    console.error('Please install eSpeak-NG:')
    console.error('  Windows: choco install espeak-ng')
    console.error('  Mac: brew install espeak-ng')
    console.error('  Linux: apt-get install espeak-ng')
    process.exit(1)
  }
  
  await processVocabulary(options)
}

// Run the script
main().catch(console.error)
