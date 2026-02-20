/**
 * Insert Category Translations to Supabase
 * 
 * Inserts all 13,573 category name translations (277 categories × 49 languages)
 * into the category_translations table
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

async function insertCategoryTranslations() {
  console.log('\n============================================================')
  console.log('📥 INSERTING CATEGORY TRANSLATIONS TO SUPABASE')
  console.log('============================================================\n')

  // Load translations from JSON file (use fixed version)
  const translationsData = JSON.parse(
    fs.readFileSync('category-names-translations-fixed.json', 'utf8')
  )

  const allLanguages = Object.keys(translationsData)
  console.log(`📋 Languages: ${allLanguages.length}`)
  console.log(`📋 Categories per language: ${Object.keys(translationsData[allLanguages[0]]).length}`)

  // Prepare all records for insertion
  const records = []
  
  for (const [languageCode, translations] of Object.entries(translationsData)) {
    for (const [category, translatedCategory] of Object.entries(translations)) {
      records.push({
        category: category,
        language_code: languageCode,
        translated_category: translatedCategory
      })
    }
  }

  console.log(`\n📊 Total translations to insert: ${records.length}`)
  console.log(`📊 Expected: 13,573 (277 categories × 49 languages)\n`)

  // Insert in batches to avoid payload size limits
  const BATCH_SIZE = 500
  const batches = []
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE))
  }

  console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} records each\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    
    process.stdout.write(`\r📤 Inserting batch ${i + 1}/${batches.length}... `)

    const { data, error } = await supabase
      .from('category_translations')
      .upsert(batch, { 
        onConflict: 'category,language_code',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error(`\n❌ Error in batch ${i + 1}:`, error.message)
      errorCount += batch.length
    } else {
      successCount += batch.length
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n')
  console.log('============================================================')
  console.log('📊 INSERTION SUMMARY')
  console.log('============================================================')
  console.log(`✅ Successfully inserted: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log(`📈 Success rate: ${((successCount / records.length) * 100).toFixed(2)}%`)
  console.log('============================================================\n')

  // Verify insertion
  console.log('🔍 Verifying database...\n')
  
  const { count, error: countError } = await supabase
    .from('category_translations')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting records:', countError)
  } else {
    console.log(`✅ Total records in database: ${count}`)
  }

  // Sample verification
  console.log('\n🔍 Sample verification (checking Spanish translations):\n')
  
  const { data: samples, error: sampleError } = await supabase
    .from('category_translations')
    .select('category, translated_category')
    .eq('language_code', 'es')
    .in('category', ['ASKING_FOR_HELP', 'introducing yourself - greetings', 'Agreement & Disagreement'])

  if (sampleError) {
    console.error('❌ Error fetching samples:', sampleError)
  } else {
    samples.forEach(s => {
      console.log(`  "${s.category}" → "${s.translated_category}"`)
    })
  }

  console.log('\n✅ Category translations successfully inserted!\n')
}

insertCategoryTranslations().catch(console.error)
