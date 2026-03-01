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

// Unofficial Google Translate API — no key needed, very stable
const GTRANS_URL = 'https://translate.googleapis.com/translate_a/single'

async function callGoogleTranslate(
  word: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translation: string; alternatives: string[] } | null> {
  try {
    // dt=t → main translation, dt=bd → dictionary alternatives per pos
    const url = `${GTRANS_URL}?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&dt=bd&q=${encodeURIComponent(word)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return null

    // Response is a nested array — not JSON with named keys
    const data = await res.json()

    // Main translation: data[0] is array of [translated_chunk, source_chunk, ...]
    let translation = ''
    if (Array.isArray(data[0])) {
      translation = (data[0] as Array<string[]>)
        .map(chunk => chunk[0] || '')
        .join('')
        .trim()
    }

    // Dictionary alternatives: data[1] is [{pos, terms[], ...}, ...]
    const seen = new Set<string>()
    const alternatives: string[] = []

    const add = (t: string) => {
      const clean = t.trim()
      if (!clean || clean.toLowerCase() === word.toLowerCase()) return
      if (seen.has(clean.toLowerCase())) return
      seen.add(clean.toLowerCase())
      alternatives.push(clean)
    }

    if (translation) add(translation)

    // data[1] structure: [ [posName, [ [word, [synonyms], score], ... ]], ... ]
    if (Array.isArray(data[1])) {
      for (const group of data[1] as Array<[string, Array<[string, string[], number]>]>) {
        const entries = group[1]
        if (!Array.isArray(entries)) continue
        for (const entry of entries) {
          if (alternatives.length >= 8) break
          const term = entry[0]
          if (typeof term === 'string') add(term)
        }
        if (alternatives.length >= 8) break
      }
    }

    // If no dict alternatives, at least return the main translation
    if (!translation && alternatives.length === 0) return null

    return { translation: translation || alternatives[0], alternatives }
  } catch {
    return null
  }
}

// Single translation via Google Translate
async function translateWithGoogle(word: string, sourceLang: string, targetLang: string): Promise<string | null> {
  const result = await callGoogleTranslate(word, sourceLang, targetLang)
  if (!result?.translation) return null
  if (result.translation.toLowerCase() === word.toLowerCase()) return null
  return result.translation
}

// Multiple word-level suggestions via Google Translate dictionary
async function getGoogleSuggestions(word: string, sourceLang: string, targetLang: string): Promise<string[]> {
  const result = await callGoogleTranslate(word, sourceLang, targetLang)
  return result?.alternatives ?? []
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
  
  // For missing languages, use Google Translate
  const missingLangs = TARGET_LANGUAGES.filter(lang => !translations[lang] && lang !== sourceLang)
  
  // Limit concurrent requests
  const batchSize = 5
  for (let i = 0; i < missingLangs.length; i += batchSize) {
    const batch = missingLangs.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (lang) => {
        const translation = await translateWithGoogle(word, sourceLang, lang)
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

    // Suggestions mode: return multiple word-level variants via Google Translate
    if (suggestionsMode && targetLanguage) {
      const suggestions = await getGoogleSuggestions(word, sourceLanguage, targetLanguage)
      return NextResponse.json({ word, suggestions })
    }

    const supabase = getSupabaseAdmin()
    const effectiveTargetLang = targetLanguage || lang
    
    // For non-English source languages, use Google Translate directly (no caching)
    if (sourceLanguage !== 'en') {
      console.log(`Translating "${word}" from ${sourceLanguage} to ${effectiveTargetLang || 'all languages'}`)
      
      // Direct translation for specific target language
      if (effectiveTargetLang) {
        const translation = await translateWithGoogle(word, sourceLanguage, effectiveTargetLang)
        return NextResponse.json({
          word: word,
          sourceLanguage: sourceLanguage,
          translations: translation ? { [effectiveTargetLang]: translation } : {},
          source: 'google',
          cached: false
        })
      }
      
      // Translate to multiple languages
      const translations = await fetchTranslationsWithFallback(word, sourceLanguage)
      return NextResponse.json({
        word: word,
        sourceLanguage: sourceLanguage,
        translations: translations,
        source: 'google',
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
        source: 'wiktionary+google'
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
