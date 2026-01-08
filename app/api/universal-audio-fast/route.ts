import { NextRequest, NextResponse } from 'next/server';

// FAST Universal Audio API - Direct B2 Access with URL Patterns
// Simplified approach for production without CSV dependency
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 FAST Universal Audio API called'); 
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');

    console.log(`🚀 Fast Audio Request:`, { wordId, languageCode });

    if (!wordId || !languageCode) {
      return NextResponse.json(
        { error: 'Missing required parameters: wordId and languageCode' },
        { status: 400 }
      );
    }

    // B2 credentials from environment
    const keyId = process.env.B2_APPLICATION_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;

    if (!keyId || !applicationKey) {
      console.log('❌ B2 credentials not found in environment');
      return NextResponse.json(
        { error: 'B2 credentials not configured' },
        { status: 503 }
      );
    }

    // Language code mapping (simplified)
    const getAudioLanguageCode = (langCode: string): string => {
      const map: { [key: string]: string } = {
        'ar': 'ar', 'bg': 'bg', 'bn': 'bn', 'ca': 'ca', 'cs': 'cs', 'cy': 'cy', 
        'da': 'da', 'de': 'de', 'el': 'el', 'en': 'en', 'es': 'es', 'et': 'et',
        'eu': 'eu', 'fa': 'fa', 'fi': 'fi', 'fr': 'fr', 'ga': 'ga', 'gu': 'gu',
        'he': 'he', 'hi': 'hi', 'hr': 'hr', 'hu': 'hu', 'id': 'id', 'is': 'is',
        'it': 'it', 'ja': 'ja', 'ko': 'ko', 'lt': 'lt', 'lv': 'lv', 'mk': 'mk',
        'ml': 'ml', 'mr': 'mr', 'mt': 'mt', 'nl': 'nl', 'no': 'no', 'pl': 'pl',
        'pt': 'pt', 'ro': 'ro', 'ru': 'ru', 'sk': 'sk', 'sl': 'sl', 'sv': 'sv',
        'ta': 'ta', 'te': 'te', 'th': 'th', 'tr': 'tr', 'uk': 'uk', 'ur': 'ur',
        'vi': 'vi', 'zh': 'zh', 'zh-CN': 'zh', 'pt-PT': 'pt', 'en-US': 'en'
      };
      return map[langCode] || langCode.split('-')[0].toLowerCase();
    };

    const audioLangCode = getAudioLanguageCode(languageCode);
    console.log(`🚀 Language: ${languageCode} → ${audioLangCode}`);

    // Step 1: Authorize with B2
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${applicationKey}`).toString('base64')
      }
    });

    if (!authResponse.ok) {
      console.log('❌ B2 authorization failed');
      return NextResponse.json({ error: 'B2 authorization failed' }, { status: 503 });
    }

    const authData = await authResponse.json();
    console.log('✅ B2 authorized');

    // Step 2: Get download authorization
    const downloadAuthResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: 'aa1d47dd5cca310593920d1c',
        fileNamePrefix: '',
        validDurationInSeconds: 3600
      })
    });

    if (!downloadAuthResponse.ok) {
      console.log('❌ Download authorization failed');
      return NextResponse.json({ error: 'Download authorization failed' }, { status: 503 });
    }

    const downloadAuthData = await downloadAuthResponse.json();
    console.log('✅ Download authorized');

    // Step 3: Try common file patterns (based on actual B2 structure)
    const wordIdInt = parseInt(wordId);
    
    // Common patterns from the working CSV data
    const patterns = [
      // Common greetings patterns (wordId 2682-2690)
      { category: 'Greetings', extension: 'wav' },
      { category: 'greetings', extension: 'wav' },  // lowercase variant
      // Numbers patterns (wordId 2719-2765)  
      { category: 'Numbers', extension: 'wav' },
      { category: 'numbers', extension: 'wav' },
      // Time patterns (wordId 2765+)
      { category: 'Time_Dates', extension: 'wav' },
      { category: 'time_dates', extension: 'wav' },
      // Common categories
      { category: 'Actions', extension: 'wav' },
      { category: 'Food', extension: 'wav' },
      { category: 'Home', extension: 'wav' },
      // MP3 variants for verbs
      { category: 'Verbs', extension: 'mp3' },
      { category: 'verbs', extension: 'mp3' },
    ];

    let audioBuffer: ArrayBuffer | null = null;
    let foundPath = '';
    let contentType = 'audio/wav';

    // Try each pattern combination
    for (const pattern of patterns) {
      if (audioBuffer) break;

      // Try different filename variations
      const variations = [
        `alnilam_${wordId}_.${pattern.extension}`,
        `alnilam_${wordId}__.${pattern.extension}`,
        `alnilam_${wordId}___.${pattern.extension}`,
      ];

      for (const fileName of variations) {
        const filePath = `${audioLangCode}/${pattern.category}/${fileName}`;
        const downloadUrl = `${authData.downloadUrl}/file/voco-audio-library/${filePath}`;
        
        console.log(`🔍 Trying: ${filePath}`);
        
        try {
          const audioResponse = await fetch(downloadUrl, {
            headers: { 'Authorization': downloadAuthData.authorizationToken }
          });

          if (audioResponse.ok) {
            audioBuffer = await audioResponse.arrayBuffer();
            foundPath = filePath;
            contentType = pattern.extension === 'mp3' ? 'audio/mpeg' : 'audio/wav';
            console.log(`✅ SUCCESS: ${filePath} (${audioBuffer.byteLength} bytes)`);
            break;
          } else {
            console.log(`❌ ${filePath} -> ${audioResponse.status}`);
          }
        } catch (e) {
          console.log(`❌ Error: ${filePath}`);
        }
      }
    }

    if (!audioBuffer) {
      console.log(`❌ Audio not found for wordId=${wordId}, language=${audioLangCode}`);
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode },
        { status: 404 }
      );
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'X-Audio-Source': 'b2-fast',
        'X-Audio-Path': foundPath,
      },
    });

  } catch (error) {
    console.error('❌ Fast Audio API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}