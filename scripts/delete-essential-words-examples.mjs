/**
 * Delete existing example sentences for Essential Words topic (ID 43)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOPIC_ID = 43

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function deleteExamples() {
  console.log('Fetching vocabulary IDs for topic 43...')
  
  const { data: words } = await supabase
    .from('vocabulary')
    .select('id')
    .eq('topic_id', TOPIC_ID)
  
  const vocabularyIds = words.map(w => w.id)
  
  console.log(`Deleting example sentences for ${vocabularyIds.length} words...`)
  
  const { error } = await supabase
    .from('example_sentences')
    .delete()
    .in('vocabulary_id', vocabularyIds)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Deleted all existing example sentences!')
  }
}

deleteExamples()
