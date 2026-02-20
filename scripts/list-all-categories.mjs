/**
 * List all categories (context values) for each topic
 * This will show what category tags are used across all topics
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listAllCategories() {
  console.log('\n============================================================')
  console.log('📋 ALL TOPIC CATEGORIES')
  console.log('============================================================\n')

  // Get all topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name')
    .order('id')

  if (topicsError) {
    console.error('❌ Error fetching topics:', topicsError)
    return
  }

  const results = {}

  // For each topic, get unique context values
  for (const topic of topics) {
    console.log(`\n--- Topic ${topic.id}: ${topic.name} ---`)
    
    const { data: words, error: wordsError } = await supabase
      .from('vocabulary')
      .select('context')
      .eq('topic_id', topic.id)
      .not('context', 'is', null)
      .not('context', 'eq', '')

    if (wordsError) {
      console.error(`❌ Error fetching words for topic ${topic.id}:`, wordsError)
      continue
    }

    // Get unique categories
    const categories = [...new Set(words.map(w => w.context))].sort()
    
    results[topic.id] = {
      name: topic.name,
      categories: categories
    }

    console.log(`Total categories: ${categories.length}`)
    if (categories.length > 0) {
      categories.forEach((cat, idx) => {
        console.log(`  ${idx + 1}. "${cat}"`)
      })
    } else {
      console.log('  (No categories defined)')
    }
  }

  // Save to JSON file
  const timestamp = new Date().toISOString().slice(0, 10)
  const outputFile = `topic-categories-list-${timestamp}.json`
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
  
  console.log('\n============================================================')
  console.log(`✅ Results saved to: ${outputFile}`)
  console.log('============================================================\n')

  // Print summary
  console.log('\n📊 SUMMARY:\n')
  let totalTopicsWithCategories = 0
  let totalCategories = 0

  for (const [topicId, data] of Object.entries(results)) {
    if (data.categories.length > 0) {
      totalTopicsWithCategories++
      totalCategories += data.categories.length
      console.log(`Topic ${topicId} (${data.name}): ${data.categories.length} categories`)
    }
  }

  console.log(`\nTopics with categories: ${totalTopicsWithCategories}/${topics.length}`)
  console.log(`Total unique categories: ${totalCategories}`)
}

listAllCategories().catch(console.error)
