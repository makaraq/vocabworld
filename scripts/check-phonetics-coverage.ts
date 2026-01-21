/**
 * Check phonetics coverage across topics and languages
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCoverage() {
  console.log('📊 Checking phonetics coverage...\n')
  
  // Get total vocabulary words
  const { count: totalVocab } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📚 Total vocabulary words: ${totalVocab}`)
  
  // Get total phonetics
  const { count: totalPhonetics } = await supabase
    .from('vocabulary_phonetics')
    .select('*', { count: 'exact', head: true })
  
  console.log(`🔤 Total phonetics: ${totalPhonetics}`)
  
  // Check coverage by language
  const { data: phoneticsData } = await supabase
    .from('vocabulary_phonetics')
    .select('language_code, vocabulary_id')
  
  if (phoneticsData) {
    const byLanguage: Record<string, Set<number>> = {}
    
    phoneticsData.forEach(row => {
      if (!byLanguage[row.language_code]) {
        byLanguage[row.language_code] = new Set()
      }
      byLanguage[row.language_code].add(row.vocabulary_id)
    })
    
    console.log('\n📝 Coverage by language:')
    const sorted = Object.entries(byLanguage)
      .map(([lang, vocabIds]) => ({ lang, count: vocabIds.size }))
      .sort((a, b) => b.count - a.count)
    
    sorted.forEach(({ lang, count }) => {
      const percentage = ((count / (totalVocab || 1)) * 100).toFixed(1)
      console.log(`   ${lang}: ${count}/${totalVocab} (${percentage}%)`)
    })
  }
  
  // Check which vocabulary words are missing phonetics
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id, word_en, topic_id')
    .order('topic_id')
    .limit(10)
  
  console.log('\n🔍 Sample vocabulary words:')
  for (const word of vocab || []) {
    const { count } = await supabase
      .from('vocabulary_phonetics')
      .select('*', { count: 'exact', head: true })
      .eq('vocabulary_id', word.id)
    
    console.log(`   Topic ${word.topic_id} - "${word.word_en}" (ID: ${word.id}): ${count} phonetics`)
  }
}

checkCoverage().catch(console.error)
