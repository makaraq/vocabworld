import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('Testing example_sentences RLS with anon key...\n')

const { data, error, count } = await anonClient
  .from('example_sentences')
  .select('*', { count: 'exact', head: true })

console.log('Result:')
console.log('  Error:', error?.message || 'none')
console.log('  Count:', count)

if (count === null || count === 0) {
  console.log('\n❌ RLS NOT WORKING - anon users cannot read')
  console.log('\nRun this in Supabase SQL Editor:')
  console.log('ALTER TABLE example_sentences ENABLE ROW LEVEL SECURITY;')
  console.log('CREATE POLICY "Allow public read" ON example_sentences FOR SELECT USING (true);')
} else {
  console.log('\n✅ RLS WORKING - Example sentences accessible in app')
}
