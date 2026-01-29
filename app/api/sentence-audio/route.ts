import { NextRequest, NextResponse } from 'next/server'

const VOICES: Record<string, string> = {
  ar: 'ar-SA-ZariyahNeural',
  bg: 'bg-BG-KalinaNeural',
  ca: 'ca-ES-JoanaNeural',
  cs: 'cs-CZ-VlastaNeural',
  cy: 'cy-GB-NiaNeural',
  da: 'da-DK-ChristelNeural',
  de: 'de-DE-KatjaNeural',
  el: 'el-GR-AthinaNeural',
  en: 'en-US-AriaNeural',
  es: 'es-ES-ElviraNeural',
  et: 'et-EE-AnuNeural',
  eu: 'eu-ES-AinhoaNeural',
  fi: 'fi-FI-NooraNeural',
  fil: 'fil-PH-BlessicaNeural',
  fr: 'fr-FR-DeniseNeural',
  hi: 'hi-IN-SwaraNeural',
  hr: 'hr-HR-GabrijelaNeural',
  hu: 'hu-HU-NoemiNeural',
  id: 'id-ID-GadisNeural',
  is: 'is-IS-GudrunNeural',
  it: 'it-IT-ElsaNeural',
  ja: 'ja-JP-NanamiNeural',
  ko: 'ko-KR-SunHiNeural',
  lt: 'lt-LT-OnaNeural',
  lv: 'lv-LV-EveritaNeural',
  mt: 'mt-MT-GraceNeural',
  nl: 'nl-NL-ColetteNeural',
  no: 'nb-NO-PernilleNeural',
  pl: 'pl-PL-ZofiaNeural',
  pt: 'pt-PT-RaquelNeural',
  ro: 'ro-RO-AlinaNeural',
  ru: 'ru-RU-SvetlanaNeural',
  sk: 'sk-SK-ViktoriaNeural',
  sl: 'sl-SI-PetraNeural',
  sv: 'sv-SE-SofieNeural',
  th: 'th-TH-PremwadeeNeural',
  tr: 'tr-TR-EmelNeural',
  uk: 'uk-UA-PolinaNeural',
  vi: 'vi-VN-HoaiMyNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  af: 'af-ZA-AdriNeural',
  bn: 'bn-IN-TanishaaNeural',
  fa: 'fa-IR-DilaraNeural',
  he: 'he-IL-HilaNeural',
  ms: 'ms-MY-YasminNeural',
  sr: 'sr-RS-SophieNeural',
  ta: 'ta-IN-PallaviNeural',
  te: 'te-IN-ShrutiNeural',
  ur: 'ur-PK-UzmaNeural',
  gl: 'gl-ES-SabelaNeural',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')
    const lang = searchParams.get('lang') || 'en'

    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const voice = VOICES[lang] || 'en-US-AriaNeural'

    // Use public Edge TTS API endpoint
    const ttsUrl = `https://eastus.api.speech.microsoft.com/cognitiveservices/v1`
    
    const ssml = `<speak version='1.0' xml:lang='${lang}'>
      <voice xml:lang='${lang}' xml:gender='Female' name='${voice}'>
        ${text}
      </voice>
    </speak>`

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0',
      },
      body: ssml,
    })

    if (!response.ok) {
      // Fallback to browser Speech Synthesis API format for now
      return NextResponse.json({ 
        error: 'TTS service unavailable',
        fallback: 'browser',
        text,
        lang 
      }, { status: 503 })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Edge TTS error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
