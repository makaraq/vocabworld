import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

const FAILED_IDS = [1950, 2032, 2618, 4353, 4616]

async function retryFailedWords() {
  console.log('🔄 Retrying 5 failed words...\n')
  
  for (const id of FAILED_IDS) {
    const { data: word } = await supabase
      .from('vocabulary')
      .select('id, word_en')
      .eq('id', id)
      .single()
    
    if (!word) {
      console.log(`❌ Word ID ${id} not found`)
      continue
    }
    
    console.log(`\n📝 Retrying ID ${id}: "${word.word_en}"`)
    console.log('   Attempting generation...')
    
    try {
      const prompt = `Generate 3 simple example sentences for the word/phrase "${word.word_en}". Return ONLY a JSON array of 3 strings, nothing else. Example: ["sentence 1", "sentence 2", "sentence 3"]`
      
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      console.log('   Raw response:', response.substring(0, 100))
      
      let cleaned = response.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const parsed = JSON.parse(cleaned)
      console.log('   ✅ Successfully parsed JSON')
      console.log('   Sentences:', parsed)
      
    } catch (error: any) {
      console.log('   ❌ Still failing:', error.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}

retryFailedWords().catch(console.error)
