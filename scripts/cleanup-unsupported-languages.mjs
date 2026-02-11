/**
 * Remove unsupported languages from database
 * Removes: co (Corsican), ka (Georgian), lb (Luxembourgish), sq (Albanian), sr (Serbian)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Languages to remove (not in audio-supported list)
const LANGUAGES_TO_REMOVE = ['co', 'ka', 'lb', 'sq', 'sr']

async function cleanup() {
  console.log('Removing unsupported languages from database...\n')
  console.log('Languages to remove:', LANGUAGES_TO_REMOVE.join(', '))
  
  // 1. Delete from vocabulary_translations
  console.log('\n1️⃣  Deleting from vocabulary_translations...')
  const { data: deletedTranslations, error: transError } = await supabase
    .from('vocabulary_translations')
    .delete()
    .in('language_code', LANGUAGES_TO_REMOVE)
    .select('language_code')
  
  if (transError) {
    console.error('❌ Error:', transError)
  } else {
    const counts = {}
    deletedTranslations?.forEach(t => {
      counts[t.language_code] = (counts[t.language_code] || 0) + 1
    })
    console.log('✅ Deleted vocabulary_translations:')
    Object.entries(counts).forEach(([lang, count]) => {
      console.log(`   ${lang}: ${count} translations`)
    })
  }
  
  // 2. Delete from example_sentences
  console.log('\n2️⃣  Deleting from example_sentences...')
  const { data: deletedExamples, error: exampleError } = await supabase
    .from('example_sentences')
    .delete()
    .in('language_code', LANGUAGES_TO_REMOVE)
    .select('language_code')
  
  if (exampleError) {
    console.error('❌ Error:', exampleError)
  } else {
    if (deletedExamples && deletedExamples.length > 0) {
      const counts = {}
      deletedExamples.forEach(e => {
        counts[e.language_code] = (counts[e.language_code] || 0) + 1
      })
      console.log('✅ Deleted example_sentences:')
      Object.entries(counts).forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count} examples`)
      })
    } else {
      console.log('✅ No example sentences found for these languages')
    }
  }
  
  // 3. Check remaining languages
  console.log('\n3️⃣  Verifying remaining languages...')
  const { data: remainingLangs } = await supabase
    .from('vocabulary_translations')
    .select('language_code')
    .limit(10000)
  
  const uniqueLangs = [...new Set(remainingLangs.map(t => t.language_code))].sort()
  console.log(`\n✅ Database now has ${uniqueLangs.length} languages:`)
  console.log(uniqueLangs.join(', '))
  
  console.log('\n🎉 Cleanup complete!')
}

cleanup()
