/**
 * Check all 50 languages phonetics count
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAll() {
  const languages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
    'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
    'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
  ]
  
  console.log('📊 Phonetics count for all languages:\n')
  
  let completed = []
  let incomplete = []
  
  for (const lang of languages) {
    const { count } = await supabase
      .from('vocabulary_phonetics')
      .select('*', { count: 'exact', head: true })
      .eq('language_code', lang)
    
    const status = count === 3921 ? '✅' : count > 0 ? '🟡' : '❌'
    console.log(`${status} ${lang}: ${count}/3921`)
    
    if (count === 3921) completed.push(lang)
    else if (count > 0) incomplete.push(lang)
  }
  
  console.log(`\n✅ Completed (${completed.length}): ${completed.join(', ')}`)
  console.log(`🟡 In progress (${incomplete.length}): ${incomplete.join(', ')}`)
}

checkAll().catch(console.error)
