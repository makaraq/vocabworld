import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const wordsToRemove = ['hell', 'bloody', 'moron', 'pissed', 'bugger']

console.log('🗑️  REMOVING WORDS FROM BAD WORDS TOPIC:\n')

// Get vocabulary IDs
const { data: vocab } = await supabase
  .from('vocabulary')
  .select('id, word_en')
  .eq('topic_id', 44)
  .in('word_en', wordsToRemove)

console.log('Words to remove:')
vocab.forEach(v => console.log(`  - ${v.word_en} (ID: ${v.id})`))

const vocabIds = vocab.map(v => v.id)

// Step 1: Delete example sentences
console.log('\nStep 1: Deleting example sentences...')
const { error: exError } = await supabase
  .from('example_sentences')
  .delete()
  .in('vocabulary_id', vocabIds)

if (exError) {
  console.log('  ❌ Error:', exError.message)
} else {
  console.log('  ✅ Example sentences deleted')
}

// Step 2: Delete translations
console.log('\nStep 2: Deleting translations...')
const { error: transError } = await supabase
  .from('vocabulary_translations')
  .delete()
  .in('vocabulary_id', vocabIds)

if (transError) {
  console.log('  ❌ Error:', transError.message)
} else {
  console.log('  ✅ Translations deleted')
}

// Step 3: Delete vocabulary
console.log('\nStep 3: Deleting vocabulary words...')
const { error: vocabError } = await supabase
  .from('vocabulary')
  .delete()
  .in('id', vocabIds)

if (vocabError) {
  console.log('  ❌ Error:', vocabError.message)
} else {
  console.log('  ✅ Vocabulary deleted')
}

// Verify
const { count: remaining } = await supabase
  .from('vocabulary')
  .select('*', { count: 'exact', head: true })
  .eq('topic_id', 44)

console.log('\n✅ DELETION COMPLETE!')
console.log(`\nBad Words topic now has ${remaining} words (removed ${vocab.length})`)
