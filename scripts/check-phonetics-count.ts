/**
 * Quick script to check how many phonetics are in the database
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkPhoneticsCount() {
  console.log('📊 Checking phonetics in database...\n')
  
  // Total count
  const { count: totalCount } = await supabase
    .from('vocabulary_phonetics')
    .select('*', { count: 'exact', head: true })
  
  console.log(`✅ Total phonetics: ${totalCount}`)
  
  // Count by language
  const { data: byLanguage } = await supabase
    .from('vocabulary_phonetics')
    .select('language_code')
    .limit(10000)
  
  if (byLanguage) {
    const languageCounts: Record<string, number> = {}
    byLanguage.forEach(row => {
      languageCounts[row.language_code] = (languageCounts[row.language_code] || 0) + 1
    })
    
    console.log('\n📝 Phonetics by language:')
    Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count}`)
      })
  }
  
  // Sample some phonetics
  const { data: samples } = await supabase
    .from('vocabulary_phonetics')
    .select('vocabulary_id, language_code, phonetic_ipa')
    .limit(5)
  
  console.log('\n🔍 Sample phonetics:')
  samples?.forEach(s => {
    console.log(`   Vocab ID ${s.vocabulary_id} (${s.language_code}): ${s.phonetic_ipa}`)
  })
}

checkPhoneticsCount().catch(console.error)
