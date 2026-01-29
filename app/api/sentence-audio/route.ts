import { NextRequest, NextResponse } from 'next/server'
import { EdgeSpeechTTS } from '@lobehub/tts'

// Voice mapping for all 50 languages
const VOICES: Record<string, string> = {
  'ar': 'ar-SA-ZariyahNeural',
  'bg': 'bg-BG-KalinaNeural',
  'ca': 'ca-ES-JoanaNeural',
  'cs': 'cs-CZ-VlastaNeural',
  'cy': 'cy-GB-NiaNeural',
  'da': 'da-DK-ChristelNeural',
  'de': 'de-DE-KatjaNeural',
  'el': 'el-GR-AthinaNeural',
  'en': 'en-US-AriaNeural',
  'es': 'es-ES-ElviraNeural',
  'et': 'et-EE-AnuNeural',
  'eu': 'eu-ES-AinhoaNeural',
  'fi': 'fi-FI-NooraNeural',
  'fr': 'fr-FR-DeniseNeural',
  'ga': 'ga-IE-OrlaNeural',
  'hi': 'hi-IN-SwaraNeural',
  'hr': 'hr-HR-GabrijelaNeural',
  'hu': 'hu-HU-NoemiNeural',
  'id': 'id-ID-GadisNeural',
  'is': 'is-IS-GudrunNeural',
  'it': 'it-IT-ElsaNeural',
  'ja': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural',
  'lt': 'lt-LT-OnaNeural',
  'lv': 'lv-LV-EveritaNeural',
  'mt': 'mt-MT-GraceNeural',
  'nl': 'nl-NL-ColetteNeural',
  'no': 'nb-NO-PernilleNeural',
  'pl': 'pl-PL-ZofiaNeural',
  'pt': 'pt-PT-RaquelNeural',
  'ro': 'ro-RO-AlinaNeural',
  'ru': 'ru-RU-SvetlanaNeural',
  'sk': 'sk-SK-ViktoriaNeural',
  'sl': 'sl-SI-PetraNeural',
  'sv': 'sv-SE-SofieNeural',
  'th': 'th-TH-PremwadeeNeural',
  'tr': 'tr-TR-EmelNeural',
  'uk': 'uk-UA-PolinaNeural',
  'vi': 'vi-VN-HoaiMyNeural',
  'zh': 'zh-CN-XiaoxiaoNeural',
  'af': 'af-ZA-AdriNeural',
  'bn': 'bn-IN-TanishaaNeural',
  'fa': 'fa-IR-DilaraNeural',
  'he': 'he-IL-HilaNeural',
  'ms': 'ms-MY-YasminNeural',
  'sr': 'sr-RS-SophieNeural',
  'ta': 'ta-IN-PallaviNeural',
  'te': 'te-IN-ShrutiNeural',
  'ur': 'ur-PK-UzmaNeural',
  'gl': 'gl-ES-SabelaNeural'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = searchParams.get('text')
    const lang = searchParams.get('lang') || 'en'

    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
    }

    const voice = VOICES[lang] || 'en-US-AriaNeural'

    // Use Lobehub EdgeSpeechTTS
    const tts = new EdgeSpeechTTS({ locale: voice })
    const response = await tts.create({ input: text, options: { voice } })

    // Get audio buffer from response
    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error: any) {
    console.error('Edge TTS error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
