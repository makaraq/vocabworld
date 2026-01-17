import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllTranslations() {
  console.log('🔍 Checking ALL translations for 8 new languages...\n')
  
  const newLangs = ['gu', 'id', 'is', 'ml', 'mr', 'ta', 'te', 'ur']
  
  for (const lang of newLangs) {
    const { data, error } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, translated_word')
      .eq('language_code', lang)
    
    if (error) {
      console.error(`Error for ${lang}:`, error)
      continue
    }
    
    console.log(`${lang}: ${data.length} total translations`)
    
    // Check by topic
    const { data: vocab } = await supabase
      .from('vocabulary')
      .select('id, topic_id')
      .in('id', data.map(d => d.vocabulary_id))
    
    const byTopic = {}
    vocab.forEach(v => {
      byTopic[v.topic_id] = (byTopic[v.topic_id] || 0) + 1
    })
    
    console.log(`   Topics: ${Object.keys(byTopic).sort((a, b) => a - b).map(t => `${t}:${byTopic[t]}`).join(', ')}`)
    console.log()
  }
}

checkAllTranslations()
