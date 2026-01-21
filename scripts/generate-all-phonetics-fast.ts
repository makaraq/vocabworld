/**
 * FAST Parallel Phonetic Generation
 * Runs 10 topics in parallel for maximum speed
 */

import { spawn } from 'child_process'
import { resolve } from 'path'
import * as path from 'path'

const LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
  'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
  'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
  'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
]

const TOPICS = Array.from({ length: 41 }, (_, i) => i + 1)
const PARALLEL_JOBS = 10 // Run 10 jobs at once

const stats = {
  completed: 0,
  failed: 0,
  total: TOPICS.length * LANGUAGES.length
}

function generateJob(topicId: number, languageCode: string): Promise<void> {
  return new Promise((resolvePromise) => {
    const scriptPath = path.resolve(__dirname, 'generate-phonetics.ts')
    const args: string[] = ['tsx', `"${scriptPath}"`, `--topic=${topicId}`, `--language=${languageCode}`, '--force']
    
    const child = spawn('npx', args, {
      stdio: 'ignore', // Suppress output for speed
      shell: true,
      env: {
        ...process.env,
        PATH: process.env.PATH + ';C:\\Program Files\\eSpeak NG'
      }
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        stats.completed++
      } else {
        stats.failed++
      }
      
      // Progress update every 50 jobs
      if ((stats.completed + stats.failed) % 50 === 0) {
        const percent = ((stats.completed + stats.failed) / stats.total * 100).toFixed(1)
        console.log(`⚡ Progress: ${stats.completed}/${stats.total} (${percent}%) | Failed: ${stats.failed}`)
      }
      
      resolvePromise()
    })
    
    child.on('error', () => {
      stats.failed++
      resolvePromise()
    })
  })
}

async function batchGenerate() {
  console.log('⚡ FAST PARALLEL PHONETIC GENERATION')
  console.log('='.repeat(80))
  console.log(`📊 Running ${PARALLEL_JOBS} jobs in parallel`)
  console.log(`📚 Total jobs: ${stats.total}`)
  console.log(`⏱️  Estimated time: 2-4 hours`)
  console.log('='.repeat(80))
  console.log('')
  
  const startTime = Date.now()
  
  // Create all jobs
  const allJobs: Promise<void>[] = []
  for (const topicId of TOPICS) {
    for (const languageCode of LANGUAGES) {
      allJobs.push(generateJob(topicId, languageCode))
    }
  }
  
  // Run jobs with parallelism limit
  const chunks = []
  for (let i = 0; i < allJobs.length; i += PARALLEL_JOBS) {
    chunks.push(allJobs.slice(i, i + PARALLEL_JOBS))
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk)
  }
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000)
  const hours = Math.floor(totalTime / 3600)
  const minutes = Math.floor((totalTime % 3600) / 60)
  
  console.log('\n' + '='.repeat(80))
  console.log('🎉 GENERATION COMPLETE!')
  console.log('='.repeat(80))
  console.log(`✅ Completed: ${stats.completed}/${stats.total}`)
  console.log(`❌ Failed: ${stats.failed}`)
  console.log(`⏱️  Total time: ${hours}h ${minutes}m`)
  console.log('='.repeat(80))
}

batchGenerate().catch(console.error)
