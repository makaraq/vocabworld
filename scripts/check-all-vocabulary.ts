import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAllVocabulary() {
  console.log('🔍 Checking all vocabulary IDs (1-3921)...\n')
  
  // Get all vocabulary IDs from vocabulary table
  console.log('📚 Fetching all vocabulary IDs...')
  const allVocabIds = new Set<number>()
  let page = 0
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('id')
      .order('id', { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1)
    
    if (error) {
      console.error('Error:', error)
      break
    }
    
    if (!data || data.length === 0) break
    
    data.forEach(v => allVocabIds.add(v.id))
    if (data.length < 1000) break
    page++
  }
  
  console.log(`✅ Total vocabulary words in database: ${allVocabIds.size}\n`)
  
  // Get all vocabulary IDs that have example sentences
  console.log('📝 Checking example sentences (this may take a minute)...')
  const vocabWithSentences = new Map<number, number>() // vocab_id -> count
  page = 0
  let totalProcessed = 0
  
  while (true) {
    const { data, error } = await supabase
      .from('example_sentences')
      .select('vocabulary_id')
      .range(page * 10000, (page + 1) * 10000 - 1)
    
    if (error) {
      console.error('Error:', error)
      break
    }
    
    if (!data || data.length === 0) break
    
    data.forEach(s => {
      const count = vocabWithSentences.get(s.vocabulary_id) || 0
      vocabWithSentences.set(s.vocabulary_id, count + 1)
    })
    
    totalProcessed += data.length
    process.stdout.write(`\r  Processed ${totalProcessed} records... ${vocabWithSentences.size} unique words found`)
    
    if (data.length < 10000) break
    page++
  }
  
  console.log(`\n✅ Words with example sentences: ${vocabWithSentences.size}\n`)
  
  // Analyze the data
  const complete = [] // 150 records
  const incomplete = [] // < 150 records
  const missing = [] // 0 records
  
  const sortedIds = Array.from(allVocabIds).sort((a, b) => a - b)
  
  for (const id of sortedIds) {
    const count = vocabWithSentences.get(id) || 0
    
    if (count === 0) {
      missing.push(id)
    } else if (count === 150) {
      complete.push(id)
    } else {
      incomplete.push({ id, count })
    }
  }
  
  // Print summary
  console.log('═══════════════════════════════════════════')
  console.log('📊 COMPLETE ANALYSIS (IDs 1-3921)')
  console.log('═══════════════════════════════════════════')
  console.log(`Total vocabulary: ${allVocabIds.size}`)
  console.log(`✅ Complete (150 records): ${complete.length}`)
  console.log(`⚠️  Incomplete (<150 records): ${incomplete.length}`)
  console.log(`❌ Missing (0 records): ${missing.length}`)
  console.log(`📈 Progress: ${((complete.length / allVocabIds.size) * 100).toFixed(2)}%`)
  console.log('═══════════════════════════════════════════\n')
  
  // Show incomplete words
  if (incomplete.length > 0) {
    console.log(`⚠️  ${incomplete.length} incomplete words (should have 150 records each):`)
    incomplete.slice(0, 20).forEach(w => {
      console.log(`   ID ${w.id}: ${w.count} records`)
    })
    if (incomplete.length > 20) {
      console.log(`   ... and ${incomplete.length - 20} more`)
    }
    console.log('')
  }
  
  // Show missing ranges
  if (missing.length > 0) {
    console.log(`❌ ${missing.length} missing words:`)
    
    // Group into ranges
    const ranges: { start: number, end: number }[] = []
    let rangeStart = missing[0]
    let prev = missing[0]
    
    for (let i = 1; i < missing.length; i++) {
      if (missing[i] !== prev + 1) {
        ranges.push({ start: rangeStart, end: prev })
        rangeStart = missing[i]
      }
      prev = missing[i]
    }
    ranges.push({ start: rangeStart, end: prev })
    
    console.log('\n📍 Missing ranges:')
    ranges.slice(0, 20).forEach(r => {
      if (r.start === r.end) {
        console.log(`   ID ${r.start}`)
      } else {
        console.log(`   IDs ${r.start}-${r.end} (${r.end - r.start + 1} words)`)
      }
    })
    
    if (ranges.length > 20) {
      console.log(`   ... and ${ranges.length - 20} more ranges`)
    }
    
    console.log(`\n💡 To resume generation, run:`)
    console.log(`npx tsx scripts/generate-examples-consistent.ts --start-from ${missing[0]}`)
  } else {
    console.log('🎉 All vocabulary words have example sentences!')
  }
  
  // Show complete ranges
  if (complete.length > 0) {
    console.log(`\n✅ Complete coverage:`)
    const completeRanges: { start: number, end: number }[] = []
    let rangeStart = complete[0]
    let prev = complete[0]
    
    for (let i = 1; i < complete.length; i++) {
      if (complete[i] !== prev + 1) {
        completeRanges.push({ start: rangeStart, end: prev })
        rangeStart = complete[i]
      }
      prev = complete[i]
    }
    completeRanges.push({ start: rangeStart, end: prev })
    
    console.log(`   Total ranges: ${completeRanges.length}`)
    completeRanges.slice(0, 5).forEach(r => {
      if (r.start === r.end) {
        console.log(`   ID ${r.start}`)
      } else {
        console.log(`   IDs ${r.start}-${r.end} (${r.end - r.start + 1} words)`)
      }
    })
    
    if (completeRanges.length > 5) {
      console.log(`   ... and ${completeRanges.length - 5} more ranges`)
    }
  }
}

checkAllVocabulary().catch(console.error)
