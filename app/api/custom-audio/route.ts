/**
 * Custom Audio API - Text-to-Speech for Custom Words
 * 
 * Generates audio for custom words using free TTS services
 * This runs server-side so it works on all platforms (web, iOS, Android)
 * 
 * GET /api/custom-audio?text=hello&languageCode=es
 * Returns: audio/mpeg stream
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// Language code mapping for Google TTS
const GOOGLE_TTS_LANGUAGES: Record<string, string> = {
  'ar': 'ar', 'bg': 'bg', 'bn': 'bn', 'ca': 'ca', 'cs': 'cs',
  'cy': 'cy', 'da': 'da', 'de': 'de', 'el': 'el', 'en': 'en',
  'es': 'es', 'et': 'et', 'eu': 'eu', 'fa': 'fa', 'fi': 'fi',
  'fr': 'fr', 'ga': 'ga', 'gu': 'gu', 'he': 'iw', 'hi': 'hi',
  'hr': 'hr', 'hu': 'hu', 'id': 'id', 'is': 'is', 'it': 'it',
  'ja': 'ja', 'ko': 'ko', 'lt': 'lt', 'lv': 'lv', 'mk': 'mk',
  'ml': 'ml', 'mr': 'mr', 'mt': 'mt', 'nl': 'nl', 'no': 'no',
  'pl': 'pl', 'pt': 'pt', 'ro': 'ro', 'ru': 'ru', 'sk': 'sk',
  'sl': 'sl', 'sv': 'sv', 'ta': 'ta', 'te': 'te', 'th': 'th',
  'tr': 'tr', 'uk': 'uk', 'ur': 'ur', 'vi': 'vi', 'zh': 'zh-CN'
}

// Generate audio using Google Translate TTS (free, reliable)
async function generateGoogleTTS(text: string, languageCode: string): Promise<Buffer> {
  const googleLang = GOOGLE_TTS_LANGUAGES[languageCode] || languageCode
  
  // Google Translate TTS endpoint
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${googleLang}&client=tw-ob&q=${encodeURIComponent(text)}`
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    }
  })
  
  if (!response.ok) {
    throw new Error(`Google TTS error: ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Alternative: VoiceRSS free TTS API (backup)
async function generateVoiceRSSTTS(text: string, languageCode: string): Promise<Buffer> {
  // VoiceRSS language codes
  const voiceRSSLangs: Record<string, string> = {
    'en': 'en-us', 'es': 'es-es', 'fr': 'fr-fr', 'de': 'de-de',
    'it': 'it-it', 'pt': 'pt-pt', 'ru': 'ru-ru', 'ja': 'ja-jp',
    'ko': 'ko-kr', 'zh': 'zh-cn', 'ar': 'ar-sa', 'hi': 'hi-in',
    'nl': 'nl-nl', 'pl': 'pl-pl', 'tr': 'tr-tr', 'sv': 'sv-se',
    'da': 'da-dk', 'fi': 'fi-fi', 'no': 'nb-no', 'cs': 'cs-cz',
    'el': 'el-gr', 'he': 'he-il', 'hu': 'hu-hu', 'ro': 'ro-ro',
    'sk': 'sk-sk', 'uk': 'uk-ua', 'vi': 'vi-vn', 'th': 'th-th',
    'id': 'id-id', 'ca': 'ca-es', 'hr': 'hr-hr', 'bg': 'bg-bg',
  }
  
  const lang = voiceRSSLangs[languageCode] || 'en-us'
  const apiKey = process.env.VOICERSS_API_KEY
  
  if (!apiKey) {
    throw new Error('VoiceRSS API key not configured')
  }
  
  const url = `https://api.voicerss.org/?key=${apiKey}&hl=${lang}&src=${encodeURIComponent(text)}&c=MP3&f=24khz_16bit_mono`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`VoiceRSS error: ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Fallback: ResponsiveVoice proxy (if available)
async function generateResponsiveVoiceTTS(text: string, languageCode: string): Promise<Buffer> {
  const langMap: Record<string, string> = {
    'en': 'UK English Male', 'es': 'Spanish Male', 'fr': 'French Male',
    'de': 'Deutsch Male', 'it': 'Italian Male', 'pt': 'Portuguese Male',
    'ru': 'Russian Male', 'ja': 'Japanese Male', 'ko': 'Korean Male',
    'zh': 'Chinese Male', 'ar': 'Arabic Male', 'hi': 'Hindi Male',
  }
  
  const voice = langMap[languageCode] || 'UK English Male'
  const url = `https://texttospeech.responsivevoice.org/v1/text:synthesize?text=${encodeURIComponent(text)}&lang=${languageCode}&engine=g1&name=${encodeURIComponent(voice)}&pitch=0.5&rate=0.5&volume=1`
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  
  if (!response.ok) {
    throw new Error(`ResponsiveVoice error: ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const text = searchParams.get('text')
    const languageCode = searchParams.get('languageCode') || 'en'
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing required parameter: text' },
        { status: 400 }
      )
    }
    
    // Validate language
    if (!GOOGLE_TTS_LANGUAGES[languageCode]) {
      return NextResponse.json(
        { error: `Language '${languageCode}' not supported for audio` },
        { status: 400 }
      )
    }
    
    // Limit text length for safety
    const trimmedText = text.slice(0, 200)
    
    // Try to generate audio with fallbacks
    let audioBuffer: Buffer | null = null
    let source = 'unknown'
    
    // Try Google Translate TTS first (most reliable, free)
    try {
      audioBuffer = await generateGoogleTTS(trimmedText, languageCode)
      source = 'google-tts'
    } catch (googleError) {
      console.error('Google TTS failed:', googleError)
      
      // Try VoiceRSS if API key is configured
      if (process.env.VOICERSS_API_KEY) {
        try {
          audioBuffer = await generateVoiceRSSTTS(trimmedText, languageCode)
          source = 'voicerss'
        } catch (voiceRSSError) {
          console.error('VoiceRSS failed:', voiceRSSError)
        }
      }
      
      // Try ResponsiveVoice as last resort
      if (!audioBuffer) {
        try {
          audioBuffer = await generateResponsiveVoiceTTS(trimmedText, languageCode)
          source = 'responsivevoice'
        } catch (rvError) {
          console.error('ResponsiveVoice failed:', rvError)
        }
      }
    }
    
    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Audio generation failed - all TTS services unavailable' },
        { status: 503 }
      )
    }
    
    // Return audio stream
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'X-Audio-Source': source
      }
    })
    
  } catch (error) {
    console.error('Custom audio generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audio generation failed' },
      { status: 500 }
    )
  }
}

// POST endpoint for batch audio generation (returns URLs)
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { words, languageCode } = body
    
    if (!words || !Array.isArray(words)) {
      return NextResponse.json(
        { error: 'Missing required parameter: words (array)' },
        { status: 400 }
      )
    }
    
    if (!languageCode) {
      return NextResponse.json(
        { error: 'Missing required parameter: languageCode' },
        { status: 400 }
      )
    }
    
    // Return URLs for each word
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const audioUrls = words.map((word: string) => ({
      word,
      audioUrl: `${baseUrl}/api/custom-audio?text=${encodeURIComponent(word)}&languageCode=${languageCode}`
    }))
    
    return NextResponse.json({ audioUrls })
    
  } catch (error) {
    console.error('Batch audio URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio URLs' },
      { status: 500 }
    )
  }
}
