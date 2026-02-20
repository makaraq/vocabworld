import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs/promises'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTable() {
  console.log('📊 Creating ui_translations table...\n')

  const sql = await fs.readFile('scripts/create-ui-translations-table.sql', 'utf-8')

  // Note: Supabase JS client doesn't support raw SQL execution directly
  // You need to run this SQL in the Supabase Dashboard SQL Editor
  
  console.log('⚠️  Please run the following SQL in your Supabase Dashboard SQL Editor:\n')
  console.log('=' .repeat(60))
  console.log(sql)
  console.log('=' .repeat(60))
  console.log('\n📝 Go to: https://supabase.com/dashboard/project/_/sql')
  console.log('   Then paste and run the SQL above.')
  console.log('\n✅ After running the SQL, run: node scripts/insert-section-translations.mjs')
}

createTable()
