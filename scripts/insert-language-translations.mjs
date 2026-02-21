/**
 * Insert Language Name Translations to Supabase
 * 
 * Reads translation JSON and inserts into language_translations table
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function insertLanguageTranslations() {
  console.log('\n🌍 Language Name Translations - Database Insertion')
  console.log('='.repeat(50) + '\n')

  // Read the translations file
  const translationsFile = 'language-names-translations-2026-02-21.json'
  console.log(`📂 Reading file: ${translationsFile}`)
  
  const data = JSON.parse(fs.readFileSync(translationsFile, 'utf8'))
  const languageCodes = Object.keys(data)
  
  console.log(`📊 Languages found: ${languageCodes.length}`)
  console.log(`🎯 Preparing database records...\n`)

  // Prepare all records for insertion
  const records = []
  
  for (const languageCode of languageCodes) {
    const translations = data[languageCode]
    
    for (const [englishName, translatedName] of Object.entries(translations)) {
      records.push({
        language_code: languageCode,
        english_name: englishName,
        translated_name: translatedName
      })
    }
  }

  console.log(`📝 Total records to insert: ${records.length}`)
  console.log(`🔄 Starting batch insertion...\n`)

  // Insert in batches of 500
  const batchSize = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(records.length / batchSize)
    
    console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} records)...`)
    
    const { data, error } = await supabase
      .from('language_translations')
      .upsert(batch, {
        onConflict: 'language_code,english_name',
        ignoreDuplicates: false
      })
    
    if (error) {
      console.error(`   ❌ Error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`   ✅ Inserted ${batch.length} records`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Insertion Complete!')
  console.log(`📊 Total records: ${records.length}`)
  console.log(`✅ Successfully inserted: ${inserted}`)
  console.log(`❌ Failed: ${errors}`)
  console.log('='.repeat(50) + '\n')

  // Verify the data
  console.log('🔍 Verifying data...')
  const { count, error: countError } = await supabase
    .from('language_translations')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('❌ Error counting records:', countError.message)
  } else {
    console.log(`📊 Total records in database: ${count}`)
  }

  // Test a few translations
  console.log('\n🧪 Testing translations:')
  
  // Test Turkish translations
  const { data: turkishData, error: turkishError } = await supabase
    .from('language_translations')
    .select('english_name, translated_name')
    .eq('language_code', 'tr')
    .in('english_name', ['English', 'Spanish', 'French', 'German'])
  
  if (!turkishError && turkishData) {
    console.log('\n   Turkish (tr):')
    turkishData.forEach(row => {
      console.log(`   - ${row.english_name} → ${row.translated_name}`)
    })
  }

  // Test Spanish translations
  const { data: spanishData, error: spanishError } = await supabase
    .from('language_translations')
    .select('english_name, translated_name')
    .eq('language_code', 'es')
    .in('english_name', ['English', 'Turkish', 'French', 'German'])
  
  if (!spanishError && spanishData) {
    console.log('\n   Spanish (es):')
    spanishData.forEach(row => {
      console.log(`   - ${row.english_name} → ${row.translated_name}`)
    })
  }

  console.log('\n✅ All done!\n')
}

insertLanguageTranslations().catch(console.error)
