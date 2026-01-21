/**
 * Delete ALL phonetics from database
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteAllPhonetics() {
  console.log('⚠️  WARNING: This will delete ALL phonetics from the database!')
  console.log('Waiting 5 seconds... Press Ctrl+C to cancel')
  console.log('')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('🗑️  Deleting all phonetics...')
  
  const { error, count } = await supabase
    .from('vocabulary_phonetics')
    .delete()
    .neq('id', 0) // Delete all rows
  
  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
  
  console.log(`✅ Deleted all phonetics successfully`)
  console.log('')
  
  // Verify
  const { count: remaining } = await supabase
    .from('vocabulary_phonetics')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Remaining phonetics in database: ${remaining}`)
}

deleteAllPhonetics().catch(console.error)
