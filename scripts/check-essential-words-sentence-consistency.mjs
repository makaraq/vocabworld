/**
 * Check if example sentences are consistent translations across languages
 * Verifies that "skipped" sentences are actual translations, not different content
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOPIC_ID = 43

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkConsistency() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║   CHECK EXAMPLE SENTENCES CONSISTENCY                 ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Fetch all vocabulary for this topic
  const { data: words } = await supabase
    .from('vocabulary')
    .select('id, word_en, learning_order')
    .eq('topic_id', TOPIC_ID)
    .order('learning_order')

  console.log(`📊 Found ${words.length} words in Essential Words topic\n`)

  // Fetch all example sentences
  const vocabIds = words.map(w => w.id)
  const { data: allExamples } = await supabase
    .from('example_sentences')
    .select('vocabulary_id, language_code, sentence_text, order_index')
    .in('vocabulary_id', vocabIds)
    .order('vocabulary_id')
    .order('order_index')

  console.log(`📝 Total example sentences in database: ${allExamples?.length || 0}\n`)

  // Group by vocabulary_id and order_index
  const groupedByWord = {}
  allExamples?.forEach(ex => {
    const key = `${ex.vocabulary_id}_${ex.order_index}`
    if (!groupedByWord[key]) {
      groupedByWord[key] = {}
    }
    groupedByWord[key][ex.language_code] = ex.sentence_text
  })

  // Check consistency
  let totalSentenceSets = 0
  let consistentSets = 0
  let inconsistentSets = 0
  const issues = []

  for (const [key, languages] of Object.entries(groupedByWord)) {
    const [vocabId, orderIndex] = key.split('_')
    const word = words.find(w => w.id === parseInt(vocabId))
    
    totalSentenceSets++
    
    const enSentence = languages['en']
    const languageCount = Object.keys(languages).length
    
    // Check if English sentence exists
    if (!enSentence) {
      inconsistentSets++
      issues.push({
        word: word?.word_en,
        orderIndex,
        issue: 'Missing English sentence',
        languageCount
      })
      continue
    }

    // Check if we have multiple languages for same English sentence
    if (languageCount === 1) {
      inconsistentSets++
      issues.push({
        word: word?.word_en,
        orderIndex,
        issue: 'Only English, no translations',
        enSentence,
        languageCount
      })
      continue
    }

    // Check for duplicate sentences (indicating inconsistency)
    const uniqueSentences = new Set(Object.values(languages))
    if (uniqueSentences.size === 1) {
      inconsistentSets++
      issues.push({
        word: word?.word_en,
        orderIndex,
        issue: 'All languages have same text (not translated)',
        enSentence,
        languageCount
      })
      continue
    }

    consistentSets++
  }

  console.log('📊 CONSISTENCY ANALYSIS:')
  console.log(`   Total sentence sets: ${totalSentenceSets}`)
  console.log(`   ✅ Consistent sets: ${consistentSets}`)
  console.log(`   ❌ Inconsistent sets: ${inconsistentSets}`)
  console.log()

  if (issues.length > 0) {
    console.log('⚠️  ISSUES FOUND:\n')
    issues.slice(0, 10).forEach((issue, i) => {
      console.log(`${i + 1}. Word: "${issue.word}" (sentence ${issue.orderIndex})`)
      console.log(`   Issue: ${issue.issue}`)
      console.log(`   Languages: ${issue.languageCount}`)
      if (issue.enSentence) {
        console.log(`   EN: "${issue.enSentence}"`)
      }
      console.log()
    })
    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more issues\n`)
    }
  }

  // Sample check: Pick a random word with multiple languages
  console.log('🔍 SAMPLE TRANSLATION CHECK:\n')
  const sampleKey = Object.keys(groupedByWord).find(key => {
    const langs = groupedByWord[key]
    return langs['en'] && Object.keys(langs).length >= 5
  })

  if (sampleKey) {
    const [vocabId, orderIndex] = sampleKey.split('_')
    const word = words.find(w => w.id === parseInt(vocabId))
    const sentences = groupedByWord[sampleKey]
    
    console.log(`Word: "${word?.word_en}" (sentence ${orderIndex})`)
    console.log(`Languages: ${Object.keys(sentences).length}\n`)
    
    const sampleLangs = ['en', 'es', 'fr', 'de', 'ja', 'ar', 'zh']
    sampleLangs.forEach(lang => {
      if (sentences[lang]) {
        console.log(`  ${lang}: ${sentences[lang]}`)
      }
    })
  }

  console.log('\n✅ Check complete!\n')
}

checkConsistency().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
