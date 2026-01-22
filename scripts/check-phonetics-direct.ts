/**
 * Simple direct count of phonetics by language
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCounts() {
  console.log('📊 Direct phonetics count by language:\n')
  
  const languages = ['en', 'es', 'fr', 'de', 'it', 'pt']
  
  for (const lang of languages) {
    const { count } = await supabase
      .from('vocabulary_phonetics')
      .select('*', { count: 'exact', head: true })
      .eq('language_code', lang)
    
    console.log(`${lang}: ${count}`)
  }
  
  console.log('\n📚 Total vocabulary words: 3921')
  console.log('✅ Each language should have 3921 phonetics when complete')
}

checkCounts().catch(console.error)
