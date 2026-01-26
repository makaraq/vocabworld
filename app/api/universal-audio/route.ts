import { NextRequest, NextResponse } from 'next/server';

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials

// ==================== CACHING LAYER ====================
// Cache B2 authorization tokens (valid for 24 hours)
interface B2AuthCache {
  authData: any;
  downloadAuthToken: string;
  expiresAt: number;
}

let b2AuthCache: B2AuthCache | null = null;

// Cache CSV content (parsed once and reused)
interface CSVCache {
  mainCSV: string[][];
  phrasesCSV: string[][] | null;
  verbsCSV: string[][] | null;
  lastUpdated: number;
}

let csvCache: CSVCache | null = null;
const CSV_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Helper to parse CSV line efficiently
function parseCSVLine(line: string): string[] | null {
  if (!line.trim()) return null;
  const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
  return match ? [match[1], match[2], match[3], match[4], match[5]] : null;
}

// Helper to get or refresh B2 auth
async function getB2Auth(): Promise<B2AuthCache> {
  const now = Date.now();
  
  // Return cached auth if still valid (expires in 50 minutes, B2 tokens last 1 hour)
  if (b2AuthCache && b2AuthCache.expiresAt > now) {
    console.log('✅ Using cached B2 authorization');
    return b2AuthCache;
  }

  console.log('🔐 Refreshing B2 authorization...');
  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!keyId || !applicationKey) {
    throw new Error('B2 credentials not configured');
  }

  // Step 1: Authorize with B2
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

  // Step 2: Get download authorization (covers all prefixes)
  const downloadAuthResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      'Authorization': authData.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bucketId: 'aa1d47dd5cca310593920d1c',
      fileNamePrefix: '', // Empty prefix = access to all files
      validDurationInSeconds: 3600
    })
  });

  if (!downloadAuthResponse.ok) {
    throw new Error('Download authorization failed');
  }

  const downloadAuthData = await downloadAuthResponse.json();

  // Cache for 50 minutes (tokens valid for 1 hour)
  b2AuthCache = {
    authData,
    downloadAuthToken: downloadAuthData.authorizationToken,
    expiresAt: now + (50 * 60 * 1000)
  };

  console.log('✅ B2 authorization refreshed and cached');
  return b2AuthCache;
}

// Helper to get or load CSV cache
async function getCSVCache(baseUrl: string): Promise<CSVCache> {
  const now = Date.now();
  
  // Return cached CSV if still valid
  if (csvCache && (now - csvCache.lastUpdated) < CSV_CACHE_TTL) {
    console.log('✅ Using cached CSV data');
    return csvCache;
  }

  console.log('🔍 Loading and caching CSV files...');
  
  // Load main CSV
  const mainCsvUrl = `${baseUrl}/data/backblaze-urls-20250909-180354.csv`;
  const mainResponse = await fetch(mainCsvUrl);
  if (!mainResponse.ok) {
    throw new Error(`Main CSV fetch failed: ${mainResponse.status}`);
  }
  const mainContent = await mainResponse.text();
  const mainLines = mainContent.split('\n');
  const mainCSV: string[][] = [];
  for (let i = 1; i < mainLines.length; i++) {
    const parsed = parseCSVLine(mainLines[i]);
    if (parsed) mainCSV.push(parsed);
  }

  // Load phrases CSV (optional)
  let phrasesCSV: string[][] | null = null;
  try {
    const phrasesCsvUrl = `${baseUrl}/data/common-phrases-b2-urls.csv`;
    const phrasesResponse = await fetch(phrasesCsvUrl);
    if (phrasesResponse.ok) {
      const phrasesContent = await phrasesResponse.text();
      const phrasesLines = phrasesContent.split('\n');
      phrasesCSV = [];
      for (let i = 1; i < phrasesLines.length; i++) {
        const parsed = parseCSVLine(phrasesLines[i]);
        if (parsed) phrasesCSV.push(parsed);
      }
    }
  } catch (e) {
    console.log('⚠️ Phrases CSV not available');
  }

  // Load verbs CSV (optional)
  let verbsCSV: string[][] | null = null;
  try {
    const verbsCsvUrl = `${baseUrl}/data/verb-b2-urls.csv`;
    const verbsResponse = await fetch(verbsCsvUrl);
    if (verbsResponse.ok) {
      const verbsContent = await verbsResponse.text();
      const verbsLines = verbsContent.split('\n');
      verbsCSV = [];
      for (let i = 1; i < verbsLines.length; i++) {
        const parsed = parseCSVLine(verbsLines[i]);
        if (parsed) verbsCSV.push(parsed);
      }
    }
  } catch (e) {
    console.log('⚠️ Verbs CSV not available');
  }

  csvCache = {
    mainCSV,
    phrasesCSV,
    verbsCSV,
    lastUpdated: now
  };

  console.log(`✅ CSV cache loaded: ${mainCSV.length} main entries, ${phrasesCSV?.length || 0} phrases, ${verbsCSV?.length || 0} verbs`);
  return csvCache;
}
// ==================== END CACHING LAYER ====================

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Universal Audio API (B2 Authenticated) called'); 
    const { searchParams } = new URL(request.url);
    
    // Regular B2 audio request
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');
    const word = searchParams.get('word'); // Optional: English word for Verbs topic lookup
    const targetWord = searchParams.get('targetWord'); // Optional: Target language word for cy/ga/mt Common Phrases lookup

    console.log(`🔑 Authenticated Audio Request:`, { wordId, languageCode, word, targetWord });

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
    console.log(`🔑 Language mapping:`, { original: languageCode, mapped: audioLangCode });

    // Get B2 authorization (from cache or fresh)
    const b2Auth = await getB2Auth();

    // Get CSV data (from cache or fresh)
    const baseUrl = request.url.split('/api/')[0];
    const csvData = await getCSVCache(baseUrl);

    // Find file URL from cached CSV data
    let fileName: string | null = null;
    let filePath: string | null = null;
    
    try {
      console.log(`🔍 Searching cached CSV for wordId=${wordId}, language=${audioLangCode}, word=${word}`);

      // Search main CSV (ID-based matching)
      for (const [localPath, backblazeURL, language, category, csvFileName] of csvData.mainCSV) {
        const wordIdMatch = csvFileName.match(/alnilam_(\d+)_/);
        if (wordIdMatch && wordIdMatch[1] === wordId && language === audioLangCode) {
          fileName = csvFileName;
          filePath = localPath;
          console.log(`✅ Found audio mapping (ID-based): ${fileName}`);
          break;
        }
      }
      
      // If not found by ID, try topic-specific CSV lookups
      if (!fileName && !filePath && wordId) {
        console.log(`🔍 Trying topic-specific CSV lookup for wordId: ${wordId}`);
        
        const wordIdNum = parseInt(wordId);
        
        // Try Daily Language CSV (topic 42, IDs 4172-4965) - uses word-based lookup
        if (wordIdNum >= 4172 && wordIdNum <= 4965 && word && csvData.phrasesCSV) {
          console.log(`🔍 Searching cached phrases CSV for word="${word}"`);
          
          const normalizedWord = word.toLowerCase().trim().replace(/\s+/g, '_');
          const isNativeFilenameLanguage = ['cy', 'ga', 'mt'].includes(audioLangCode);
          const normalizedTargetWord = targetWord ? targetWord.toLowerCase().trim().replace(/\s+/g, '_') : null;
          
          if (isNativeFilenameLanguage && normalizedTargetWord) {
            console.log(`🔍 Using targetWord for ${audioLangCode}: "${normalizedTargetWord}"`);
          }
          
          for (const [localPath, backblazeURL, language, category, csvFileName] of csvData.phrasesCSV) {
            const fileNameWithoutExt = csvFileName.replace('.wav', '').toLowerCase();
            const matchWord = (isNativeFilenameLanguage && normalizedTargetWord) 
              ? normalizedTargetWord 
              : normalizedWord;
            
            if (fileNameWithoutExt === matchWord && language === audioLangCode) {
              fileName = csvFileName;
              filePath = localPath;
              console.log(`✅ Found Daily Language audio: ${fileName}`);
              break;
            }
          }
        }
        
        // Try Verbs CSV (word-based lookup)
        if (!fileName && !filePath && word && csvData.verbsCSV) {
          console.log(`🔍 Searching cached verbs CSV`);
          const normalizedWord = word.toLowerCase().trim();
          
          for (const [localPath, backblazeURL, language, category, csvFileName] of csvData.verbsCSV) {
            const wordMatch = csvFileName.match(/alnilam_([^_]+)_\.wav/i);
            if (wordMatch) {
              const csvWord = wordMatch[1].toLowerCase();
              if (csvWord === normalizedWord && language === audioLangCode) {
                fileName = csvFileName;
                filePath = localPath;
                console.log(`✅ Found audio mapping (word-based): ${fileName}`);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error reading CSV:', error);
    }

    if (!fileName || !filePath) {
      console.log(`❌ Audio file not found in CSV for wordId=${wordId}, language=${audioLangCode}, word=${word}`);
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: audioLangCode },
        { status: 404 }
      );
    }

    // Download file using cached B2 authentication
    const authenticatedUrl = `${b2Auth.authData.downloadUrl}/file/voco-audio-library/${filePath}`;
    console.log(`🌐 Fetching authenticated audio from B2`);
    
    const audioResponse = await fetch(authenticatedUrl, {
      headers: {
        'Authorization': b2Auth.downloadAuthToken
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
    console.log(`✅ Serving audio: ${fileName} (${audioBuffer.byteLength} bytes)`);

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
        'X-Audio-Cached': b2AuthCache?.expiresAt ? 'true' : 'false',
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