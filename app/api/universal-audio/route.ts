import { NextRequest, NextResponse } from 'next/server';

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials

// ==================== B2 AUTH CACHING ====================
// Cache B2 authorization tokens to avoid repeated auth calls
interface B2AuthCache {
  authData: any;
  downloadAuthToken: string;
  expiresAt: number;
}

let b2AuthCache: B2AuthCache | null = null;

async function getB2Auth(): Promise<B2AuthCache> {
  const now = Date.now();
  
  // Return cached auth if still valid (expires in 50 minutes, B2 tokens last 1 hour)
  if (b2AuthCache && b2AuthCache.expiresAt > now) {
    return b2AuthCache;
  }

  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!keyId || !applicationKey) {
    throw new Error('B2 credentials not configured');
  }

  // Authorize with B2
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${keyId}:${applicationKey}`).toString('base64')
    }
  });

  if (!authResponse.ok) {
    throw new Error('B2 authorization failed');
  }

  const authData = await authResponse.json();

  // Get download authorization (empty prefix = access to all files)
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
    throw new Error('Download authorization failed');
  }

  const downloadAuthData = await downloadAuthResponse.json();

  // Cache for 50 minutes
  b2AuthCache = {
    authData,
    downloadAuthToken: downloadAuthData.authorizationToken,
    expiresAt: now + (50 * 60 * 1000)
  };

  return b2AuthCache;
}
// ==================== END B2 AUTH CACHING ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');
    const word = searchParams.get('word');
    const targetWord = searchParams.get('targetWord');

    if (!wordId || !languageCode) {
      return NextResponse.json(
        { error: 'Missing required parameters: wordId and languageCode' },
        { status: 400 }
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

    // Get B2 auth (cached)
    const b2Auth = await getB2Auth();

    // Find file path using streaming CSV search (fast, low memory)
    const baseUrl = request.url.split('/api/')[0];
    let fileName: string | null = null;
    let filePath: string | null = null;
    
    try {
      // Try main CSV first (ID-based lookup for standard topics)
      const csvUrl = `${baseUrl}/data/backblaze-urls-20250909-180354.csv`;
      const csvResponse = await fetch(csvUrl);
      
      if (csvResponse.ok) {
        const csvContent = await csvResponse.text();
        const lines = csvContent.split('\n');
        
        // Fast search - stop as soon as we find a match
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
          if (!match) continue;
          
          const [, localPath, , language, , csvFileName] = match;
          
          // ID-based matching (alnilam_{id}_)
          const wordIdMatch = csvFileName.match(/alnilam_(\d+)_/);
          if (wordIdMatch && wordIdMatch[1] === wordId && language === audioLangCode) {
            fileName = csvFileName;
            filePath = localPath;
            break;
          }
        }
      }
      
      // If not found and it's Daily Language topic, try phrases CSV
      if (!fileName && !filePath) {
        const wordIdNum = parseInt(wordId);
        
        if (wordIdNum >= 4172 && wordIdNum <= 4965 && word) {
          const phrasesCsvUrl = `${baseUrl}/data/common-phrases-b2-urls.csv`;
          const phrasesCsvResponse = await fetch(phrasesCsvUrl);
          
          if (phrasesCsvResponse.ok) {
            const phrasesCsvContent = await phrasesCsvResponse.text();
            const phrasesLines = phrasesCsvContent.split('\n');
            
            const normalizedWord = word.toLowerCase().trim().replace(/\s+/g, '_');
            const isNativeFilenameLanguage = ['cy', 'ga', 'mt'].includes(audioLangCode);
            const normalizedTargetWord = targetWord ? targetWord.toLowerCase().trim().replace(/\s+/g, '_') : null;
            const matchWord = (isNativeFilenameLanguage && normalizedTargetWord) ? normalizedTargetWord : normalizedWord;
            
            for (let i = 1; i < phrasesLines.length; i++) {
              const line = phrasesLines[i];
              if (!line.trim()) continue;
              
              const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
              if (!match) continue;
              
              const [, localPath, , language, , csvFileName] = match;
              const fileNameWithoutExt = csvFileName.replace('.wav', '').toLowerCase();
              
              if (fileNameWithoutExt === matchWord && language === audioLangCode) {
                fileName = csvFileName;
                filePath = localPath;
                break;
              }
            }
          }
        }
        
        // Try verbs CSV for word-based lookup
        if (!fileName && !filePath && word) {
          const verbsCsvUrl = `${baseUrl}/data/verb-b2-urls.csv`;
          const verbsCsvResponse = await fetch(verbsCsvUrl);
          
          if (verbsCsvResponse.ok) {
            const verbsCsvContent = await verbsCsvResponse.text();
            const verbsLines = verbsCsvContent.split('\n');
            const normalizedWord = word.toLowerCase().trim();
            
            for (let i = 1; i < verbsLines.length; i++) {
              const line = verbsLines[i];
              if (!line.trim()) continue;
              
              const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
              if (!match) continue;
              
              const [, localPath, , language, , csvFileName] = match;
              const wordMatch = csvFileName.match(/alnilam_([^_]+)_\.wav/i);
              
              if (wordMatch && wordMatch[1].toLowerCase() === normalizedWord && language === audioLangCode) {
                fileName = csvFileName;
                filePath = localPath;
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching CSV:', error);
    }

    if (!fileName || !filePath) {
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode },
        { status: 404 }
      );
    }

    // Download and stream audio from B2
    const authenticatedUrl = `${b2Auth.authData.downloadUrl}/file/voco-audio-library/${filePath}`;
    const audioResponse = await fetch(authenticatedUrl, {
      headers: { 'Authorization': b2Auth.downloadAuthToken }
    });

    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch audio from B2', status: audioResponse.status },
        { status: 502 }
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const contentType = fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Audio API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}