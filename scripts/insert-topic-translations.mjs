import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map English topic names to their IDs (from frontend API order)
const topicNameToId = {
  'Greetings': 1,
  'Numbers': 2,
  'Time': 3,
  'Directions': 4,
  'Emergency': 7,
  'Travel': 18,
  'Shopping': 5,
  'Food': 6,
  'Home': 9,
  'City': 17,
  'Family': 12,
  'Health': 8,
  'Weather': 11,
  'Personal Style': 10,
  'Emotions': 13,
  'Personality': 14,
  'Actions': 21,
  'Hobbies': 15,
  'Fitness': 16,
  'Adjectives': 22,
  'Professions': 25,
  'Education': 26,
  'History': 34,
  'Science': 32,
  'Technology': 24,
  'Art': 23,
  'Mathematics': 33,
  'Colors & Shapes': 19,
  'Business': 29,
  'Politics & Law': 35,
  'Religion': 36,
  'Cultural Integration': 40,
  'Environment': 28,
  'Media': 27,
  'Mythology': 37,
  'Holidays': 38,
  'Common Collocations': 30,
  'Modern Expressions': 31,
  'Formal Language': 39,
  'Verbs': 41,
  'Daily Language': 42,
  'Essential Words': 43,
  'Bad Words': 44,
  'Example Sentences': 45
}

async function insertTopicTranslations() {
  console.log('🌍 Inserting topic name translations into database...\n')

  // Read the translation file
  const translationFile = 'topic-names-translations-2026-02-20T14-47-04.json'
  
  console.log(`📁 Reading translations from: ${translationFile}\n`)

  const data = JSON.parse(fs.readFileSync(translationFile, 'utf-8'))
  const { topicNames, translations } = data

  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0
  const results = {
    successful: [],
    skipped: [],
    failed: []
  }

  // Process each language
  const languageCodes = Object.keys(translations)
  
  for (let i = 0; i < languageCodes.length; i++) {
    const langCode = languageCodes[i]
    const langTranslations = translations[langCode]

    // Skip English (no need to store, it's the default)
    if (langCode === 'en') {
      console.log(`⏭️  Skipping English (using database defaults)`)
      totalSkipped += topicNames.length
      results.skipped.push(langCode)
      continue
    }

    // Skip if no translations
    if (!langTranslations) {
      console.log(`⚠️  Skipping ${langCode} (no translations)`)
      results.skipped.push(langCode)
      continue
    }

    const progress = `[${i + 1}/${languageCodes.length}]`
    process.stdout.write(`\r${progress} 🌐 Processing ${langCode.toUpperCase().padEnd(5)}...`)

    // Prepare batch insert data
    const insertData = []
    for (let j = 0; j < topicNames.length; j++) {
      const englishName = topicNames[j]
      const translatedName = langTranslations[j]
      const topicId = topicNameToId[englishName]

      if (!topicId) {
        console.log(`\n⚠️  Warning: No topic ID found for "${englishName}"`)
        continue
      }

      insertData.push({
        topic_id: topicId,
        language_code: langCode,
        translated_name: translatedName
      })
    }

    // Insert into database
    const { error } = await supabase
      .from('topic_translations')
      .upsert(insertData, {
        onConflict: 'topic_id,language_code'
      })

    if (error) {
      console.log(`\n❌ Error inserting ${langCode}:`, error.message)
      results.failed.push(langCode)
      totalErrors += insertData.length
    } else {
      totalInserted += insertData.length
      results.successful.push(langCode)
      process.stdout.write(` ✅`)
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('🎉 DATABASE INSERT COMPLETE!')
  console.log('='.repeat(60))
  console.log(`✅ Successfully inserted: ${totalInserted} translations`)
  console.log(`⏭️  Skipped: ${totalSkipped} translations`)
  console.log(`❌ Errors: ${totalErrors} translations`)
  console.log(`📊 Languages processed: ${results.successful.length}/${languageCodes.length}`)
  console.log(`🗣️  Successful languages: ${results.successful.length}`)
  console.log(`❌ Failed languages: ${results.failed.length}`)
  console.log('='.repeat(60))

  // Sample data check
  console.log('\n📝 Sample translations inserted:')
  const { data: sampleData } = await supabase
    .from('topic_translations')
    .select('topic_id, language_code, translated_name')
    .in('language_code', ['es', 'fr', 'de', 'pt', 'ja'])
    .eq('topic_id', 1)
    .order('language_code')
  
  if (sampleData) {
    sampleData.forEach(row => {
      console.log(`   Topic 1 (Greetings) in ${row.language_code}: ${row.translated_name}`)
    })
  }
}

// Run the insertion
insertTopicTranslations()
  .then(() => {
    console.log('\n✨ Database insertion completed successfully!')
    console.log('📌 Remember to run database-topic-translations-schema.sql first if you haven\'t!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
