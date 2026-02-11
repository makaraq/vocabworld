import { NextRequest, NextResponse } from 'next/server';

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials
// Supports multiple B2 buckets (primary + secondary for new topics)

// ==================== B2 AUTH CACHING ====================
// Cache B2 authorization tokens to avoid repeated auth calls
interface B2AuthCache {
  authData: any;
  downloadAuthToken: string;
  expiresAt: number;
}

let b2AuthCache: B2AuthCache | null = null;
let b2AuthCache2: B2AuthCache | null = null; // Second bucket for topics 43-44

async function getB2Auth(bucketNumber: 1 | 2 = 1): Promise<B2AuthCache> {
  const now = Date.now();
  
  const cache = bucketNumber === 1 ? b2AuthCache : b2AuthCache2;
  
  // Return cached auth if still valid (expires in 50 minutes, B2 tokens last 1 hour)
  if (cache && cache.expiresAt > now) {
    return cache;
  }

  const keyId = bucketNumber === 1 
    ? process.env.B2_APPLICATION_KEY_ID 
    : process.env.B2_APPLICATION_KEY_ID_2;
  const applicationKey = bucketNumber === 1 
    ? process.env.B2_APPLICATION_KEY 
    : process.env.B2_APPLICATION_KEY_2;
  const bucketId = bucketNumber === 1
    ? 'aa1d47dd5cca310593920d1c'
    : '47389e8c43de41aa9dc10016';

  if (!keyId || !applicationKey) {
    throw new Error(`B2 bucket ${bucketNumber} credentials not configured`);
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
      bucketId: bucketId,
      fileNamePrefix: '',
      validDurationInSeconds: 3600
    })
  });

  if (!downloadAuthResponse.ok) {
    throw new Error('Download authorization failed');
  }

  const downloadAuthData = await downloadAuthResponse.json();

  // Cache for 50 minutes
  const newCache: B2AuthCache = {
    authData,
    downloadAuthToken: downloadAuthData.authorizationToken,
    expiresAt: now + (50 * 60 * 1000)
  };

  if (bucketNumber === 1) {
    b2AuthCache = newCache;
  } else {
    b2AuthCache2 = newCache;
  }

  return newCache;
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
      
      // If not found, try phrases CSV (Common Phrases, Essential Words, Bad Words)
      if (!fileName && !filePath) {
        const wordIdNum = parseInt(wordId);
        
        // Topics 42-44: Common Phrases (4172-4965), Essential Words (5689-6077), Bad Words (6021-6060)
        if (wordIdNum >= 4172 && word) {
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

    // Determine which bucket based on topic folder in file path
    const isSecondaryBucket = filePath.startsWith('BadWords/') || filePath.startsWith('EssentialWords/');
    const bucketNumber: 1 | 2 = isSecondaryBucket ? 2 : 1;
    const bucketName = isSecondaryBucket ? 'voco-audio-library2' : 'voco-audio-library';

    // Get B2 auth for the appropriate bucket (cached)
    const b2Auth = await getB2Auth(bucketNumber);

    // Download and stream audio from B2
    const authenticatedUrl = `${b2Auth.authData.downloadUrl}/file/${bucketName}/${filePath}`;
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