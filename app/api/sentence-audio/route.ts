import { NextRequest, NextResponse } from 'next/server'

const VOICES: Record<string, string> = {
  'ar': 'ar-SA-ZariyahNeural', 'bg': 'bg-BG-KalinaNeural', 'bn': 'bn-BD-NabanitaNeural',
  'ca': 'ca-ES-JoanaNeural', 'cs': 'cs-CZ-VlastaNeural', 'cy': 'cy-GB-NiaNeural',
  'da': 'da-DK-ChristelNeural', 'de': 'de-DE-KatjaNeural', 'el': 'el-GR-AthinaNeural',
  'en': 'en-US-JennyNeural', 'es': 'es-ES-ElviraNeural', 'et': 'et-EE-AnuNeural',
  'eu': 'eu-ES-AinhoaNeural', 'fa': 'fa-IR-DilaraNeural', 'fi': 'fi-FI-NooraNeural',
  'fr': 'fr-FR-DeniseNeural', 'ga': 'ga-IE-OrlaNeural', 'gu': 'gu-IN-DhwaniNeural',
  'he': 'he-IL-HilaNeural', 'hi': 'hi-IN-SwaraNeural', 'hr': 'hr-HR-GabrijelaNeural',
  'hu': 'hu-HU-NoemiNeural', 'id': 'id-ID-GadisNeural', 'is': 'is-IS-GudrunNeural',
  'it': 'it-IT-ElsaNeural', 'ja': 'ja-JP-NanamiNeural', 'ko': 'ko-KR-SunHiNeural',
  'lt': 'lt-LT-OnaNeural', 'lv': 'lv-LV-EveritaNeural', 'mk': 'mk-MK-MarijaNeural',
  'ms': 'ms-MY-YasminNeural', 'mt': 'mt-MT-GraceNeural', 'nl': 'nl-NL-ColetteNeural',
  'no': 'nb-NO-PernilleNeural', 'pl': 'pl-PL-ZofiaNeural', 'pt': 'pt-PT-RaquelNeural',
  'ro': 'ro-RO-AlinaNeural', 'ru': 'ru-RU-SvetlanaNeural', 'sk': 'sk-SK-ViktoriaNeural',
  'sl': 'sl-SI-PetraNeural', 'sq': 'sq-AL-AnilaNeural', 'sr': 'sr-RS-SophieNeural',
  'sv': 'sv-SE-SofieNeural', 'sw': 'sw-KE-ZuriNeural', 'th': 'th-TH-PremwadeeNeural',
  'tl': 'fil-PH-BlessicaNeural', 'tr': 'tr-TR-EmelNeural', 'uk': 'uk-UA-PolinaNeural',
  'vi': 'vi-VN-HoaiMyNeural', 'zh': 'zh-CN-XiaoxiaoNeural'
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const text = searchParams.get('text')
  const lang = searchParams.get('lang') || 'en'

  if (!text) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
  }

  try {
    const voice = VOICES[lang] || 'en-US-JennyNeural'
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2)
    
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='0%' pitch='0%'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`

    const url = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&RequestId=${requestId}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
      },
      body: ssml
    })

    if (!response.ok) {
      console.error('Edge TTS error:', response.status, response.statusText)
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
    }

    const audioData = await response.arrayBuffer()

    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error: any) {
    console.error('TTS error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
