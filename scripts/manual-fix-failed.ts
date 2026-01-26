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

const FAILED_WORDS = [
  { id: 2032, word: 'travel abroad' },
  { id: 2618, word: 'United Nations' },
  { id: 4353, word: 'believe it or not' },
  { id: 4616, word: 'finish up' }
]

const LANGUAGES = ['en', 'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'es', 
  'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi', 'hr',
  'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk', 'ms',
  'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq',
  'sr', 'sv', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh']

async function generateEnglishSentences(word: string): Promise<string[]> {
  const prompt = `Generate 3 simple example sentences using "${word}". Return ONLY a JSON array: ["sentence 1", "sentence 2", "sentence 3"]`
  
  const result = await model.generateContent(prompt)
  let response = result.response.text().trim()
  
  if (response.startsWith('```json')) {
    response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (response.startsWith('```')) {
    response = response.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  
  return JSON.parse(response)
}

async function translateSentence(sentence: string, targetLang: string): Promise<string> {
  const prompt = `Translate to ${targetLang}: "${sentence}". Return ONLY the translation, no explanations.`
  
  const result = await model.generateContent(prompt)
  return result.response.text().trim().replace(/^["']|["']$/g, '')
}

async function fixWord(id: number, word: string) {
  console.log(`\n📝 Fixing ID ${id}: "${word}"`)
  
  // Generate English sentences
  console.log('  🇬🇧 Generating English sentences...')
  const englishSentences = await generateEnglishSentences(word)
  console.log(`  ✅ Got ${englishSentences.length} English sentences`)
  
  const allData: any[] = []
  
  // Add English sentences
  for (let i = 0; i < englishSentences.length; i++) {
    allData.push({
      vocabulary_id: id,
      language_code: 'en',
      sentence: englishSentences[i],
      translation: englishSentences[i],
      sentence_order: i + 1
    })
  }
  
  // Translate to each language
  for (const lang of LANGUAGES.slice(1)) { // Skip 'en'
    console.log(`  🌍 Translating to ${lang}...`)
    
    for (let i = 0; i < englishSentences.length; i++) {
      try {
        const translation = await translateSentence(englishSentences[i], lang)
        allData.push({
          vocabulary_id: id,
          language_code: lang,
          sentence: translation,
          translation: englishSentences[i],
          sentence_order: i + 1
        })
        await new Promise(r => setTimeout(r, 500)) // Rate limiting
      } catch (error: any) {
        console.error(`    ❌ Failed ${lang}: ${error.message}`)
      }
    }
  }
  
  console.log(`  💾 Saving ${allData.length} records to database...`)
  
  // Delete existing if any
  await supabase.from('example_sentences').delete().eq('vocabulary_id', id)
  
  // Insert in batches of 50
  for (let i = 0; i < allData.length; i += 50) {
    const batch = allData.slice(i, i + 50)
    const { error } = await supabase.from('example_sentences').insert(batch)
    if (error) {
      console.error(`  ❌ Error inserting batch: ${error.message}`)
    }
  }
  
  console.log(`  ✅ Complete! Saved ${allData.length} records`)
}

async function main() {
  console.log('🔧 Manually fixing 4 failed words...\n')
  
  for (const { id, word } of FAILED_WORDS) {
    try {
      await fixWord(id, word)
    } catch (error: any) {
      console.error(`❌ Failed to fix ID ${id}: ${error.message}`)
    }
  }
  
  console.log('\n✅ Manual fix complete!')
}

main().catch(console.error)
