/**
 * Quick script to verify example sentences are consistent across languages
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkConsistency() {
  // Check vocabulary_id 851 (frustrated)
  const { data, error } = await supabase
    .from('example_sentences')
    .select('language_code, sentence_order, sentence, translation')
    .eq('vocabulary_id', 851)
    .order('sentence_order', { ascending: true })
    .order('language_code', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n🔍 Checking consistency for "frustrated" (vocab_id: 851)\n')
  console.log(`Total records: ${data.length}`)
  console.log(`Expected: 50 languages × 3 sentences = 150 records\n`)

  // Group by sentence_order
  const bySentence: Record<number, any[]> = {}
  for (const row of data) {
    if (!bySentence[row.sentence_order]) {
      bySentence[row.sentence_order] = []
    }
    bySentence[row.sentence_order].push(row)
  }

  // Show first few languages for each sentence
  for (const [order, sentences] of Object.entries(bySentence)) {
    console.log(`\n📝 Sentence ${order} (${sentences.length} languages):`)
    console.log(`English translation: "${sentences[0]?.translation}"`)
    console.log('\nSample translations:')
    
    // Show first 5 languages
    sentences.slice(0, 5).forEach(s => {
      console.log(`  [${s.language_code}] ${s.sentence}`)
    })
    
    if (sentences.length > 5) {
      console.log(`  ... and ${sentences.length - 5} more languages`)
    }
  }

  // Check if all sentences have same number of languages
  const counts = Object.values(bySentence).map(s => s.length)
  const allSame = counts.every(c => c === counts[0])
  
  console.log('\n' + '═'.repeat(50))
  if (allSame && counts[0] === 50) {
    console.log('✅ SUCCESS! All 3 sentences exist in all 50 languages')
    console.log('✅ Sentences are CONSISTENT across languages!')
  } else {
    console.log('⚠️  WARNING: Inconsistent language coverage')
    console.log(`Sentence 1: ${counts[0]} languages`)
    console.log(`Sentence 2: ${counts[1]} languages`)
    console.log(`Sentence 3: ${counts[2]} languages`)
  }
  console.log('═'.repeat(50) + '\n')
}

checkConsistency()
