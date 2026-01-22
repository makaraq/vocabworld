/**
 * Generate phonetics for ALL words in a specific language
 * Simple, reliable script that processes every single word
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const execAsync = promisify(exec)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get language from command line
const args = process.argv.slice(2)
const languageArg = args.find(arg => arg.startsWith('--language='))
const forceArg = args.includes('--force')

if (!languageArg) {
  console.error('❌ Please specify a language: --language=en')
  process.exit(1)
}

const languageCode = languageArg.split('=')[1]

console.log('🎤 Complete Phonetics Generator')
console.log('='.repeat(80))
console.log(`📝 Language: ${languageCode}`)
console.log(`🔄 Force regenerate: ${forceArg}`)
console.log('='.repeat(80))
console.log('')

async function generatePhonetic(text: string, lang: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`espeak-ng -q --ipa -v ${lang} "${text.replace(/"/g, '\\"')}"`)
    return stdout.trim()
  } catch (error) {
    throw error
  }
}

async function savePhonetic(vocabularyId: number, languageCode: string, phoneticIpa: string, force: boolean) {
  const data = {
    vocabulary_id: vocabularyId,
    language_code: languageCode,
    phonetic_ipa: phoneticIpa,
    phonetic_system: 'IPA',
    source: 'espeak-ng',
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
  
  // Step 1: Get ALL vocabulary words (no limit)
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
  
  const vocabulary = allVocabulary
  
  console.log(`✅ Found ${vocabulary.length} vocabulary words\n`)
  
  // Get all existing phonetics for this language in ONE query (FAST!)
  console.log('🔍 Checking existing phonetics...')
  const allVocabIds = vocabulary.map(v => v.id)
  const { data: existingPhonetics } = await supabase
    .from('vocabulary_phonetics')
    .select('vocabulary_id')
    .eq('language_code', languageCode)
    .in('vocabulary_id', allVocabIds)
  
  const existingIds = new Set((existingPhonetics || []).map(p => p.vocabulary_id))
  console.log(`✅ Found ${existingIds.size} existing phonetics\n`)
  
  let processed = 0
  let generated = 0
  let skipped = 0
  let errors = 0
  
  // Step 2: Process EVERY word
  for (const vocab of vocabulary) {
    processed++
    
    try {
      // Skip if already exists (unless forcing) - instant lookup from Set
      if (!forceArg && existingIds.has(vocab.id)) {
        skipped++
        if (processed % 100 === 0) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000)
          const rate = processed / elapsed
          const remaining = vocabulary.length - processed
          const eta = Math.floor(remaining / rate)
          
          console.log(`⚡ Progress: ${processed}/${vocabulary.length} (${Math.floor(processed/vocabulary.length*100)}%) | Generated: ${generated} | Skipped: ${skipped} | ETA: ${Math.floor(eta/60)}m`)
        }
        continue
      }
      
      // Generate for English word
      if (languageCode === 'en') {
        const phonetic = await generatePhonetic(vocab.word_en, 'en')
        await savePhonetic(vocab.id, 'en', phonetic, forceArg)
        generated++
      }
      
      // Generate for translations
      const translations = Array.isArray(vocab.vocabulary_translations) 
        ? vocab.vocabulary_translations 
        : [vocab.vocabulary_translations]
      
      for (const translation of translations) {
        if (translation.language_code === languageCode) {
          const phonetic = await generatePhonetic(translation.translated_word, languageCode)
          await savePhonetic(vocab.id, languageCode, phonetic, forceArg)
          generated++
        }
      }
      
      // Progress update every 100 words
      if (processed % 100 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const rate = processed / elapsed
        const remaining = vocabulary.length - processed
        const eta = Math.floor(remaining / rate)
        
        console.log(`⚡ Progress: ${processed}/${vocabulary.length} (${Math.floor(processed/vocabulary.length*100)}%) | Generated: ${generated} | ETA: ${Math.floor(eta/60)}m`)
      }
      
    } catch (error: any) {
      errors++
      if (error.code !== '23505') { // Ignore duplicate errors when not forcing
        console.error(`❌ Error on word ${vocab.word_en}:`, error.message)
      } else {
        skipped++
      }
    }
  }
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000)
  
  console.log('\n' + '='.repeat(80))
  console.log('🎉 COMPLETE!')
  console.log('='.repeat(80))
  console.log(`✅ Processed: ${processed} words`)
  console.log(`📝 Generated: ${generated} phonetics`)
  console.log(`⏭️  Skipped: ${skipped} (already existed)`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`⏱️  Time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`)
  console.log('='.repeat(80))
}

main().catch(console.error)
