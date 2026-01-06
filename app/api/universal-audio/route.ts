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

    console.log(`🔑 B2 Credentials check:`, { 
      keyIdExists: !!keyId, 
      appKeyExists: !!applicationKey,
      keyIdLength: keyId?.length || 0,
      appKeyLength: applicationKey?.length || 0 
    });

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

    // Step 3: Try to find the audio file - start with most likely categories first
    // Categories ordered by likelihood (Greetings and Numbers are most common)
    const categories = [
      'Greetings', 'Numbers', 'Time', 'Common_Phrases',  // Most common first
      'Actions', 'Adjectives', 'Food', 'Home', 'Family', 'Weather',
      'Emergency', 'Directions', 'Travel', 'Shopping', 
      'Colors', 'Animals', 'Body', 'Health', 'Clothing', 'Work', 
      'Education', 'Technology', 'Nature', 'Transportation', 
      'Entertainment', 'Sports', 'Music', 'Art', 'Religion', 
      'Politics', 'Business', 'Science', 'Emotions',
      'Questions', 'Adverbs', 'Prepositions', 'Conjunctions',
      'Slang', 'Formal', 'Informal'
    ];

    // Try fewer patterns first - most files use just 1-3 underscores
    const fileExtensions = ['wav', 'mp3'];
    const underscorePatterns = ['_', '__', '___', '____']; // Limited patterns to speed up
    
    let audioBuffer: ArrayBuffer | null = null;
    let foundPath = '';
    let contentType = 'audio/wav';
    let attemptCount = 0;

    // Try each category, extension, and pattern combination (optimized order)
    categoryLoop: for (const category of categories) {
      if (audioBuffer) break;
      
      for (const ext of fileExtensions) {
        if (audioBuffer) break;
        
        for (const pattern of underscorePatterns) {
          attemptCount++;
          const fileName = `alnilam_${wordId}${pattern}.${ext}`;
          const filePath = `${audioLangCode}/${category}/${fileName}`;
          const downloadUrl = `${authData.downloadUrl}/file/voco-audio-library/${filePath}`;
          
          console.log(`🔍 Attempt ${attemptCount}: Trying ${filePath}`);
          
          try {
            const audioResponse = await fetch(downloadUrl, {
              headers: {
                'Authorization': downloadAuthData.authorizationToken
              }
            });

            console.log(`📁 ${filePath} -> ${audioResponse.status}`);

            if (audioResponse.ok) {
              audioBuffer = await audioResponse.arrayBuffer();
              foundPath = filePath;
              contentType = ext === 'mp3' ? 'audio/mpeg' : 'audio/wav';
              console.log(`✅ SUCCESS! Found audio at: ${filePath} (${ext}) after ${attemptCount} attempts`);
              break categoryLoop;
            }
          } catch (e) {
            console.log(`❌ Error fetching ${filePath}:`, e);
          }
          
          // Limit attempts to avoid timeout
          if (attemptCount > 20) {
            console.log(`⏰ Stopping search after ${attemptCount} attempts to avoid timeout`);
            break categoryLoop;
          }
        }
      }
    }

    if (!audioBuffer) {
      console.log(`❌ Audio file not found for wordId=${wordId}, language=${audioLangCode} after ${attemptCount} attempts`);
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode, attempts: attemptCount },
        { status: 404 }
      );
    }

    console.log(`🔑 Serving audio: ${foundPath} (${audioBuffer.byteLength} bytes) found after ${attemptCount} attempts`);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
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
