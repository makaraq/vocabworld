import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY in .env.local')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(geminiApiKey)

// 44 topic names in English
const topicNames = [
  'Greetings',
  'Numbers',
  'Time',
  'Directions',
  'Emergency',
  'Travel',
  'Shopping',
  'Food',
  'Home',
  'City',
  'Family',
  'Health',
  'Weather',
  'Personal Style',
  'Emotions',
  'Personality',
  'Actions',
  'Hobbies',
  'Fitness',
  'Adjectives',
  'Professions',
  'Education',
  'History',
  'Science',
  'Technology',
  'Art',
  'Mathematics',
  'Colors & Shapes',
  'Business',
  'Politics & Law',
  'Religion',
  'Cultural Integration',
  'Environment',
  'Media',
  'Mythology',
  'Holidays',
  'Common Collocations',
  'Modern Expressions',
  'Formal Language',
  'Verbs',
  'Daily Language',
  'Essential Words',
  'Bad Words',
  'Example Sentences'
]

async function retrySlovak() {
  console.log('🔄 Retrying Slovak translation...\n')

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,
      }
    })

    const prompt = `Translate these 44 vocabulary topic names into Slovak.

IMPORTANT RULES:
1. Keep translations SHORT - prefer 1-2 words maximum
2. Use natural, common terms that native speakers would use
3. Match the brevity of the English version
4. Return ONLY a JSON array with exactly 44 translations in the same order
5. No explanations, just the JSON array

English topic names:
${topicNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Return format:
["translation1", "translation2", ...]`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const translations = JSON.parse(jsonMatch[0])

    if (translations.length !== 44) {
      throw new Error(`Expected 44 translations, got ${translations.length}`)
    }

    console.log(`✅ Slovak: ${translations.slice(0, 3).join(', ')}...\n`)

    // Load existing translations file
    const existingFile = 'topic-names-translations-2026-02-20T14-47-04.json'
    const data = JSON.parse(fs.readFileSync(existingFile, 'utf8'))
    
    // Add Slovak translation
    data.translations.sk = translations
    data.stats.successfulTranslations = 49
    data.stats.failedTranslations = 0
    
    // Save updated file
    fs.writeFileSync(existingFile, JSON.stringify(data, null, 2))
    
    console.log('✅ Slovak translation added successfully!')
    console.log(`📁 Updated: ${existingFile}`)
    console.log('📊 All 49 languages now complete!\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

retrySlovak()
