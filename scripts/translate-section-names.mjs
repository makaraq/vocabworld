import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import fs from 'fs/promises'

config({ path: '.env.local' })

// Initialize Gemini AI
const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY in .env.local')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(geminiApiKey)

// Translate section names using Gemini
async function translateSectionNames(sectionNames, targetLanguage) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.1, // Very low temperature for consistent translations
    }
  })
  
  const namesList = sectionNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')
  
  const prompt = `You are translating UI section names for a language learning app.

TASK: Translate these English section names to ${targetLanguage.name}

SECTION NAMES:
${namesList}

CRITICAL RULES:
1. Return translations in ALL CAPITAL LETTERS
2. Keep the "&" symbol (ampersand) in translations where it appears - DO NOT replace with "and"
3. Provide natural, concise translations
4. Maintain the same order
5. Return ONLY the numbered translations, nothing else
6. Format: "1. TRANSLATION" (each on a new line)

NO explanations. NO additional text. NO parentheses.

Translations:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Parse numbered list
    const translations = responseText
      .trim()
      .split('\n')
      .map(line => {
        const match = line.match(/^\d+\.\s*(.+)$/)
        return match ? match[1].trim().toUpperCase() : null
      })
      .filter(t => t)

    return translations
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`)
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Section names to translate
const sectionNames = [
  'PROFILE',
  'FIRST AID KIT',
  'DAILY LIFE',
  'WORK & SCHOOL',
  'PERSONAL & SOCIAL LIFE',
  'CULTURE & SOCIETY',
  'PROFESSIONAL',
  'MY WORDS'
]

// All 50 supported languages
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

async function translateAllSectionNames() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = {}
  let totalTranslations = 0
  let successCount = 0
  let errorCount = 0

  console.log('🌍 Starting translation of section names into 50 languages...')
  console.log(`📝 Sections to translate: ${sectionNames.length}`)
  console.log(`🗣️  Languages: ${languages.length}`)
  console.log(`📊 Total translations needed: ${sectionNames.length * languages.length}\n`)

  for (const lang of languages) {
    const progress = `[${languages.indexOf(lang) + 1}/${languages.length}]`
    process.stdout.write(`\r${progress} 🌐 Translating to ${lang.name.padEnd(20)}...`)
    
    results[lang.code] = {
      languageName: lang.name,
      languageCode: lang.code,
      translations: {}
    }

    try {
      // For English, just use the original (already in capitals)
      if (lang.code === 'en') {
        sectionNames.forEach(name => {
          results[lang.code].translations[name] = name
          successCount++
        })
        totalTranslations += sectionNames.length
        console.log(` ✅ (${sectionNames.length} sections)`)
        continue
      }

      // Translate all section names at once for this language
      const translations = await translateSectionNames(sectionNames, lang)
      
      if (translations.length !== sectionNames.length) {
        throw new Error(`Expected ${sectionNames.length} translations, got ${translations.length}`)
      }

      // Store translations
      sectionNames.forEach((name, idx) => {
        results[lang.code].translations[name] = translations[idx]
      })
      
      successCount += translations.length
      totalTranslations += sectionNames.length
      console.log(` ✅ (${translations.length} sections)`)

      // Rate limiting: wait 2 seconds between languages
      await delay(2000)

    } catch (error) {
      console.log(` ❌ Error: ${error.message}`)
      // Fallback to English for failed translations
      sectionNames.forEach(name => {
        results[lang.code].translations[name] = name
      })
      errorCount += sectionNames.length
      totalTranslations += sectionNames.length
      
      // If rate limited, wait longer
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('⏳ Rate limit hit, waiting 60 seconds...')
        await delay(60000)
      }
    }
  }

  // Save results
  const outputPath = `section-names-translations-${timestamp}.json`
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf-8')

  // Create a summary report
  const summary = {
    timestamp: new Date().toISOString(),
    totalLanguages: languages.length,
    totalSections: sectionNames.length,
    totalTranslations,
    successCount,
    errorCount,
    successRate: `${((successCount / totalTranslations) * 100).toFixed(2)}%`,
    sectionNames,
    languages: languages.map(l => ({ code: l.code, name: l.name }))
  }

  const summaryPath = `section-names-translations-summary-${timestamp}.json`
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')

  console.log('\n' + '='.repeat(60))
  console.log('🎉 TRANSLATION COMPLETE!')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successCount}/${totalTranslations}`)
  console.log(`❌ Errors: ${errorCount}/${totalTranslations}`)
  console.log(`📈 Success Rate: ${summary.successRate}`)
  console.log(`💾 Results saved to: ${outputPath}`)
  console.log(`📊 Summary saved to: ${summaryPath}`)
  console.log('='.repeat(60))

  return results
}

// Run the translation
translateAllSectionNames()
  .then(() => {
    console.log('\n✨ Translation script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
