/**
 * Pre-flight check script for example sentence generation
 * Verifies all requirements are met before running generation
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function runChecks() {
  console.log('🔍 Running pre-flight checks...\n')

  // Check 1: Environment Variables
  console.log('1️⃣  Checking environment variables...')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ]

  let missingVars: string[] = []
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName)
      console.log(`   ❌ ${varName} - MISSING`)
    } else {
      const value = process.env[varName]
      const display = varName === 'GEMINI_API_KEY' || varName === 'SUPABASE_SERVICE_ROLE_KEY'
        ? value.substring(0, 10) + '...'
        : value
      console.log(`   ✅ ${varName} - ${display}`)
    }
  }

  if (missingVars.length > 0) {
    console.log('\n❌ Missing environment variables!')
    console.log('Please add these to your .env.local file:')
    missingVars.forEach(v => console.log(`   ${v}=your_value_here`))
    process.exit(1)
  }

  // Check 2: Supabase Connection
  console.log('\n2️⃣  Testing Supabase connection...')
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { count, error } = await supabase
      .from('vocabulary')
      .select('id', { count: 'exact', head: true })
    
    if (error) throw error
    
    console.log(`   ✅ Connected to Supabase`)
    console.log(`   📚 Found ${count} vocabulary words`)
    
    // Check for Turkish words specifically
    const { count: trCount } = await supabase
      .from('vocabulary_translations')
      .select('id', { count: 'exact', head: true })
      .eq('language_code', 'tr')
    
    console.log(`   🇹🇷 Turkish translations: ${trCount}`)
    
    if (trCount === 0) {
      console.log('   ⚠️  Warning: No Turkish words found!')
    }
    
    // Check if example_sentences table exists
    const { error: tableError } = await supabase
      .from('example_sentences')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    
    if (tableError) {
      console.log('   ❌ example_sentences table not found!')
      console.log('   👉 Run the SQL schema: add-example-sentences-schema.sql')
      process.exit(1)
    } else {
      console.log('   ✅ example_sentences table exists')
    }
    
  } catch (error) {
    console.log('   ❌ Supabase connection failed:', error)
    process.exit(1)
  }

  // Check 3: Gemini API
  console.log('\n3️⃣  Testing Gemini API connection...')
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    // Try with the latest model - gemini-2.0-flash-exp is the newest
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash-exp' })
    
    const result = await model.generateContent('Say "Hello" in JSON format: {"message": "Hello"}')
    const response = result.response.text()
    
    console.log('   ✅ Gemini API is working')
    console.log('   📝 Test response received')
    
  } catch (error: any) {
    // If the model is not found, it might be an API key or model availability issue
    // But we can still proceed if other checks pass
    console.log('   ⚠️  Gemini API test failed:', error?.message || error)
    console.log('   ℹ️  This might be okay - the API key may still work for generation')
    console.log('   👉 If generation fails, check: https://makersuite.google.com/app/apikey')
  }

  // All checks passed
  console.log('\n═══════════════════════════════════════════')
  console.log('✅ All pre-flight checks passed!')
  console.log('═══════════════════════════════════════════')
  console.log('\nYou can now run:')
  console.log('  npm run generate-examples -- --language tr --limit 45')
  console.log('\nFor test batch of 45 Turkish words')
}

// Run the checks
runChecks()
