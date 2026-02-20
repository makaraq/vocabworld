import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs/promises'

config({ path: '.env.local' })

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Section name keys (normalized from the original names)
const sectionKeys = {
  'PROFILE': 'PROFILE',
  'FIRST AID KIT': 'FIRST_AID_KIT',
  'DAILY LIFE': 'DAILY_LIFE',
  'WORK & SCHOOL': 'WORK_AND_SCHOOL',
  'PERSONAL & SOCIAL LIFE': 'PERSONAL_AND_SOCIAL_LIFE',
  'CULTURE & SOCIETY': 'CULTURE_AND_SOCIETY',
  'PROFESSIONAL': 'PROFESSIONAL',
  'MY WORDS': 'MY_WORDS'
}

async function insertSectionTranslations() {
  console.log('🌍 Inserting section name translations into database...\n')

  // Find the most recent translation file
  const files = await fs.readdir('.')
  const translationFiles = files.filter(f => f.startsWith('section-names-translations-') && f.endsWith('.json') && !f.includes('summary'))
  
  if (translationFiles.length === 0) {
    console.error('❌ No translation files found')
    process.exit(1)
  }

  // Sort by filename (timestamp) and get the latest
  translationFiles.sort()
  const latestFile = translationFiles[translationFiles.length - 1]
  
  console.log(`📁 Reading translations from: ${latestFile}\n`)

  // Read the translation file
  const data = await fs.readFile(latestFile, 'utf-8')
  const translations = JSON.parse(data)

  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0
  const results = {
    successful: [],
    skipped: [],
    failed: []
  }

  // Process each language
  for (const [langCode, langData] of Object.entries(translations)) {
    // Skip English
    if (langCode === 'en') {
      console.log(`⏭️  Skipping English (as requested)`)
      totalSkipped += Object.keys(sectionKeys).length
      results.skipped.push(langCode)
      continue
    }

    const progress = `[${Object.keys(results.successful).length + results.skipped.length + results.failed.length + 1}/${Object.keys(translations).length}]`
    process.stdout.write(`\r${progress} 🌐 Processing ${langData.languageName.padEnd(20)}...`)

    const translationData = langData.translations

    // Prepare batch insert data
    const insertData = []
    for (const [originalName, translatedText] of Object.entries(translationData)) {
      const key = sectionKeys[originalName]
      if (!key) {
        console.log(`\n⚠️  Warning: Unknown section name "${originalName}"`)
        continue
      }

      insertData.push({
        key,
        language_code: langCode,
        translated_text: translatedText,
        category: 'section'
      })
    }

    // Insert into database
    const { error } = await supabase
      .from('ui_translations')
      .upsert(insertData, {
        onConflict: 'key,language_code'
      })

    if (error) {
      console.log(`\n❌ Error inserting ${langData.languageName}:`, error.message)
      results.failed.push(langCode)
      totalErrors += insertData.length
    } else {
      totalInserted += insertData.length
      results.successful.push(langCode)
      process.stdout.write(` ✅`)
    }
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('🎉 DATABASE INSERT COMPLETE!')
  console.log('='.repeat(60))
  console.log(`✅ Successfully inserted: ${totalInserted} translations`)
  console.log(`⏭️  Skipped (English): ${totalSkipped} translations`)
  console.log(`❌ Errors: ${totalErrors} translations`)
  console.log(`📊 Languages processed: ${results.successful.length}/${Object.keys(translations).length - 1} (excluding English)`)
  console.log(`🗣️  Successful languages: ${results.successful.length}`)
  console.log(`❌ Failed languages: ${results.failed.length}`)
  console.log('='.repeat(60))

  // Display key mapping used
  console.log('\n📝 Key Mapping Used:')
  for (const [original, key] of Object.entries(sectionKeys)) {
    console.log(`   "${original}" → ${key}`)
  }
}

// Run the insertion
insertSectionTranslations()
  .then(() => {
    console.log('\n✨ Database insertion completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
