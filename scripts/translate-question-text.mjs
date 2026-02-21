import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const languages = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' },
  { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' }
]

const questionText = "Choose the language you want to learn"

async function translateQuestion(targetLanguage, retries = 5) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prompt = `Translate this text to ${targetLanguage}: "${questionText}"

Important instructions:
- Provide ONLY the translation, no explanations or extra text
- Use natural, native phrasing that a ${targetLanguage} speaker would use
- Keep the meaning: "Choose the language you want to learn"
- Return only the translated text, nothing else`

      const result = await model.generateContent(prompt)
      const translation = result.response.text().trim()
      
      console.log(`✓ ${targetLanguage}: ${translation}`)
      return translation
    } catch (error) {
      console.error(`✗ Attempt ${attempt}/${retries} failed for ${targetLanguage}:`, error.message)
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(`  Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw new Error(`Failed to translate for ${targetLanguage} after ${retries} attempts`)
      }
    }
  }
}

async function main() {
  console.log('Starting question text translation...\n')
  
  const translations = {}
  
  for (const lang of languages) {
    try {
      const translation = await translateQuestion(lang.name)
      translations[lang.code] = translation
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to translate for ${lang.name}:`, error.message)
      // Continue with other languages
    }
  }
  
  // Save to JSON file
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `question-text-translations-${timestamp}.json`
  fs.writeFileSync(filename, JSON.stringify(translations, null, 2))
  
  console.log(`\n✓ Translations saved to ${filename}`)
  console.log(`✓ Total translations: ${Object.keys(translations).length}/${languages.length}`)
}

main().catch(console.error)
