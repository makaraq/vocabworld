import { NextRequest, NextResponse } from 'next/server';

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials
export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Universal Audio API (B2 Authenticated) called'); 
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');

    console.log(`🔑 Authenticated Audio Request:`, { wordId, languageCode });

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

    // Step 2: Get download authorization
    console.log('🔑 Getting download authorization...');
    
    const downloadAuthResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: 'aa1d47dd5cca310593920d1c',
        fileNamePrefix: `${audioLangCode}/`,
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

    // Step 3: Find file URL from CSV (check main CSV for audio files)
    let fileName: string | null = null;
    let filePath: string | null = null;
    
    try {
      // Fetch CSV from public directory via HTTP (works in serverless)
      const baseUrl = request.url.split('/api/')[0];
      const csvUrl = `${baseUrl}/data/backblaze-urls-20250909-180354.csv`;
      console.log(`🔍 Fetching CSV from: ${csvUrl}`);
      console.log(`🔍 Full request URL: ${request.url}`);
      console.log(`🔍 Base URL extracted: ${baseUrl}`);
      
      const csvResponse = await fetch(csvUrl);
      console.log(`🔍 CSV response status: ${csvResponse.status}`);
      if (!csvResponse.ok) {
        console.error(`❌ CSV fetch failed: ${csvResponse.status} ${csvResponse.statusText}`);
        throw new Error(`CSV fetch failed: ${csvResponse.status}`);
      }
      
      const csvContent = await csvResponse.text();
      const lines = csvContent.split('\n');
      
      console.log(`🔍 Searching main CSV: ${lines.length} entries for wordId=${wordId}, language=${audioLangCode}`);
      console.log(`🔍 First few lines of CSV:`, lines.slice(0, 3));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
        if (!match) {
          if (i < 5) console.log(`🔍 Line ${i} no match: ${line}`);
          continue;
        }

        const [, localPath, backblazeURL, language, category, csvFileName] = match;
        
        // Existing pattern: alnilam_{id}_
        const wordIdMatch = csvFileName.match(/alnilam_(\d+)_/);
        if (!wordIdMatch) {
          if (i < 5) console.log(`🔍 Line ${i} no wordId match in filename: ${csvFileName}`);
          continue;
        }

        const csvWordId = wordIdMatch[1];
        
        if (csvWordId === wordId && language === audioLangCode) {
          fileName = csvFileName;
          filePath = localPath;
          console.log(`✅ Found audio mapping (main): ${fileName} at ${filePath}`);
          break;
        }
        
        // Debug first few matches
        if (i < 5) {
          console.log(`🔍 Line ${i} check: csvWordId=${csvWordId}, wordId=${wordId}, language=${language}, audioLangCode=${audioLangCode}, match=${csvWordId === wordId && language === audioLangCode}`);
        }
      }
    } catch (error) {
      console.error('❌ Error reading CSV:', error);
    }

    if (!fileName || !filePath) {
      console.log(`❌ Audio file not found in CSV for wordId=${wordId}, language=${audioLangCode}`);
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode },
        { status: 404 }
      );
    }

    // Step 4: Download file using authenticated URL
    const authenticatedUrl = `${authData.downloadUrl}/file/voco-audio-library/${filePath}`;
    console.log(`🌐 Fetching authenticated audio: ${authenticatedUrl}`);
    
    const audioResponse = await fetch(authenticatedUrl, {
      headers: {
        'Authorization': downloadAuthData.authorizationToken
      }
    });

    if (!audioResponse.ok) {
      console.error(`❌ Authenticated download failed: ${audioResponse.status} ${audioResponse.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch audio from B2', status: audioResponse.status },
        { status: 502 }
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`🔑 Serving authenticated audio: ${fileName} (${audioBuffer.byteLength} bytes)`);

    // Determine content type based on file extension
    const contentType = fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*',
        'X-Audio-Source': 'b2-authenticated',
        'X-Audio-Auth': 'private-bucket',
      },
    });

  } catch (error) {
    console.error('❌ Authenticated Audio API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}