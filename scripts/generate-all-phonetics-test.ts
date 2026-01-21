/**
 * TEST Batch Generate Phonetics - Small subset for testing
 * 
 * This script generates phonetics for a small subset to verify everything works
 * 
 * Usage:
 *   npx tsx scripts/generate-all-phonetics-test.ts
 */

import { spawn } from 'child_process'
import { resolve } from 'path'
import * as path from 'path'

// TEST: Only 2 topics and 5 languages
const TEST_TOPICS = [1, 2]
const TEST_LANGUAGES = ['en', 'es', 'fr', 'de', 'tr']

const stats = {
  topicsCompleted: 0,
  languagesCompleted: 0,
  totalPhonetics: 0,
  failures: [] as Array<{ topic: number; language: string; error: string }>
}

const forceRegenerate = process.argv.includes('--force')

/**
 * Run phonetic generation for a specific topic and language
 */
async function generateForTopicLanguage(topicId: number, languageCode: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📚 Topic ${topicId} | 🌍 ${languageCode.toUpperCase()} | Progress: ${stats.languagesCompleted}/${TEST_TOPICS.length * TEST_LANGUAGES.length}`)
    console.log('='.repeat(80))
    
    const scriptPath = path.resolve(__dirname, 'generate-phonetics.ts')
    const args: string[] = ['tsx', `"${scriptPath}"`, `--topic=${topicId}`, `--language=${languageCode}`]
    
    if (forceRegenerate) {
      args.push('--force')
    }
    
    const child = spawn('npx', args, {
      stdio: 'pipe',
      shell: true,
      env: {
        ...process.env,
        PATH: process.env.PATH + ';C:\\Program Files\\eSpeak NG'
      }
    })
    
    let outputBuffer = ''
    let errorBuffer = ''
    
    // Capture stdout
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const text = data.toString()
        outputBuffer += text
        
        // Print important lines
        const lines = text.split('\n')
        lines.forEach(line => {
          if (line.includes('✅') || line.includes('❌') || line.includes('Generated') || line.includes('phonetics')) {
            console.log(line)
          }
        })
      })
    }
    
    // Capture stderr
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const text = data.toString()
        errorBuffer += text
        console.error('ERROR:', text)
      })
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        // Extract word count from output - matches "Success: X"
        const match = outputBuffer.match(/Success: (\d+)/)
        const count = match ? match[1] : '?'
        console.log(`✅ Topic ${topicId} - ${languageCode.toUpperCase()}: ${count} words`)
        stats.totalPhonetics += parseInt(count || '0')
        stats.languagesCompleted++
        resolvePromise(true)
      } else {
        console.error(`❌ Failed: Topic ${topicId} - ${languageCode} (exit code: ${code})`)
        if (errorBuffer) {
          console.error('Error output:', errorBuffer)
        }
        stats.failures.push({
          topic: topicId,
          language: languageCode,
          error: `Exit code: ${code}${errorBuffer ? ' - ' + errorBuffer.substring(0, 200) : ''}`
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
  console.log('🧪 TEST BATCH PHONETIC GENERATION')
  console.log('='.repeat(80))
  console.log(`📊 Configuration:`)
  console.log(`   - Topics: ${TEST_TOPICS.join(', ')} (${TEST_TOPICS.length} topics)`)
  console.log(`   - Languages: ${TEST_LANGUAGES.join(', ')} (${TEST_LANGUAGES.length} languages)`)
  console.log(`   - Total jobs: ${TEST_TOPICS.length * TEST_LANGUAGES.length}`)
  console.log(`   - Force regenerate: ${forceRegenerate}`)
  console.log(`   - Estimated time: ~2-5 minutes`)
  console.log('='.repeat(80))
  console.log('')
  
  console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('\n🚀 Starting test batch...\n')
  
  const startTime = Date.now()
  
  // Process each topic
  for (const topicId of TEST_TOPICS) {
    console.log(`\n📖 Starting Topic ${topicId}...`)
    
    // Process each language for this topic
    for (const languageCode of TEST_LANGUAGES) {
      await generateForTopicLanguage(topicId, languageCode)
      
      // Small delay between each generation
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    stats.topicsCompleted++
    console.log(`\n✅ TOPIC ${topicId} COMPLETED - All ${TEST_LANGUAGES.length} languages processed`)
    
    // Progress summary after each topic
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`📊 PROGRESS UPDATE`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`   Topics completed: ${stats.topicsCompleted} / ${TEST_TOPICS.length}`)
    console.log(`   Languages completed: ${stats.languagesCompleted} / ${TEST_TOPICS.length * TEST_LANGUAGES.length}`)
    console.log(`   Total phonetics generated: ${stats.totalPhonetics}`)
    console.log(`   Failures: ${stats.failures.length}`)
    console.log(`   Time elapsed: ${minutes}m ${seconds}s`)
    console.log(`${'─'.repeat(80)}\n`)
  }
  
  // Final summary
  const totalTime = Math.floor((Date.now() - startTime) / 1000)
  const totalMinutes = Math.floor(totalTime / 60)
  const totalSeconds = totalTime % 60
  
  console.log('\n' + '='.repeat(80))
  console.log('🎉 TEST BATCH COMPLETE!')
  console.log('='.repeat(80))
  console.log(`✅ Successfully completed: ${stats.languagesCompleted} / ${TEST_TOPICS.length * TEST_LANGUAGES.length}`)
  console.log(`📝 Total phonetics generated: ${stats.totalPhonetics}`)
  console.log(`⏱️  Total time: ${totalMinutes}m ${totalSeconds}s`)
  
  if (stats.failures.length > 0) {
    console.log(`\n❌ Failures (${stats.failures.length}):`)
    stats.failures.forEach(f => {
      console.log(`   - Topic ${f.topic}, Language ${f.language}: ${f.error}`)
    })
  } else {
    console.log('\n✨ No failures! Ready to run the full batch.')
  }
  
  console.log('='.repeat(80))
}

// Run the batch generation
batchGenerate().catch(console.error)
