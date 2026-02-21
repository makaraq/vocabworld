import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function showLanguageSelectorTopics() {
  console.log('📋 Language Selector Topic Assignment\n')
  console.log('═'.repeat(60))

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name')
    .order('id', { ascending: true })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  const sections = [
    { 
      name: 'FIRST AID KIT', 
      slice: 'topics.slice(0, 6)',
      comment: '6 topics',
      range: [0, 6]
    },
    { 
      name: 'DAILY LIFE', 
      slice: 'topics.slice(6, 14)',
      comment: '8 topics',
      range: [6, 14]
    },
    { 
      name: 'PERSONAL & SOCIAL LIFE', 
      slice: 'topics.slice(14, 20)',
      comment: '6 topics',
      range: [14, 20]
    },
    { 
      name: 'WORK & SCHOOL', 
      slice: 'topics.slice(20, 28)',
      comment: '8 topics',
      range: [20, 28]
    },
    { 
      name: 'CULTURE & SOCIETY', 
      slice: 'topics.slice(28, 36)',
      comment: '8 topics',
      range: [28, 36]
    },
    { 
      name: 'PROFESSIONAL', 
      slice: 'topics.slice(36, 44)',
      comment: '8 topics',
      range: [36, 44]
    }
  ]

  sections.forEach(section => {
    console.log(`\n${section.name}`)
    console.log(`Code: ${section.slice} // ${section.comment}`)
    console.log('─'.repeat(60))
    
    const sectionTopics = topics.slice(section.range[0], section.range[1])
    sectionTopics.forEach((topic, index) => {
      const arrayIndex = section.range[0] + index
      console.log(`  [${arrayIndex}] → ID ${topic.id.toString().padStart(2, ' ')}: ${topic.name}`)
    })
  })

  console.log('\n' + '═'.repeat(60))
  console.log(`\nTotal topics in database: ${topics.length}`)
  console.log('Note: Array indices are 0-based, but topic IDs start from 1\n')
}

showLanguageSelectorTopics()
