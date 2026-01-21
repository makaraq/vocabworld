/**
 * Batch Generate Phonetics for All Topics and Languages
 * 
 * This script generates phonetics for all vocabulary across all topics and languages
 * 
 * Usage:
 *   npx tsx scripts/generate-all-phonetics.ts
 *   npx tsx scripts/generate-all-phonetics.ts --start-topic=5 --start-language=fr
 */

import { spawn } from 'child_process'
import { resolve } from 'path'
import * as path from 'path'

// All 50 supported languages
const LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
  'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
  'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
  'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
]

// Parse command line arguments
const args = process.argv.slice(2)
let startTopic = 1
let startLanguage = 0
let forceRegenerate = false

for (const arg of args) {
  if (arg.startsWith('--start-topic=')) {
    startTopic = parseInt(arg.split('=')[1])
  } else if (arg.startsWith('--start-language=')) {
    const langCode = arg.split('=')[1]
    startLanguage = LANGUAGES.indexOf(langCode)
    if (startLanguage === -1) {
      console.error(`❌ Invalid language code: ${langCode}`)
      process.exit(1)
    }
  } else if (arg === '--force') {
    forceRegenerate = true
  }
}

interface Stats {
  topicsCompleted: number
  languagesCompleted: number
  totalPhonetics: number
  failures: Array<{ topic: number; language: string; error: string }>
  startTime: Date
}

const stats: Stats = {
  topicsCompleted: 0,
  languagesCompleted: 0,
  totalPhonetics: 0,
  failures: [],
  startTime: new Date()
}

/**
 * Run phonetic generation for a specific topic and language
 */
async function generateForTopicLanguage(topicId: number, languageCode: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📚 Topic ${topicId}/41 | 🌍 ${languageCode.toUpperCase()} | Progress: ${stats.languagesCompleted}/${41 * LANGUAGES.length}`)
    console.log('='.repeat(80))
    
    const scriptPath = path.resolve(__dirname, 'generate-phonetics.ts')
    const args: string[] = ['tsx', `"${scriptPath}"`, `--topic=${topicId}`, `--language=${languageCode}`]
    
    if (forceRegenerate) {
      args.push('--force')
    }
    
    const child = spawn('npx', args, {
      stdio: 'pipe', // Capture output instead of inherit
      shell: true,
      env: {
        ...process.env,
        PATH: process.env.PATH + ';C:\\Program Files\\eSpeak NG'
      }
    })
    
    let outputBuffer = ''
    
    // Capture stdout
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const text = data.toString()
        outputBuffer += text
        
        // Print important lines (with ✅ or ❌)
        const lines = text.split('\n')
        lines.forEach(line => {
          if (line.includes('✅') || line.includes('❌') || line.includes('Generated') || line.includes('phonetics')) {
            console.log(line)
          }
        })
      })
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        // Extract word count from output - matches "Success: X"
        const match = outputBuffer.match(/Success: (\d+)/)
        const count = match ? match[1] : '?'
        console.log(`✅ Topic ${topicId} - ${languageCode.toUpperCase()}: ${count} words`)
        stats.totalPhonetics += parseInt(count || '0')
        resolvePromise(true)
      } else {
        console.error(`❌ Failed: Topic ${topicId} - ${languageCode} (exit code: ${code})`)
        stats.failures.push({
          topic: topicId,
          language: languageCode,
          error: `Exit code: ${code}`
        })
        resolvePromise(false)
      }
    })
    
    child.on('error', (error) => {
      console.error(`❌ Error: Topic ${topicId} - ${languageCode}:`, error.message)
      stats.failures.push({
        topic: topicId,
        language: languageCode,
        error: error.message
      })
      resolvePromise(false)
    })
  })
}

/**
 * Main batch processing function
 */
async function batchGenerate() {
  console.log('🎯 BATCH PHONETIC GENERATION FOR ALL VOCABULARY WORDS')
  console.log('=' .repeat(80))
  console.log(`📊 Configuration:`)
  console.log(`   - Topics: 1-41 (all topics)`)
  console.log(`   - Languages: ${LANGUAGES.length} languages per topic`)
  console.log(`   - Total jobs: ${41 * LANGUAGES.length} (topic × language combinations)`)
  console.log(`   - Estimated time: ~15-20 hours`)
  console.log(`   - Starting from: Topic ${startTopic}, Language ${LANGUAGES[startLanguage] || LANGUAGES[0]}`)
  console.log('=' .repeat(80))
  console.log('')
  
  // Confirm before starting
  console.log('⚠️  This will generate phonetics for EVERY word in EVERY topic in ALL languages.')
  console.log('⚠️  This will take 15-20 hours to complete.')
  console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('\n🚀 Starting batch generation...\n')
  
  // Process each topic
  for (let topicId = startTopic; topicId <= 41; topicId++) {
    const topicStartLanguage = (topicId === startTopic) ? startLanguage : 0
    
    // Process each language for this topic
    for (let i = topicStartLanguage; i < LANGUAGES.length; i++) {
      const languageCode = LANGUAGES[i]
      
      const success = await generateForTopicLanguage(topicId, languageCode)
      
      if (success) {
        stats.languagesCompleted++
      }
      
      // Progress update every 5 languages (more frequent)
      if ((stats.languagesCompleted % 5) === 0) {
        printProgress()
      }
    }
    
    stats.topicsCompleted++
    console.log(`\n✅ TOPIC ${topicId} COMPLETED - All ${LANGUAGES.length} languages processed\n`)
    printProgress()
  }
  
  // Final summary
  printFinalSummary()
}

/**
 * Print progress update
 */
function printProgress() {
  const elapsed = Math.floor((Date.now() - stats.startTime.getTime()) / 1000)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  
  const totalJobs = 41 * LANGUAGES.length
  const percentComplete = ((stats.languagesCompleted / totalJobs) * 100).toFixed(1)
  
  console.log('\n' + '─'.repeat(80))
  console.log('📊 PROGRESS UPDATE')
  console.log('─'.repeat(80))
  console.log(`   Topics completed: ${stats.topicsCompleted} / 41`)
  console.log(`   Jobs completed: ${stats.languagesCompleted} / ${totalJobs} (${percentComplete}%)`)
  console.log(`   Total phonetics generated: ${stats.totalPhonetics.toLocaleString()}`)
  console.log(`   Failures: ${stats.failures.length}`)
  console.log(`   Time elapsed: ${hours}h ${minutes}m ${seconds}s`)
  
  // Estimate remaining time
  if (stats.languagesCompleted > 0) {
    const avgTimePerJob = elapsed / stats.languagesCompleted
    const remainingJobs = totalJobs - stats.languagesCompleted
    const estimatedRemaining = Math.floor(avgTimePerJob * remainingJobs)
    const estHours = Math.floor(estimatedRemaining / 3600)
    const estMinutes = Math.floor((estimatedRemaining % 3600) / 60)
    console.log(`   Estimated remaining: ${estHours}h ${estMinutes}m`)
  }
  
  console.log('─'.repeat(80) + '\n')
}

/**
 * Print final summary
 */
function printFinalSummary() {
  console.log('\n' + '='.repeat(80))
  console.log('🎉 BATCH GENERATION COMPLETE!')
  console.log('='.repeat(80))
  console.log(`✅ Topics processed: ${stats.topicsCompleted} / 41`)
  console.log(`✅ Jobs completed: ${stats.languagesCompleted}`)
  console.log(`✅ Total phonetics generated: ${stats.totalPhonetics.toLocaleString()}`)
  console.log(`❌ Failures: ${stats.failures.length}`)
  
  const elapsed = Math.floor((Date.now() - stats.startTime.getTime()) / 1000)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  console.log(`⏱️  Total time: ${hours}h ${minutes}m ${seconds}s`)
  
  if (stats.failures.length > 0) {
    console.log('\n❌ FAILURES:')
    stats.failures.forEach(({ topic, language, error }) => {
      console.log(`   - Topic ${topic} (${language}): ${error}`)
    })
  }
  
  console.log('\n💾 All phonetics saved to vocabulary_phonetics table in Supabase')
  console.log('🎯 Phonetics feature is now ready to use in your app!')
  console.log('='.repeat(80) + '\n')
}

// Run the batch generation
batchGenerate().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
