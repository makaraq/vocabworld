/**
 * Test Script: Translate Audio Settings UI Strings
 * 
 * Translates audio settings strings like "Auto-play", "Pace", etc.
 * Test with 5 languages before creating full i18n file
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

// Test languages (5 for now)
const TEST_LANGUAGES = [
  { code: 'tr', name: 'Turkish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' }
]

// Audio settings strings to translate
const SETTINGS_STRINGS: Record<string, string> = {
  // Toggle settings
  'auto-play': 'Auto-play',
  'auto-play-desc': 'Automatically play audio when words change',
  'play-target-only': 'Play target language only',
  'play-target-desc': 'Skip native language translation',
  'show-phonetic': 'Show phonetic pronunciation',
  'show-phonetic-desc': 'Display IPA pronunciation guide',
  
  // Section headers
  'pace': 'Pace',
  
  // Speed control
  'pronunciation-speed': 'Pronunciation Speed:',
  'slow': 'Slow',
  'normal': 'Normal',
  'fast': 'Fast',
  
  // Slider controls
  'pause-between': 'Pause Duration between translations:',
  'pause-next': 'Pause Duration for the next word:',
  'repeat-target': 'Repeat Target Language Word:',
  'repeat-main': 'Repeat Main Language Word:',
  
  // Button
  'done': 'Done'
}

/**
 * Batch translate settings strings using Gemini
 */
async function translateSettingsBatch(
  targetLanguageCode: string,
  targetLanguageName: string
): Promise<Record<string, string>> {
  console.log(`\n🌐 Translating to ${targetLanguageName} (${targetLanguageCode})...`)
  
  const stringsList = Object.entries(SETTINGS_STRINGS)
    .map(([key, value]) => `${key}: "${value}"`)
    .join('\n')
  
  const prompt = `You are a professional translator specializing in UI/UX text for language learning apps.

CONTEXT:
These are audio settings labels and descriptions for a language learning app.
Users adjust playback speed, repetitions, and pauses while learning vocabulary.

TARGET LANGUAGE: ${targetLanguageName}

TASK:
Translate the following UI strings to ${targetLanguageName}. 

RULES:
1. Keep UI labels SHORT and CLEAR (1-3 words for labels)
2. Use standard UI terminology for ${targetLanguageName} apps
3. Maintain consistency with common audio/media player controls
4. Descriptions can be slightly longer but still concise
5. Return ONLY a JSON object mapping keys to translated values

STRINGS TO TRANSLATE:
${stringsList}

Return format (JSON only, no markdown):
{
  "auto-play": "translated text",
  "auto-play-desc": "translated text",
  "play-target-only": "translated text"
}

Translation:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    // Clean up response - remove markdown code blocks if present
    const jsonText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    const translations = JSON.parse(jsonText)
    
    console.log(`✅ Translated ${Object.keys(translations).length} strings`)
    return translations
    
  } catch (error) {
    console.error(`❌ Error translating to ${targetLanguageName}:`, error)
    return {}
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n============================================================')
  console.log('🧪 AUDIO SETTINGS TRANSLATION TEST')
  console.log('============================================================\n')

  console.log(`📋 Testing ${Object.keys(SETTINGS_STRINGS).length} UI strings:\n`)
  Object.entries(SETTINGS_STRINGS).slice(0, 5).forEach(([key, value]) => {
    console.log(`  ${key}: "${value}"`)
  })
  console.log('  ... and more\n')

  // Translate to test languages
  const results: Record<string, Record<string, string>> = {
    en: SETTINGS_STRINGS // Include English as base
  }
  
  for (const lang of TEST_LANGUAGES) {
    console.log(`\n--- Processing ${lang.name} (${lang.code}) ---`)
    
    const translations = await translateSettingsBatch(lang.code, lang.name)
    results[lang.code] = translations

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  // Save test results to TypeScript file
  const outputFile = 'lib/i18n/audio-settings-translations.ts'
  
  const tsContent = `/**
 * Audio Settings UI Translations
 * Auto-generated on ${new Date().toISOString().slice(0, 10)}
 * 
 * Usage:
 * import { audioSettingsTranslations } from '@/lib/i18n/audio-settings-translations'
 * const t = audioSettingsTranslations[languageCode] || audioSettingsTranslations['en']
 */

export const audioSettingsTranslations: Record<string, Record<string, string>> = ${JSON.stringify(results, null, 2)}
`

  fs.writeFileSync(outputFile, tsContent)
  console.log(`\n📄 Translations saved to: ${outputFile}`)

  // Also save JSON version for reference
  const jsonFile = `settings-translation-test-${new Date().toISOString().slice(0, 10)}.json`
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2))
  console.log(`📄 JSON backup saved to: ${jsonFile}`)

  // Display summary
  console.log('\n============================================================')
  console.log('📊 TEST SUMMARY')
  console.log('============================================================')
  console.log(`Strings translated: ${Object.keys(SETTINGS_STRINGS).length}`)
  console.log(`Languages tested: ${TEST_LANGUAGES.length}`)
  console.log('\nSample translations:')
  
  // Show a few key translations
  const sampleKeys = ['auto-play', 'pace', 'slow', 'normal', 'fast', 'done']
  sampleKeys.forEach(key => {
    console.log(`\n"${SETTINGS_STRINGS[key]}":`)
    TEST_LANGUAGES.forEach(lang => {
      if (results[lang.code] && results[lang.code][key]) {
        console.log(`  ${lang.code}: "${results[lang.code][key]}"`)
      }
    })
  })

  console.log('\n✅ Test complete!')
  console.log('\nNext steps:')
  console.log('1. Review translations above for quality')
  console.log('2. Check generated file: lib/i18n/audio-settings-translations.ts')
  console.log('3. If good, scale to all 50 languages')
  console.log('4. Update settings panel to use translations')
  console.log('============================================================\n')
}

// Run test
runTest().catch(console.error)
