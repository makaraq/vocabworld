import { config } from 'dotenv';
config({ path: '.env.local' });

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';

async function testAzure() {
  console.log('Testing Azure TTS...');
  console.log('Key:', AZURE_SPEECH_KEY ? 'Present' : 'Missing');
  console.log('Region:', AZURE_REGION);
  
  const ssml = `<speak version='1.0' xml:lang='cy-GB'>
    <voice xml:lang='cy-GB' name='cy-GB-NiaNeural'>
      codi
    </voice>
  </speak>`;

  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm'
      },
      body: ssml
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log('✅ Success! Audio size:', buffer.byteLength, 'bytes');
    } else {
      const text = await response.text();
      console.log('❌ Error response:', text);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAzure();
