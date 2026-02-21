import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listTopics() {
  console.log('📋 Fetching topics from database...\n')

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name')
    .order('id', { ascending: true })

  if (error) {
    console.error('❌ Error fetching topics:', error)
    return
  }

  console.log(`✅ Found ${topics.length} topics:\n`)
  
  // Group by sections
  const sections = [
    { name: 'FIRST AID KIT', range: [1, 6] },
    { name: 'DAILY LIFE', range: [7, 14] },
    { name: 'PERSONAL & SOCIAL LIFE', range: [15, 20] },
    { name: 'WORK & SCHOOL', range: [21, 28] },
    { name: 'CULTURE & SOCIETY', range: [29, 36] },
    { name: 'PROFESSIONAL', range: [37, 44] }
  ]

  sections.forEach(section => {
    console.log(`\n${section.name}:`)
    console.log('─'.repeat(50))
    topics
      .filter(t => t.id >= section.range[0] && t.id <= section.range[1])
      .forEach(topic => {
        console.log(`${topic.id.toString().padStart(2, ' ')}. ${topic.name}`)
      })
  })

  console.log('\n')
}

listTopics()
