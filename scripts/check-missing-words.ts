import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MissingWord {
  id: number
  word_en: string
}

async function checkMissingWords() {
  console.log('🔍 Checking for words missing example sentences...\n')
  
  // Get all vocabulary IDs
  console.log('📚 Fetching all vocabulary...')
  const allWords: MissingWord[] = []
  let page = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('id, word_en')
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)
    
    if (error) {
      console.error('❌ Error fetching vocabulary:', error)
      throw error
    }
    
    if (!data || data.length === 0) break
    
    allWords.push(...data)
    
    if (data.length < pageSize) break
    page++
  }
  
  console.log(`✅ Total vocabulary words: ${allWords.length}\n`)
  
  // Get vocabulary IDs that have example sentences
  console.log('📝 Checking which words have example sentences...')
  const { data: wordsWithSentences, error: sentencesError } = await supabase
    .from('example_sentences')
    .select('vocabulary_id')
    .order('vocabulary_id', { ascending: true })
  
  if (sentencesError) {
    console.error('❌ Error fetching example sentences:', sentencesError)
    throw sentencesError
  }
  
  // Get unique vocabulary IDs that have sentences
  const processedIds = new Set(wordsWithSentences?.map(s => s.vocabulary_id) || [])
  console.log(`✅ Words with example sentences: ${processedIds.size}\n`)
  
  // Find missing words
  const missingWords = allWords.filter(word => !processedIds.has(word.id))
  
  console.log('═══════════════════════════════════════════')
  console.log('📊 ANALYSIS RESULTS')
  console.log('═══════════════════════════════════════════')
  console.log(`Total vocabulary: ${allWords.length}`)
  console.log(`Completed: ${processedIds.size}`)
  console.log(`Missing: ${missingWords.length}`)
  console.log(`Progress: ${((processedIds.size / allWords.length) * 100).toFixed(2)}%`)
  console.log('═══════════════════════════════════════════\n')
  
  if (missingWords.length > 0) {
    console.log(`⚠️  Missing ${missingWords.length} words:\n`)
    
    // Show first 50 missing words
    const displayCount = Math.min(50, missingWords.length)
    console.log(`First ${displayCount} missing words:`)
    for (let i = 0; i < displayCount; i++) {
      const word = missingWords[i]
      console.log(`  ${i + 1}. ID ${word.id}: "${word.word_en}"`)
    }
    
    if (missingWords.length > 50) {
      console.log(`  ... and ${missingWords.length - 50} more\n`)
    }
    
    // Find gaps (consecutive missing ranges)
    console.log('\n📍 Gap analysis (ranges of missing words):')
    const gaps: { start: number, end: number, count: number }[] = []
    let rangeStart = missingWords[0].id
    let rangeEnd = missingWords[0].id
    
    for (let i = 1; i < missingWords.length; i++) {
      if (missingWords[i].id === rangeEnd + 1) {
        rangeEnd = missingWords[i].id
      } else {
        gaps.push({ start: rangeStart, end: rangeEnd, count: rangeEnd - rangeStart + 1 })
        rangeStart = missingWords[i].id
        rangeEnd = missingWords[i].id
      }
    }
    gaps.push({ start: rangeStart, end: rangeEnd, count: rangeEnd - rangeStart + 1 })
    
    for (const gap of gaps) {
      if (gap.count === 1) {
        console.log(`  ID ${gap.start} (1 word)`)
      } else {
        console.log(`  IDs ${gap.start}-${gap.end} (${gap.count} words)`)
      }
    }
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const outputFile = path.join(process.cwd(), `missing-words-${timestamp}.json`)
    
    fs.writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_vocabulary: allWords.length,
      completed: processedIds.size,
      missing_count: missingWords.length,
      missing_words: missingWords,
      gaps: gaps
    }, null, 2))
    
    console.log(`\n📁 Full list saved to: ${outputFile}`)
    console.log('\n💡 To resume generation from first missing word, run:')
    console.log(`npx tsx scripts/generate-examples-consistent.ts --start-from ${missingWords[0].id}`)
  } else {
    console.log('✅ All words have example sentences!')
  }
}

checkMissingWords().catch(console.error)
