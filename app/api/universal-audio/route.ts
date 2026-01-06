import { NextRequest, NextResponse } from 'next/server';

// Universal Audio API - B2 Authenticated Access
// Directly constructs B2 paths and streams audio
export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Universal Audio API (B2 Direct) called'); 
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');

    console.log(`🔑 Audio Request:`, { wordId, languageCode });

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

    // Language code mapping
    const getAudioLanguageCode = (langCode: string): string => {
      const languageMap: { [key: string]: string } = {
        'Arabic': 'ar', 'Bulgarian': 'bg', 'Bengali': 'bn', 'Catalan': 'ca',
        'Czech': 'cs', 'Welsh': 'cy', 'Danish': 'da', 'German': 'de',
        'Greek': 'el', 'English': 'en', 'Spanish': 'es', 'Estonian': 'et',
        'Basque': 'eu', 'Persian': 'fa', 'Finnish': 'fi', 'French': 'fr',
        'Irish': 'ga', 'Gujarati': 'gu', 'Hebrew': 'he', 'Hindi': 'hi',
        'Croatian': 'hr', 'Hungarian': 'hu', 'Indonesian': 'id', 'Icelandic': 'is',
        'Italian': 'it', 'Japanese': 'ja', 'Korean': 'ko', 'Lithuanian': 'lt',
        'Latvian': 'lv', 'Macedonian': 'mk', 'Malayalam': 'ml', 'Marathi': 'mr',
        'Maltese': 'mt', 'Dutch': 'nl', 'Norwegian': 'no', 'Polish': 'pl',
        'Portuguese': 'pt', 'Romanian': 'ro', 'Russian': 'ru', 'Slovak': 'sk',
        'Slovenian': 'sl', 'Swedish': 'sv', 'Tamil': 'ta', 'Telugu': 'te',
        'Thai': 'th', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Urdu': 'ur',
        'Vietnamese': 'vi', 'Chinese': 'zh',
        'el-GR': 'el', 'en-US': 'en', 'es-ES': 'es', 'fr-FR': 'fr',
        'de-DE': 'de', 'it-IT': 'it', 'pt-PT': 'pt', 'ru-RU': 'ru',
        'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh', 'ar-SA': 'ar'
      };
      return languageMap[langCode] || languageMap[langCode.toLowerCase()] || langCode.split('-')[0].toLowerCase();
    };

    const audioLangCode = getAudioLanguageCode(languageCode);
    console.log(`🔑 Language mapping:`, { original: languageCode, mapped: audioLangCode });

    // Step 1: Authorize with B2
    console.log('🔐 Authorizing with B2...');
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${applicationKey}`).toString('base64')
      }
    });

    if (!authResponse.ok) {
      console.log('❌ B2 authorization failed');
      return NextResponse.json(
        { error: 'B2 authorization failed' },
        { status: 503 }
      );
    }

    const authData = await authResponse.json();
    console.log('✅ B2 authorization successful');

    // Step 2: Get download authorization for the bucket
    console.log('🔑 Getting download authorization...');
    
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
      return NextResponse.json(
        { error: 'Download authorization failed' },
        { status: 503 }
      );
    }

    const downloadAuthData = await downloadAuthResponse.json();
    console.log('✅ Download authorization successful');

    // Step 3: Try to find the audio file by listing files with the wordId prefix
    // Files follow pattern: {lang}/{category}/alnilam_{wordId}_.wav or with underscores
    
    // Categories in the B2 bucket
    const categories = [
      'Greetings', 'Numbers', 'Time', 'Emergency', 'Directions', 'Travel',
      'Shopping', 'Food', 'Home', 'Family', 'Weather', 'Colors', 'Animals',
      'Body', 'Health', 'Clothing', 'Work', 'Education', 'Technology',
      'Nature', 'Transportation', 'Entertainment', 'Sports', 'Music', 'Art',
      'Religion', 'Politics', 'Business', 'Science', 'Emotions', 'Actions',
      'Questions', 'Adjectives', 'Adverbs', 'Prepositions', 'Conjunctions',
      'Common_Phrases', 'Slang', 'Formal', 'Informal'
    ];

    // Try different filename patterns (B2 files may have varying underscores)
    const filePatterns = [
      `alnilam_${wordId}_.wav`,
      `alnilam_${wordId}__.wav`,
      `alnilam_${wordId}___.wav`,
      `alnilam_${wordId}____.wav`,
      `alnilam_${wordId}_____.wav`,
      `alnilam_${wordId}______.wav`,
      `alnilam_${wordId}_______.wav`,
      `alnilam_${wordId}________.wav`,
    ];

    let audioBuffer: ArrayBuffer | null = null;
    let foundPath = '';

    // Try each category and pattern combination
    for (const category of categories) {
      if (audioBuffer) break;
      
      for (const pattern of filePatterns) {
        const filePath = `${audioLangCode}/${category}/${pattern}`;
        const downloadUrl = `${authData.downloadUrl}/file/voco-audio-library/${filePath}`;
        
        try {
          const audioResponse = await fetch(downloadUrl, {
            headers: {
              'Authorization': downloadAuthData.authorizationToken
            }
          });

          if (audioResponse.ok) {
            audioBuffer = await audioResponse.arrayBuffer();
            foundPath = filePath;
            console.log(`✅ Found audio at: ${filePath}`);
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    if (!audioBuffer) {
      console.log(`❌ Audio file not found for wordId=${wordId}, language=${audioLangCode}`);
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode },
        { status: 404 }
      );
    }

    console.log(`🔑 Serving audio: ${foundPath} (${audioBuffer.byteLength} bytes)`);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'X-Audio-Source': 'b2-direct',
      },
    });

  } catch (error) {
    console.error('❌ Audio API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
