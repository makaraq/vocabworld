import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyDatabase() {
  console.log('🔍 Verifying example_sentences table...\n')
  
  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('example_sentences')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('❌ Error counting:', countError)
    return
  }
  
  console.log(`📊 Total example_sentences records: ${totalCount}\n`)
  
  // Get unique vocabulary IDs
  const { data: allSentences, error } = await supabase
    .from('example_sentences')
    .select('vocabulary_id, language_code')
    .order('vocabulary_id', { ascending: true })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  const uniqueVocabIds = new Set(allSentences?.map(s => s.vocabulary_id) || [])
  console.log(`📚 Unique vocabulary IDs with sentences: ${uniqueVocabIds.size}\n`)
  
  // Get min and max IDs
  if (allSentences && allSentences.length > 0) {
    const vocabIds = Array.from(uniqueVocabIds).sort((a, b) => a - b)
    console.log(`📍 ID Range: ${vocabIds[0]} to ${vocabIds[vocabIds.length - 1]}\n`)
    
    // Show first 20 vocabulary IDs
    console.log('First 20 vocabulary IDs with sentences:')
    vocabIds.slice(0, 20).forEach((id, idx) => {
      const count = allSentences.filter(s => s.vocabulary_id === id).length
      console.log(`  ${idx + 1}. Vocabulary ID ${id}: ${count} sentences`)
    })
    
    // Check if we have 150 records per vocabulary (50 languages × 3 sentences)
    console.log('\n🔎 Checking completeness (should be 150 records per word):')
    const incomplete: number[] = []
    for (const vocabId of vocabIds) {
      const count = allSentences.filter(s => s.vocabulary_id === vocabId).length
      if (count !== 150) {
        incomplete.push(vocabId)
        if (incomplete.length <= 10) {
          console.log(`  ⚠️  Vocabulary ID ${vocabId}: ${count} records (expected 150)`)
        }
      }
    }
    
    if (incomplete.length > 10) {
      console.log(`  ... and ${incomplete.length - 10} more incomplete`)
    }
    
    if (incomplete.length === 0) {
      console.log('  ✅ All vocabulary IDs have complete data (150 records each)')
    }
  }
  
  // Get actual data for a sample word
  console.log('\n📝 Sample check - Vocabulary ID 267 (first missing according to previous check):')
  const { data: sampleData, error: sampleError } = await supabase
    .from('example_sentences')
    .select('*')
    .eq('vocabulary_id', 267)
    .limit(5)
  
  if (sampleError) {
    console.error('Error:', sampleError)
  } else {
    console.log(`Found ${sampleData?.length || 0} records for ID 267`)
    if (sampleData && sampleData.length > 0) {
      console.log('Sample records:', sampleData)
    }
  }
}

verifyDatabase().catch(console.error)
