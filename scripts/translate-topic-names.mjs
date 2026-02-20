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

// All 50 supported languages
const languages = {
  'ar': 'Arabic',
  'bg': 'Bulgarian',
  'bn': 'Bengali',
  'ca': 'Catalan',
  'cs': 'Czech',
  'cy': 'Welsh',
  'da': 'Danish',
  'de': 'German',
  'el': 'Greek',
  'en': 'English',
  'es': 'Spanish',
  'et': 'Estonian',
  'eu': 'Basque',
  'fa': 'Persian',
  'fi': 'Finnish',
  'fr': 'French',
  'ga': 'Irish',
  'gu': 'Gujarati',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'hr': 'Croatian',
  'hu': 'Hungarian',
  'id': 'Indonesian',
  'is': 'Icelandic',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'lt': 'Lithuanian',
  'lv': 'Latvian',
  'mk': 'Macedonian',
  'ml': 'Malayalam',
  'mr': 'Marathi',
  'mt': 'Maltese',
  'nl': 'Dutch',
  'no': 'Norwegian',
  'pl': 'Polish',
  'pt': 'Portuguese',
  'ro': 'Romanian',
  'ru': 'Russian',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'sv': 'Swedish',
  'ta': 'Tamil',
  'te': 'Telugu',
  'th': 'Thai',
  'tr': 'Turkish',
  'uk': 'Ukrainian',
  'ur': 'Urdu',
  'vi': 'Vietnamese',
  'zh': 'Chinese'
}

async function translateTopicNames() {
  console.log('🌍 Starting topic name translations...\n')
  console.log(`📝 Topics to translate: ${topicNames.length}`)
  console.log(`🗣️ Target languages: ${Object.keys(languages).length - 1} (excluding English)\n`)

  const allTranslations = {}
  const targetLanguages = Object.entries(languages).filter(([code]) => code !== 'en')

  // Process in batches of 5 languages at a time
  const BATCH_SIZE = 5
  
  for (let i = 0; i < targetLanguages.length; i += BATCH_SIZE) {
    const batch = targetLanguages.slice(i, i + BATCH_SIZE)
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targetLanguages.length / BATCH_SIZE)}`)
    console.log(`Languages: ${batch.map(([_, name]) => name).join(', ')}\n`)

    for (const [code, languageName] of batch) {
      try {
        console.log(`🔄 Translating to ${languageName} (${code})...`)

        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash-lite',
          generationConfig: {
            temperature: 0.1,
          }
        })

        const prompt = `Translate these 44 vocabulary topic names into ${languageName}.

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

        allTranslations[code] = translations
        console.log(`✅ ${languageName}: ${translations.slice(0, 3).join(', ')}...`)

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error translating to ${languageName}:`, error.message)
        allTranslations[code] = null
      }
    }
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `topic-names-translations-${timestamp}.json`
  
  const output = {
    timestamp: new Date().toISOString(),
    sourceLanguage: 'en',
    topicNames: topicNames,
    translations: allTranslations,
    stats: {
      totalTopics: topicNames.length,
      totalLanguages: targetLanguages.length,
      successfulTranslations: Object.values(allTranslations).filter(t => t !== null).length,
      failedTranslations: Object.values(allTranslations).filter(t => t === null).length
    }
  }

  fs.writeFileSync(filename, JSON.stringify(output, null, 2))

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✅ Translation complete!`)
  console.log(`📁 Saved to: ${filename}`)
  console.log(`📊 Success: ${output.stats.successfulTranslations}/${output.stats.totalLanguages} languages`)
  console.log(`${'═'.repeat(60)}\n`)

  return output
}

translateTopicNames().catch(console.error)
