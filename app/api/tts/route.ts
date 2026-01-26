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

    if (!text || !languageCode) {
      return NextResponse.json(
        { error: 'Missing text or languageCode parameter' },
        { status: 400 }
      )
    }

    const voice = VOICE_MAP[languageCode] || 'en-US-JennyNeural'

    // Use Azure Cognitive Services Edge TTS API
    const ttsUrl = `https://eastus.tts.speech.microsoft.com/cognitiveservices/v1`
    
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice name='${voice}'>
          <prosody rate='0%' pitch='0%'>
            ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </prosody>
        </voice>
      </speak>
    `

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_KEY || '',
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'VocabWorld'
      },
      body: ssml
    })

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`)
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      }
    })

  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
