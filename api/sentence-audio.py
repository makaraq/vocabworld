from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import edge_tts
import asyncio
import io

# Voice mapping for all 50 languages
VOICES = {
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
    'fil': 'fil-PH-BlessicaNeural',
    'fr': 'fr-FR-DeniseNeural',
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

async def generate_audio(text: str, voice: str) -> bytes:
    """Generate audio using edge-tts library"""
    communicate = edge_tts.Communicate(text, voice)
    audio_buffer = io.BytesIO()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"])
    
    return audio_buffer.getvalue()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed_url = urlparse(self.path)
            params = parse_qs(parsed_url.query)
            
            text = params.get('text', [''])[0]
            lang = params.get('lang', ['en'])[0]
            
            if not text:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing text parameter"}')
                return
            
            # Get voice for language
            voice = VOICES.get(lang, 'en-US-AriaNeural')
            
            # Generate audio using edge-tts
            audio_data = asyncio.run(generate_audio(text, voice))
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(audio_data)
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_msg = f'{{"error": "{str(e)}"}}'.encode()
            self.wfile.write(error_msg)
