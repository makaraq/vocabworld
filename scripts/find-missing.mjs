import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function findMissing() {
  console.log('Finding missing translations for topic 42...\n')
  
  // Get all topic 42 vocabulary IDs
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', 42)
    .order('id')
  
  const vocabIds = vocab.map(v => v.id)
  console.log(`Topic 42 has ${vocab.length} phrases`)
  console.log(`Vocabulary IDs range: ${vocabIds[0]} to ${vocabIds[vocabIds.length-1]}\n`)
  
  const langCode = 'gu' // Test with Gujarati
  
  // Get existing translations for this language in topic 42
  const { data: existing } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id')
    .eq('language_code', langCode)
    .in('vocabulary_id', vocabIds)
  
  console.log(`Found ${existing.length} existing ${langCode} translations for topic 42`)
  
  const existingIds = new Set(existing.map(e => e.vocabulary_id))
  const missingIds = vocabIds.filter(id => !existingIds.has(id))
  
  console.log(`Missing: ${missingIds.length} translations`)
  
  if (missingIds.length > 0 && missingIds.length <= 20) {
    console.log('\nFirst few missing vocabulary IDs:')
    missingIds.slice(0, 20).forEach(id => console.log(`  - ${id}`))
  }
  
  // Double-check by getting a sample
  if (missingIds.length > 0) {
    const { data: sampleVocab } = await supabase
      .from('vocabulary')
      .select('id, word_en')
      .eq('id', missingIds[0])
      .single()
    
    console.log(`\nSample missing phrase: ID ${sampleVocab.id} - "${sampleVocab.word_en}"`)
  }
}

findMissing()
