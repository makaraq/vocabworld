import { NextRequest, NextResponse } from 'next/server';

// 🚀 PERFORMANCE: In-memory cache for CSV files (persists across requests in same serverless instance)
const csvCache: { [key: string]: { data: Map<string, string>, timestamp: number } } = {};
const CSV_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials
export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Universal Audio API (B2 Authenticated) called'); 
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const languageCode = searchParams.get('languageCode');
    const word = searchParams.get('word'); // Optional: English word for Verbs topic lookup

    console.log(`🔑 Authenticated Audio Request:`, { wordId, languageCode, word });

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
      
      console.log(`🔍 Searching main CSV: ${lines.length} entries for wordId=${wordId}, language=${audioLangCode}, word=${word}`);
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
        
        // Pattern 1: alnilam_{id}_ (standard topics)
        const wordIdMatch = csvFileName.match(/alnilam_(\d+)_/);
        if (wordIdMatch) {
          const csvWordId = wordIdMatch[1];
          if (csvWordId === wordId && language === audioLangCode) {
            fileName = csvFileName;
            filePath = localPath;
            console.log(`✅ Found audio mapping (ID-based): ${fileName} at ${filePath}`);
            break;
          }
        }
        
        // Debug first few matches
        if (i < 5) {
          console.log(`🔍 Line ${i} check: filename=${csvFileName}, language=${language}, audioLangCode=${audioLangCode}`);
        }
      }
      
      // If not found by ID, try topic-specific CSV lookups
      if (!fileName && !filePath && wordId) {
        console.log(`🔍 Trying topic-specific CSV lookup for wordId: ${wordId}`);
        
        const wordIdNum = parseInt(wordId);
        
        // Try Common Phrases CSV (topic 42, IDs 4172-4965) with CACHING
        if (wordIdNum >= 4172 && wordIdNum <= 4965) {
          const phrasesCsvUrl = `${baseUrl}/data/common-phrases-b2-urls.csv`;
          const cacheKey = 'common-phrases-b2-urls';
          
          try {
            // Check cache first
            let phrasesMap: Map<string, string>;
            const now = Date.now();
            
            if (csvCache[cacheKey] && (now - csvCache[cacheKey].timestamp) < CSV_CACHE_TTL) {
              console.log(`🚀 Using cached Common Phrases CSV (${csvCache[cacheKey].data.size} entries)`);
              phrasesMap = csvCache[cacheKey].data;
            } else {
              console.log(`📥 Fetching and caching Common Phrases CSV...`);
              const phrasesCsvResponse = await fetch(phrasesCsvUrl);
              
              if (phrasesCsvResponse.ok) {
                const phrasesCsvContent = await phrasesCsvResponse.text();
                const phrasesLines = phrasesCsvContent.split('\n');
                
                // Build Map for O(1) lookups: "wordId_lang" -> "full_b2_url"
                phrasesMap = new Map();
                for (const line of phrasesLines) {
                  if (!line.trim()) continue;
                  const [csvVocabId, csvLang, csvUrl] = line.split(',');
                  if (csvVocabId && csvLang && csvUrl) {
                    phrasesMap.set(`${csvVocabId}_${csvLang}`, csvUrl);
                  }
                }
                
                // Cache for 5 minutes
                csvCache[cacheKey] = { data: phrasesMap, timestamp: now };
                console.log(`✅ Cached ${phrasesMap.size} Common Phrases entries`);
              } else {
                throw new Error(`CSV fetch failed: ${phrasesCsvResponse.status}`);
              }
            }
            
            // O(1) lookup instead of O(n) loop
            const lookupKey = `${wordIdNum}_${audioLangCode}`;
            const csvUrl = phrasesMap.get(lookupKey);
            
            if (csvUrl) {
              // Extract path from URL: https://f002.backblazeb2.com/file/voco-audio-library/CommonPhrases/cy/file.wav
              const urlMatch = csvUrl.match(/voco-audio-library\/(.+)$/);
              if (urlMatch) {
                filePath = urlMatch[1];
                fileName = filePath.split('/').pop();
                console.log(`✅ Found Common Phrases audio: ${fileName} at ${filePath}`);
              }
            } else {
              console.log(`⚠️ No audio found for wordId=${wordIdNum}, lang=${audioLangCode}`);
            }
          } catch (phrasesError) {
            console.log(`⚠️ Common Phrases CSV error:`, phrasesError);
          }
        }
        
        // Try Verbs CSV (word-based lookup)
        if (!fileName && !filePath && word) {
          const verbsCsvUrl = `${baseUrl}/data/verb-b2-urls.csv`;
          try {
            const verbsCsvResponse = await fetch(verbsCsvUrl);
            if (verbsCsvResponse.ok) {
              const verbsCsvContent = await verbsCsvResponse.text();
              const verbsLines = verbsCsvContent.split('\n');
              console.log(`🔍 Searching Verbs CSV: ${verbsLines.length} entries`);
              
              // Normalize the word for matching (lowercase, handle special chars)
              const normalizedWord = word.toLowerCase().trim();
              
              for (let i = 1; i < verbsLines.length; i++) {
                const line = verbsLines[i];
                if (!line.trim()) continue;
                
                const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
                if (!match) continue;
                
                const [, localPath, backblazeURL, language, category, csvFileName] = match;
                
                // Pattern: alnilam_{word}_.wav (word-based for verbs)
                // Also check if the word appears in the filename
                const wordMatch = csvFileName.match(/alnilam_([^_]+)_\.wav/i);
                if (wordMatch) {
                  const csvWord = wordMatch[1].toLowerCase();
                  if (csvWord === normalizedWord && language === audioLangCode) {
                    fileName = csvFileName;
                    filePath = localPath;
                    console.log(`✅ Found audio mapping (word-based): ${fileName} at ${filePath}`);
                    break;
                  }
                }
              }
            }
          } catch (verbsError) {
            console.log(`⚠️ Verbs CSV not found or error:`, verbsError);
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