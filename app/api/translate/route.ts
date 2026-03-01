import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Wiktionary API endpoint for translations
const WIKTIONARY_API = 'https://en.wiktionary.org/api/rest_v1/page/definition'

// All 49 target languages (excluding English)
const TARGET_LANGUAGES = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'es', 'et', 'eu', 
  'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'is', 'it', 
  'ja', 'ko', 'lt', 'lv', 'mk', 'ml', 'mr', 'mt', 'nl', 'no', 'pl', 'pt', 
  'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
]

// Language code to Wiktionary language name mapping
const LANG_CODE_TO_NAME: Record<string, string[]> = {
  ar: ['Arabic'],
  bg: ['Bulgarian'],
  bn: ['Bengali', 'Bangla'],
  ca: ['Catalan'],
  cs: ['Czech'],
  cy: ['Welsh'],
  da: ['Danish'],
  de: ['German'],
  el: ['Greek'],
  es: ['Spanish'],
  et: ['Estonian'],
  eu: ['Basque'],
  fa: ['Persian', 'Farsi'],
  fi: ['Finnish'],
  fr: ['French'],
  ga: ['Irish', 'Irish Gaelic'],
  gu: ['Gujarati'],
  he: ['Hebrew'],
  hi: ['Hindi'],
  hr: ['Croatian'],
  hu: ['Hungarian'],
  id: ['Indonesian'],
  is: ['Icelandic'],
  it: ['Italian'],
  ja: ['Japanese'],
  ko: ['Korean'],
  lt: ['Lithuanian'],
  lv: ['Latvian'],
  mk: ['Macedonian'],
  ml: ['Malayalam'],
  mr: ['Marathi'],
  mt: ['Maltese'],
  nl: ['Dutch'],
  no: ['Norwegian', 'Norwegian Bokmål', 'Norwegian Nynorsk'],
  pl: ['Polish'],
  pt: ['Portuguese'],
  ro: ['Romanian'],
  ru: ['Russian'],
  sk: ['Slovak'],
  sl: ['Slovenian', 'Slovene'],
  sv: ['Swedish'],
  ta: ['Tamil'],
  te: ['Telugu'],
  th: ['Thai'],
  tr: ['Turkish'],
  uk: ['Ukrainian'],
  ur: ['Urdu'],
  vi: ['Vietnamese'],
  zh: ['Chinese', 'Mandarin', 'Mandarin Chinese']
}

// Create Supabase client with service role for caching
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Lingva public instances (Google Translate proxy, no API key needed)
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.garudalinux.org',
  'https://translate.plausibility.cloud',
]

// Call Lingva with automatic fallback across instances
async function fetchLingva(
  word: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translation: string; extraTranslations: Array<{ type: string; list: string[] }> } | null> {
  for (const base of LINGVA_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/api/v1/${encodeURIComponent(sourceLang)}/${encodeURIComponent(targetLang)}/${encodeURIComponent(word)}`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data?.translation) continue
      return {
        translation: data.translation as string,
        extraTranslations: (data.info?.extraTranslations as Array<{ type: string; list: string[] }>) || []
      }
    } catch {
      // try next instance
    }
  }
  return null
}

// Single translation via Lingva
async function translateWithLingva(word: string, sourceLang: string, targetLang: string): Promise<string | null> {
  const result = await fetchLingva(word, sourceLang, targetLang)
  if (!result) return null
  const t = result.translation.trim()
  // Lingva returns the original word when nothing is found
  if (t.toLowerCase() === word.toLowerCase()) return null
  return t
}

// Multiple translation suggestions via Lingva's extraTranslations (word-level variants per pos)
async function getLingvaSuggestions(word: string, sourceLang: string, targetLang: string): Promise<string[]> {
  const result = await fetchLingva(word, sourceLang, targetLang)
  if (!result) return []

  const seen = new Set<string>()
  const suggestions: string[] = []

  const add = (t: string) => {
    const clean = t.trim()
    if (!clean) return
    if (clean.toLowerCase() === word.toLowerCase()) return
    if (seen.has(clean.toLowerCase())) return
    seen.add(clean.toLowerCase())
    suggestions.push(clean)
  }

  // Primary translation first
  add(result.translation)

  // Then word-level alternatives from all parts of speech
  for (const group of result.extraTranslations) {
    for (const item of group.list ?? []) {
      if (suggestions.length >= 6) break
      add(item)
    }
    if (suggestions.length >= 6) break
  }

  return suggestions
}

// Fetch word from Wiktionary and extract translations
async function fetchWiktionaryTranslations(word: string): Promise<Record<string, string>> {
  const translations: Record<string, string> = {}
  
  try {
    // Try Wiktionary first
    const response = await fetch(`${WIKTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Parse Wiktionary response - structure varies but translations are in definitions
      if (data.en) {
        for (const entry of data.en) {
          if (entry.definitions) {
            for (const def of entry.definitions) {
              // Look for translation sections
              if (def.parsedExamples) {
                for (const example of def.parsedExamples) {
                  // Extract translations from examples if present
                  const text = example.example || ''
                  for (const [langCode, langNames] of Object.entries(LANG_CODE_TO_NAME)) {
                    for (const langName of langNames) {
                      const regex = new RegExp(`${langName}:\\s*([^,;\\n]+)`, 'i')
                      const match = text.match(regex)
                      if (match && !translations[langCode]) {
                        translations[langCode] = match[1].trim()
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Wiktionary fetch error:', error)
  }
  
  return translations
}

// Use LibreTranslate or fallback translation services
async function fetchTranslationsWithFallback(word: string, sourceLang: string = 'en'): Promise<Record<string, string>> {
  const translations: Record<string, string> = {}
  
  // If source is English, try Wiktionary first
  if (sourceLang === 'en') {
    const wiktionaryTranslations = await fetchWiktionaryTranslations(word)
    Object.assign(translations, wiktionaryTranslations)
  }
  
  // For missing languages, use Lingva (Google Translate proxy)
  const missingLangs = TARGET_LANGUAGES.filter(lang => !translations[lang] && lang !== sourceLang)
  
  // Limit concurrent requests to avoid overwhelming Lingva instances
  const batchSize = 5
  for (let i = 0; i < missingLangs.length; i += batchSize) {
    const batch = missingLangs.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (lang) => {
        const translation = await translateWithLingva(word, sourceLang, lang)
        return { lang, translation }
      })
    )
    
    for (const { lang, translation } of results) {
      if (translation) {
        translations[lang] = translation
      }
    }
    
    if (i + batchSize < missingLangs.length) {
      await new Promise(resolve => setTimeout(resolve, 80))
    }
  }
  
  return translations
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const word = searchParams.get('word')?.trim().toLowerCase()
    const targetLanguage = searchParams.get('targetLanguage') // Target language code
    const sourceLanguage = searchParams.get('sourceLanguage') || 'en' // Source language code, defaults to English
    const lang = searchParams.get('lang') // Optional: specific language only (deprecated, use targetLanguage)
    const suggestionsMode = searchParams.get('suggestions') === 'true'
    
    if (!word) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 })
    }
    
    if (word.length > 50) {
      return NextResponse.json({ error: 'Word too long' }, { status: 400 })
    }

    // Suggestions mode: return multiple translation variants via Lingva
    if (suggestionsMode && targetLanguage) {
      const suggestions = await getLingvaSuggestions(word, sourceLanguage, targetLanguage)
      return NextResponse.json({ word, suggestions })
    }

    const supabase = getSupabaseAdmin()
    const effectiveTargetLang = targetLanguage || lang
    
    // For non-English source languages, use Lingva directly (no caching)
    if (sourceLanguage !== 'en') {
      console.log(`Translating "${word}" from ${sourceLanguage} to ${effectiveTargetLang || 'all languages'}`)
      
      // Direct translation for specific target language
      if (effectiveTargetLang) {
        const translation = await translateWithLingva(word, sourceLanguage, effectiveTargetLang)
        return NextResponse.json({
          word: word,
          sourceLanguage: sourceLanguage,
          translations: translation ? { [effectiveTargetLang]: translation } : {},
          source: 'lingva',
          cached: false
        })
      }
      
      // Translate to multiple languages
      const translations = await fetchTranslationsWithFallback(word, sourceLanguage)
      return NextResponse.json({
        word: word,
        sourceLanguage: sourceLanguage,
        translations: translations,
        source: 'lingva',
        cached: false
      })
    }
    
    // English source - use caching system
    // Check if word exists in cache
    const { data: cachedWord } = await supabase
      .from('dictionary_words')
      .select('*')
      .eq('word_en', word)
      .single()
    
    if (cachedWord) {
      // Return cached result
      if (effectiveTargetLang) {
        return NextResponse.json({
          word: cachedWord.word_en,
          word_en: cachedWord.word_en,
          translation: cachedWord.translations[effectiveTargetLang] || null,
          translations: cachedWord.translations,
          language: effectiveTargetLang,
          cached: true,
          dictionary_word_id: cachedWord.id
        })
      }
      return NextResponse.json({
        word: cachedWord.word_en,
        word_en: cachedWord.word_en,
        translations: cachedWord.translations,
        part_of_speech: cachedWord.part_of_speech,
        cached: true,
        dictionary_word_id: cachedWord.id
      })
    }
    
    // Fetch translations from external APIs
    console.log(`Fetching translations for: ${word}`)
    const translations = await fetchTranslationsWithFallback(word, 'en')
    
    // Cache the result
    const { data: newWord, error: insertError } = await supabase
      .from('dictionary_words')
      .insert({
        word_en: word,
        translations: translations,
        source: 'wiktionary+lingva'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Cache insert error:', insertError)
    }
    
    if (effectiveTargetLang) {
      return NextResponse.json({
        word: word,
        word_en: word,
        translation: translations[effectiveTargetLang] || null,
        translations: translations,
        language: effectiveTargetLang,
        cached: false,
        dictionary_word_id: newWord?.id
      })
    }
    
    return NextResponse.json({
      word: word,
      word_en: word,
      translations: translations,
      cached: false,
      dictionary_word_id: newWord?.id
    })
    
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch translation' },
      { status: 500 }
    )
  }
}

// POST endpoint for adding word to playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { word, playlistId, userId, sourceLanguageCode, targetLanguageCode, translation, translations: providedTranslations } = body
    
    if (!word || !playlistId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: word, playlistId, userId' },
        { status: 400 }
      )
    }
    
    console.log('📝 Adding word to playlist:', { word, playlistId, userId, sourceLanguageCode, targetLanguageCode, translation })
    
    const supabase = getSupabaseAdmin()
    
    // Normalize the word for storage
    const normalizedWord = word.toLowerCase().trim()
    
    // Get or create dictionary word
    let { data: dictWord } = await supabase
      .from('dictionary_words')
      .select('id, translations')
      .eq('word_en', normalizedWord)
      .single()
    
    if (!dictWord) {
      // Build translations object from what we know
      let translationsToStore: Record<string, string> = {}
      
      // Add provided translations if available
      if (providedTranslations && typeof providedTranslations === 'object') {
        translationsToStore = { ...providedTranslations }
      }
      
      // Ensure we store the word and its direct translation
      if (sourceLanguageCode && word) {
        translationsToStore[sourceLanguageCode] = word
      }
      if (targetLanguageCode && translation) {
        translationsToStore[targetLanguageCode] = translation
      }
      
      // If we don't have translations, try to fetch them
      if (Object.keys(translationsToStore).length < 2) {
        const fetchedTranslations = await fetchTranslationsWithFallback(normalizedWord)
        translationsToStore = { ...fetchedTranslations, ...translationsToStore }
      }
      
      console.log('📚 Creating dictionary word with translations:', translationsToStore)
      
      const { data: newWord, error } = await supabase
        .from('dictionary_words')
        .insert({
          word_en: normalizedWord,
          translations: translationsToStore,
          source: 'user-added'
        })
        .select('id, translations')
        .single()
      
      if (error) {
        console.error('Failed to create dictionary word:', error)
        return NextResponse.json({ error: 'Failed to cache word' }, { status: 500 })
      }
      dictWord = newWord
    } else {
      // Update existing word with new translations if provided
      const existingTranslations = dictWord.translations || {}
      let needsUpdate = false
      const updatedTranslations = { ...existingTranslations }
      
      if (sourceLanguageCode && word && !existingTranslations[sourceLanguageCode]) {
        updatedTranslations[sourceLanguageCode] = word
        needsUpdate = true
      }
      if (targetLanguageCode && translation && !existingTranslations[targetLanguageCode]) {
        updatedTranslations[targetLanguageCode] = translation
        needsUpdate = true
      }
      
      if (needsUpdate) {
        await supabase
          .from('dictionary_words')
          .update({ translations: updatedTranslations })
          .eq('id', dictWord.id)
        console.log('📝 Updated dictionary word translations:', updatedTranslations)
      }
    }
    
    // Add to playlist
    const { error: playlistError } = await supabase
      .from('user_playlist_words')
      .insert({
        playlist_id: playlistId,
        dictionary_word_id: dictWord.id
      })
    
    if (playlistError) {
      console.error('Failed to add to playlist:', playlistError)
      if (playlistError.code === '23505') {
        return NextResponse.json({ error: 'Word already in playlist' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to add word to playlist' }, { status: 500 })
    }
    
    console.log('✅ Word added to playlist successfully:', { dictWordId: dictWord.id, playlistId })
    
    return NextResponse.json({ success: true, dictionaryWordId: dictWord.id })
    
  } catch (error) {
    console.error('Add to playlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
