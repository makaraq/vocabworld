import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Frontend display name mapping from language-selector.tsx (line 2944)
const getTopicDisplayName = (topicId, originalName) => {
  const nameMapping = {
    8: "Health",       // Health & Body Parts → Health
    11: "Weather",     // Weather & Nature → Weather
    12: "Family",      // Family & Relationships → Family
    17: "City",        // Places Around Town → City
    18: "Travel",      // Travel & Tourism → Travel
  }
  
  return nameMapping[topicId] || originalName
}

async function showFrontendDisplayNames() {
  console.log('📱 FRONTEND DISPLAY NAMES (What Users Actually See)\n')
  console.log('═'.repeat(70))

  // Get topics from API (as frontend does)
  const response = await fetch('http://localhost:3000/api/topics')
  const topics = await response.json()

  const sections = [
    { 
      name: 'FIRST AID KIT', 
      slice: 'topics.slice(0, 6)',
      range: [0, 6]
    },
    { 
      name: 'DAILY LIFE', 
      slice: 'topics.slice(6, 14)',
      range: [6, 14]
    },
    { 
      name: 'PERSONAL & SOCIAL LIFE', 
      slice: 'topics.slice(14, 20)',
      range: [14, 20]
    },
    { 
      name: 'WORK & SCHOOL', 
      slice: 'topics.slice(20, 28)',
      range: [20, 28]
    },
    { 
      name: 'CULTURE & SOCIETY', 
      slice: 'topics.slice(28, 36)',
      range: [28, 36]
    },
    { 
      name: 'PROFESSIONAL', 
      slice: 'topics.slice(36, 44)',
      range: [36, 44]
    }
  ]

  sections.forEach(section => {
    console.log(`\n${section.name}`)
    console.log('─'.repeat(70))
    
    const sectionTopics = topics.slice(section.range[0], section.range[1])
    sectionTopics.forEach((topic, index) => {
      const actualIndex = section.range[0] + index
      const displayName = getTopicDisplayName(topic.id, topic.name)
      const shortened = displayName !== topic.name ? ' ✂️' : ''
      console.log(`[${actualIndex}] ID ${topic.id.toString().padStart(2, ' ')}: ${displayName}${shortened}`)
    })
  })

  console.log('\n' + '═'.repeat(70))
  console.log('\n✂️ = Shortened from full name')
  console.log('\nTotal topics: ' + topics.length + '\n')
}

showFrontendDisplayNames().catch(console.error)
