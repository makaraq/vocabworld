import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('vocabulary')
  .select('*')
  .eq('id', 6078)
  .single()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Word 6078:', JSON.stringify(data, null, 2))
}
