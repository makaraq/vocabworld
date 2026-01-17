import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testQuery() {
  // Get vocab IDs
  const { data: vocab } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', 42)
  
  console.log(`Total vocab items: ${vocab.length}`)
  
  // Test query with pagination - Supabase has default limits!
  const { data: trans1, count } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, language_code', { count: 'exact' })
    .in('vocabulary_id', vocab.map(v => v.id))
  
  console.log(`Query returned: ${trans1.length} rows`)
  console.log(`Total count: ${count}`)
  
  // Get with explicit limit
  const { data: trans2 } = await supabase
    .from('vocabulary_translations')
    .select('vocabulary_id, language_code')
    .in('vocabulary_id', vocab.map(v => v.id))
    .limit(50000) // Explicit high limit
  
  console.log(`With limit 50000: ${trans2.length} rows`)
  
  // Count by language
  const langCounts = {}
  trans2.forEach(t => {
    langCounts[t.language_code] = (langCounts[t.language_code] || 0) + 1
  })
  
  console.log(`\n8 New Languages:`)
  const newLangs = ['gu', 'id', 'is', 'ml', 'mr', 'ta', 'te', 'ur']
  newLangs.forEach(lang => {
    console.log(`  ${lang}: ${langCounts[lang] || 0}`)
  })
}

testQuery()
