/**
 * Check what languages actually exist in the database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkLanguages() {
  console.log('Checking languages in vocabulary_translations table...\n')
  
  const { data: translations } = await supabase
    .from('vocabulary_translations')
    .select('language_code')
    .limit(10000)
  
  const uniqueLangs = [...new Set(translations.map(t => t.language_code))].sort()
  
  console.log(`Found ${uniqueLangs.length} unique languages:`)
  console.log(uniqueLangs.join(', '))
  
  console.log('\n\nChecking example_sentences table...\n')
  
  const { data: examples } = await supabase
    .from('example_sentences')
    .select('language_code')
    .limit(10000)
  
  if (examples && examples.length > 0) {
    const exampleLangs = [...new Set(examples.map(e => e.language_code))].sort()
    console.log(`Found ${exampleLangs.length} languages with example sentences:`)
    console.log(exampleLangs.join(', '))
  } else {
    console.log('No example sentences found yet')
  }
}

checkLanguages()
