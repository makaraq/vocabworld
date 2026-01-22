/**
 * Generate phonetics using Google Gemini API
 * More accurate than eSpeak-NG for complex languages
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

// Get language from command line
const args = process.argv.slice(2)
const languageArg = args.find(arg => arg.startsWith('--language='))
const forceArg = args.includes('--force')

if (!languageArg) {
  console.error('❌ Please specify a language: --language=en')
  process.exit(1)
}

const languageCode = languageArg.split('=')[1]

console.log('🤖 Gemini Phonetics Generator')
console.log('='.repeat(80))
console.log(`📝 Language: ${languageCode}`)
console.log(`🔄 Force regenerate: ${forceArg}`)
console.log('='.repeat(80))
console.log('')

// Language name mapping for Gemini prompts
const languageNames: Record<string, string> = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
  'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
  'bn': 'Bengali', 'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish',
  'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish',
  'el': 'Greek', 'cs': 'Czech', 'hu': 'Hungarian', 'ro': 'Romanian',
  'uk': 'Ukrainian', 'bg': 'Bulgarian', 'sr': 'Serbian', 'hr': 'Croatian',
  'sk': 'Slovak', 'sl': 'Slovenian', 'et': 'Estonian', 'lv': 'Latvian',
  'lt': 'Lithuanian', 'sq': 'Albanian', 'ca': 'Catalan', 'eu': 'Basque',
  'is': 'Icelandic', 'ga': 'Irish', 'cy': 'Welsh', 'mt': 'Maltese',
  'he': 'Hebrew', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
  'ms': 'Malay', 'tl': 'Tagalog', 'sw': 'Swahili', 'af': 'Afrikaans',
  'zu': 'Zulu', 'xh': 'Xhosa'
}

async function generatePhoneticBatch(words: string[], lang: string): Promise<string[]> {
  const languageName = languageNames[lang] || lang
  
  const prompt = `Generate IPA (International Phonetic Alphabet) pronunciations for these ${languageName} words.
Return ONLY the IPA transcriptions, one per line, in the exact same order.
Do not include any explanations, numbers, or extra text.
Each line should contain ONLY the IPA transcription.

Words:
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

IPA Transcriptions:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text().trim()
    
    // Split by newlines and clean up
    const phonetics = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove numbering if present
        return line.replace(/^\d+\.\s*/, '')
      })
    
    return phonetics
  } catch (error) {
    console.error('❌ Gemini API error:', error)
    throw error
  }
}

async function savePhonetic(vocabularyId: number, languageCode: string, phoneticIpa: string, force: boolean) {
  const data = {
    vocabulary_id: vocabularyId,
    language_code: languageCode,
    phonetic_ipa: phoneticIpa,
    phonetic_system: 'IPA',
    source: 'gemini',
    updated_at: new Date().toISOString()
  }

  if (force) {
    const { error } = await supabase
      .from('vocabulary_phonetics')
      .upsert(data, { onConflict: 'vocabulary_id,language_code' })
    
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('vocabulary_phonetics')
      .insert(data)
    
    if (error) {
      if (error.code === '23505') {
        return // Already exists, skip
      }
      throw error
    }
  }
}

async function main() {
  const startTime = Date.now()
  
  // Fetch ALL vocabulary words
  console.log('📚 Fetching ALL vocabulary words...')
  
  let allVocabulary: any[] = []
  let from = 0
  const batchSize = 1000
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('vocabulary')
      .select(`
        id,
        word_en,
        topic_id,
        vocabulary_translations!inner (
          id,
          language_code,
          translated_word
        )
      `)
      .order('id')
      .range(from, from + batchSize - 1)
    
    if (fetchError) {
      console.error('❌ Failed to fetch vocabulary:', fetchError)
      process.exit(1)
    }
    
    if (!batch || batch.length === 0) break
    
    allVocabulary = allVocabulary.concat(batch)
    from += batchSize
    
    console.log(`   Loaded ${allVocabulary.length} words...`)
    
    if (batch.length < batchSize) break
  }
  
  console.log(`✅ Found ${allVocabulary.length} vocabulary words\n`)
  
  // Prepare words to process
  const wordsToProcess: Array<{ id: number; word: string; isEnglish: boolean }> = []
  
  for (const vocab of allVocabulary) {
    // Check if already exists (unless forcing)
    if (!forceArg) {
      const { data: existing } = await supabase
        .from('vocabulary_phonetics')
        .select('id')
        .eq('vocabulary_id', vocab.id)
        .eq('language_code', languageCode)
        .single()
      
      if (existing) continue
    }
    
    // Add English word if generating for English
    if (languageCode === 'en') {
      wordsToProcess.push({
        id: vocab.id,
        word: vocab.word_en,
        isEnglish: true
      })
    }
    
    // Add translations for target language
    const translations = Array.isArray(vocab.vocabulary_translations) 
      ? vocab.vocabulary_translations 
      : [vocab.vocabulary_translations]
    
    for (const translation of translations) {
      if (translation.language_code === languageCode) {
        wordsToProcess.push({
          id: vocab.id,
          word: translation.translated_word,
          isEnglish: false
        })
      }
    }
  }
  
  console.log(`📝 Words to process: ${wordsToProcess.length}`)
  console.log('')
  
  let processed = 0
  let generated = 0
  let errors = 0
  
  // Process in batches of 20 for Gemini (increased for speed)
  const GEMINI_BATCH_SIZE = 20
  
  for (let i = 0; i < wordsToProcess.length; i += GEMINI_BATCH_SIZE) {
    const batch = wordsToProcess.slice(i, i + GEMINI_BATCH_SIZE)
    const words = batch.map(w => w.word)
    
    try {
      const phonetics = await generatePhoneticBatch(words, languageCode)
      
      if (phonetics.length !== batch.length) {
        console.warn(`⚠️ Batch size mismatch: expected ${batch.length}, got ${phonetics.length}`)
      }
      
      // Save each phonetic
      for (let j = 0; j < Math.min(batch.length, phonetics.length); j++) {
        try {
          await savePhonetic(batch[j].id, languageCode, phonetics[j], forceArg)
          generated++
        } catch (error: any) {
          errors++
          console.error(`❌ Error saving ${batch[j].word}:`, error.message)
        }
      }
      
      processed += batch.length
      
      // Progress update every 100 words
      if (processed % 100 === 0 || processed === wordsToProcess.length) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const rate = processed / elapsed
        const remaining = wordsToProcess.length - processed
        const eta = Math.floor(remaining / rate)
        
        console.log(`⚡ Progress: ${processed}/${wordsToProcess.length} (${Math.floor(processed/wordsToProcess.length*100)}%) | Generated: ${generated} | Errors: ${errors} | ETA: ${Math.floor(eta/60)}m ${eta%60}s`)
      }
      
      // Reduced rate limiting - 500ms between batches for speed
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error: any) {
      console.error(`❌ Batch error:`, error.message)
      errors += batch.length
      processed += batch.length
    }
  }
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000)
  
  console.log('\n' + '='.repeat(80))
  console.log('🎉 COMPLETE!')
  console.log('='.repeat(80))
  console.log(`✅ Processed: ${processed} words`)
  console.log(`📝 Generated: ${generated} phonetics`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`⏱️  Time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`)
  console.log('='.repeat(80))
}

main().catch(console.error)
