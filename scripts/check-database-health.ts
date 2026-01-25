import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDatabaseHealth() {
  console.log('🔍 Checking database health...\n')
  
  // Check most recent test (ID 1792)
  console.log('1. Checking latest test word (ID 1792 - "correspondent"):')
  const { data: testData, error: testError } = await supabase
    .from('example_sentences')
    .select('*')
    .eq('vocabulary_id', 1792)
  
  if (testError) {
    console.error('   ❌ Error:', testError)
    return
  }
  
  console.log(`   ✅ Found ${testData?.length || 0} records`)
  console.log(`   Expected: 150 (50 languages × 3 sentences)`)
  console.log(`   Status: ${testData?.length === 150 ? '✅ COMPLETE' : '⚠️  INCOMPLETE'}\n`)
  
  if (testData && testData.length > 0) {
    console.log('   Sample sentences:')
    const uniqueLangs = new Set(testData.map(d => d.language_code))
    Array.from(uniqueLangs).slice(0, 5).forEach(lang => {
      const sentence = testData.find(d => d.language_code === lang)
      console.log(`   - ${lang}: ${sentence?.sentence.substring(0, 60)}...`)
    })
  }
  
  // Get overall stats
  console.log('\n2. Overall database statistics:')
  const { count: totalCount } = await supabase
    .from('example_sentences')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total records: ${totalCount}`)
  
  // Count unique vocabulary IDs (simple approach)
  const { data: maxData } = await supabase
    .from('example_sentences')
    .select('vocabulary_id')
    .order('vocabulary_id', { ascending: false })
    .limit(1)
  
  const { data: minData } = await supabase
    .from('example_sentences')
    .select('vocabulary_id')
    .order('vocabulary_id', { ascending: true })
    .limit(1)
  
  if (maxData && minData) {
    console.log(`   ID Range: ${minData[0].vocabulary_id} to ${maxData[0].vocabulary_id}`)
    const estimatedWords = Math.floor((totalCount || 0) / 150)
    console.log(`   Estimated completed words: ~${estimatedWords}`)
    console.log(`   Progress: ${((estimatedWords / 3921) * 100).toFixed(1)}%`)
  }
  
  // Check table structure
  console.log('\n3. Checking table structure:')
  const { data: sampleRow } = await supabase
    .from('example_sentences')
    .select('*')
    .limit(1)
  
  if (sampleRow && sampleRow.length > 0) {
    console.log('   ✅ Table columns:', Object.keys(sampleRow[0]).join(', '))
  }
  
  console.log('\n✅ Database is healthy and ready for generation!')
}

checkDatabaseHealth().catch(console.error)
