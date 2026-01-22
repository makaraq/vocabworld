/**
 * Delete ALL phonetics from the database
 * USE WITH CAUTION - This will remove all generated phonetics
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as readline from 'readline'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes')
    })
  })
}

async function deleteAllPhonetics() {
  console.log('⚠️  WARNING: DELETE ALL PHONETICS ⚠️')
  console.log('='.repeat(80))
  console.log('This will permanently delete ALL phonetics from the database.')
  console.log('This action CANNOT be undone!')
  console.log('='.repeat(80))
  console.log('')
  
  // Get current count
  const { count } = await supabase
    .from('vocabulary_phonetics')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Current phonetics count: ${count}`)
  console.log('')
  
  const confirmed = await confirm('Type "yes" to confirm deletion: ')
  
  if (!confirmed) {
    console.log('❌ Deletion cancelled')
    rl.close()
    return
  }
  
  console.log('')
  console.log('🗑️  Deleting all phonetics...')
  
  const { error } = await supabase
    .from('vocabulary_phonetics')
    .delete()
    .neq('id', 0) // Delete all rows
  
  if (error) {
    console.error('❌ Error deleting phonetics:', error)
    rl.close()
    return
  }
  
  // Verify deletion
  const { count: finalCount } = await supabase
    .from('vocabulary_phonetics')
    .select('*', { count: 'exact', head: true })
  
  console.log('')
  console.log('✅ Deletion complete!')
  console.log(`📊 Remaining phonetics: ${finalCount}`)
  console.log('')
  console.log('You can now regenerate phonetics using:')
  console.log('  npx tsx scripts/generate-phonetics-gemini.ts --language=en')
  
  rl.close()
}

deleteAllPhonetics().catch(console.error)
