require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function getVocabulary() {
  console.log('Fetching English vocabulary from database...\n')
  
  const { data, error } = await supabase
    .from('vocabulary')
    .select('id, word_en, topic_id')
    .order('id')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total words: ${data.length}\n`)
  console.log(JSON.stringify(data, null, 2))
  
  // Group by topic
  const byTopic = data.reduce((acc, item) => {
    if (!acc[item.topic_id]) acc[item.topic_id] = []
    acc[item.topic_id].push(item.word_en)
    return acc
  }, {})
  
  console.log('\n\nGrouped by Topic:')
  Object.entries(byTopic).forEach(([topicId, words]) => {
    console.log(`\nTopic ${topicId}: ${words.length} words`)
    console.log(words.join(', '))
  })
}

getVocabulary()
