import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function diagnose() {
  console.log('🔍 Diagnosing Topic 42 Translations\n')
  
  // Get topic 42 vocabulary
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id, word_en')
    .eq('topic_id', 42)
    .order('id')
    .limit(5)
  
  console.log(`First 5 phrases from topic 42:`)
  vocab.forEach((v, i) => {
    console.log(`  ${i+1}. ID ${v.id}: "${v.word_en}"`)
  })
  
  console.log('\nChecking translations for first phrase...\n')
  
  const { data: trans } = await supabase
    .from('vocabulary_translations')
    .select('language_code, translated_word')
    .eq('vocabulary_id', vocab[0].id)
    .order('language_code')
  
  console.log(`Translations for "${vocab[0].id}":`)
  trans.forEach(t => {
    console.log(`  ${t.language_code}: ${t.translated_word}`)
  })
  
  console.log(`\nTotal: ${trans.length} languages`)
  
  const newLangs = ['gu', 'id', 'is', 'ml', 'mr', 'ta', 'te', 'ur']
  const found = newLangs.filter(l => trans.find(t => t.language_code === l))
  const missing = newLangs.filter(l => !trans.find(t => t.language_code === l))
  
  console.log(`\nNew languages status:`)
  console.log(`  ✅ Present: ${found.join(', ') || 'none'}`)
  console.log(`  ❌ Missing: ${missing.join(', ') || 'none'}`)
}

diagnose()
