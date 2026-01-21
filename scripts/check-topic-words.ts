/**
 * Check how many vocabulary words exist per topic
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTopicWords() {
  console.log('📊 Checking vocabulary words per topic...\n')
  
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name_en')
    .order('id')
  
  let totalWords = 0
  
  for (const topic of topics || []) {
    const { count } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topic.id)
    
    console.log(`Topic ${topic.id} (${topic.name_en}): ${count} words`)
    totalWords += count || 0
  }
  
  console.log(`\n📚 Total vocabulary words: ${totalWords}`)
  
  // Check if there's a translations issue
  console.log('\n🔍 Checking translations for Topic 1...')
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select(`
      id,
      word_en,
      vocabulary_translations (
        language_code
      )
    `)
    .eq('topic_id', 1)
    .limit(5)
  
  vocab?.forEach(v => {
    console.log(`   "${v.word_en}": ${v.vocabulary_translations?.length || 0} translations`)
  })
}

checkTopicWords().catch(console.error)
