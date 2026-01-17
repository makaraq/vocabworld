import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTranslations() {
  console.log('🔍 Checking Common Phrases (topic 42) translations...\n')
  
  // Get all vocabulary items for topic 42
  const { data: vocab, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', 42)
    .order('id')
  
  if (vocabError) {
    console.error('Error fetching vocabulary:', vocabError)
    return
  }
  
  console.log(`📚 Total phrases in topic 42: ${vocab.length}`)
  
  // Get all translations for these vocabulary items
  const { data: translations, error: transError } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, language_code')
    .in('vocabulary_id', vocab.map(v => v.id))
  
  if (transError) {
    console.error('Error fetching translations:', transError)
    return
  }
  
  // Count translations per language
  const langCounts = {}
  translations.forEach(t => {
    langCounts[t.language_code] = (langCounts[t.language_code] || 0) + 1
  })
  
  // Check the 8 new languages
  const newLangs = ['gu', 'id', 'is', 'ml', 'mr', 'ta', 'te', 'ur']
  console.log('\n✨ 8 New Languages Status:')
  newLangs.forEach(lang => {
    const count = langCounts[lang] || 0
    const status = count === vocab.length ? '✅ COMPLETE' : `❌ ${count}/${vocab.length}`
    console.log(`   ${lang}: ${status}`)
  })
  
  console.log(`\n🌍 Total languages: ${Object.keys(langCounts).length}`)
  console.log('📝 All languages:', Object.keys(langCounts).sort().join(', '))
}

checkTranslations()
