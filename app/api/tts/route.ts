import { NextRequest, NextResponse } from 'next/server'

// Edge TTS voice mapping for all 50 languages
const VOICE_MAP: Record<string, string> = {
  'ar': 'ar-SA-ZariyahNeural',
  'bg': 'bg-BG-KalinaNeural',
  'bn': 'bn-BD-NabanitaNeural',
  'ca': 'ca-ES-JoanaNeural',
  'cs': 'cs-CZ-VlastaNeural',
  'cy': 'cy-GB-NiaNeural',
  'da': 'da-DK-ChristelNeural',
  'de': 'de-DE-KatjaNeural',
  'el': 'el-GR-AthinaNeural',
  'en': 'en-US-JennyNeural',
  'es': 'es-ES-ElviraNeural',
  'et': 'et-EE-AnuNeural',
  'eu': 'eu-ES-AinhoaNeural',
  'fa': 'fa-IR-DilaraNeural',
  'fi': 'fi-FI-NooraNeural',
  'fr': 'fr-FR-DeniseNeural',
  'ga': 'ga-IE-OrlaNeural',
  'gu': 'gu-IN-DhwaniNeural',
  'he': 'he-IL-HilaNeural',
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
  'mk': 'mk-MK-MarijaNeural',
  'ms': 'ms-MY-YasminNeural',
  'mt': 'mt-MT-GraceNeural',
  'nl': 'nl-NL-ColetteNeural',
  'no': 'nb-NO-PernilleNeural',
  'pl': 'pl-PL-ZofiaNeural',
  'pt': 'pt-PT-RaquelNeural',
  'ro': 'ro-RO-AlinaNeural',
  'ru': 'ru-RU-SvetlanaNeural',
  'sk': 'sk-SK-ViktoriaNeural',
  'sl': 'sl-SI-PetraNeural',
  'sq': 'sq-AL-AnilaNeural',
  'sr': 'sr-RS-SophieNeural',
  'sv': 'sv-SE-SofieNeural',
  'sw': 'sw-KE-ZuriNeural',
  'th': 'th-TH-PremwadeeNeural',
  'tl': 'fil-PH-BlessicaNeural',
  'tr': 'tr-TR-EmelNeural',
  'uk': 'uk-UA-PolinaNeural',
  'vi': 'vi-VN-HoaiMyNeural',
  'zh': 'zh-CN-XiaoxiaoNeural'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')
    const languageCode = searchParams.get('languageCode')

    console.log('TTS Request:', { text: text?.substring(0, 50), languageCode })

    if (!text || !languageCode) {
      console.error('Missing parameters:', { text: !!text, languageCode })
      return NextResponse.json(
        { error: 'Missing text or languageCode parameter' },
        { status: 400 }
      )
    }

    const voice = VOICE_MAP[languageCode] || 'en-US-JennyNeural'
    console.log('Using voice:', voice)

    // Use Microsoft Edge's free TTS service (Speech Synthesis API)
    const ttsUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1'
    
    // Generate random request ID
    const requestId = crypto.randomUUID().replace(/-/g, '')
    
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${voice}'>
        <prosody pitch='+0Hz' rate='+0%' volume='+0%'>
          ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}
        </prosody>
      </voice>
    </speak>`

    console.log('Calling Edge TTS API...')
    const startTime = Date.now()

    const response = await fetch(`${ttsUrl}?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&RequestId=${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
      body: ssml
    })

    const duration = Date.now() - startTime
    console.log('TTS API response:', response.status, `(${duration}ms)`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API error details:', { status: response.status, body: errorText })
      return NextResponse.json(
        { error: `TTS API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    console.log('Audio generated successfully, size:', audioBuffer.byteLength, 'bytes')

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=2592000', // 30 days cache
        'Accept-Ranges': 'bytes',
      }
    })

  } catch (error: any) {
    console.error('TTS error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error.message },
      { status: 500 }
    )
  }
}
