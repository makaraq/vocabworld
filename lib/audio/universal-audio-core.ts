// Shared core for serving word audio from B2.
// Used by /api/universal-audio (single file) and /api/offline-audio-batch
// (bulk download for offline packs). Extracted verbatim from the
// universal-audio route so both endpoints resolve files identically.

import { promises as fs } from 'fs';
import path from 'path';

// ==================== CSV INDEX CACHING ====================
// CSVs total ~38MB. Without this cache, every audio request would refetch
// them over HTTP and linear-scan. We read from disk once and build O(1) maps.
interface CsvEntry { fileName: string; filePath: string; }
interface CsvIndices {
  mainById: Map<string, CsvEntry>;
  phrasesByWord: Map<string, CsvEntry>;
  verbsByWord: Map<string, CsvEntry>;
}

let csvIndexPromise: Promise<CsvIndices> | null = null;

function loadCsvIndices(): Promise<CsvIndices> {
  if (csvIndexPromise) return csvIndexPromise;

  csvIndexPromise = (async () => {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const lineRegex = /^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/;

    const readSafe = async (file: string) => {
      try {
        return await fs.readFile(path.join(dataDir, file), 'utf-8');
      } catch (e) {
        console.error(`[universal-audio] Failed to read ${file}:`, e);
        return '';
      }
    };

    const [mainCsv, phrasesCsv, verbsCsv] = await Promise.all([
      readSafe('backblaze-urls-20250909-180354.csv'),
      readSafe('common-phrases-b2-urls.csv'),
      readSafe('verb-b2-urls.csv'),
    ]);

    const mainById = new Map<string, CsvEntry>();
    const phrasesByWord = new Map<string, CsvEntry>();
    const verbsByWord = new Map<string, CsvEntry>();

    const mainLines = mainCsv.split('\n');
    for (let i = 1; i < mainLines.length; i++) {
      const line = mainLines[i];
      if (!line.trim()) continue;
      const match = line.match(lineRegex);
      if (!match) continue;
      const [, localPath, , language, , csvFileName] = match;
      const wordIdMatch = csvFileName.match(/alnilam_(\d+)_/);
      if (wordIdMatch) {
        mainById.set(`${language}::${wordIdMatch[1]}`, { fileName: csvFileName, filePath: localPath });
      }
    }

    const phrasesLines = phrasesCsv.split('\n');
    for (let i = 1; i < phrasesLines.length; i++) {
      const line = phrasesLines[i];
      if (!line.trim()) continue;
      const match = line.match(lineRegex);
      if (!match) continue;
      const [, localPath, , language, , csvFileName] = match;
      const fileNameWithoutExt = csvFileName.replace(/\.(wav|mp3)$/i, '').toLowerCase();
      phrasesByWord.set(`${language}::${fileNameWithoutExt}`, { fileName: csvFileName, filePath: localPath });
    }

    const verbsLines = verbsCsv.split('\n');
    for (let i = 1; i < verbsLines.length; i++) {
      const line = verbsLines[i];
      if (!line.trim()) continue;
      const match = line.match(lineRegex);
      if (!match) continue;
      const [, localPath, , language, , csvFileName] = match;
      const wordMatch = csvFileName.match(/alnilam_([^_]+)_\.wav/i);
      if (wordMatch) {
        verbsByWord.set(`${language}::${wordMatch[1].toLowerCase()}`, { fileName: csvFileName, filePath: localPath });
      }
    }

    return { mainById, phrasesByWord, verbsByWord };
  })();

  csvIndexPromise.catch(() => { csvIndexPromise = null; });
  return csvIndexPromise;
}
// ==================== END CSV INDEX CACHING ====================

// ==================== B2 AUTH CACHING ====================
// Cache B2 authorization tokens to avoid repeated auth calls
interface B2AuthCache {
  authData: any;
  downloadAuthToken: string;
  expiresAt: number;
}

let b2AuthCache: B2AuthCache | null = null;
let b2AuthCache2: B2AuthCache | null = null; // Second bucket for topics 43, 45

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

// Language code mapping
export function getAudioLanguageCode(langCode: string): string {
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
}

// Resolve a word's audio file via the CSV indices. Returns null when no
// audio exists for this word/language combination.
export async function resolveAudioFile(
  wordId: string,
  languageCode: string,
  word?: string | null,
  targetWord?: string | null,
): Promise<{ fileName: string; filePath: string } | null> {
  const audioLangCode = getAudioLanguageCode(languageCode);

  let fileName: string | null = null;
  let filePath: string | null = null;

  try {
    const indices = await loadCsvIndices();

    // ID-based lookup (main CSV - standard topics)
    const mainHit = indices.mainById.get(`${audioLangCode}::${wordId}`);
    if (mainHit) {
      fileName = mainHit.fileName;
      filePath = mainHit.filePath;
    }

    // Phrases CSV fallback (Common Phrases, Essential Words, Example Sentences)
    if (!fileName && !filePath) {
      const wordIdNum = parseInt(wordId);
      if (wordIdNum >= 4172 && word) {
        const sanitizeForMatch = (w: string) =>
          w.toLowerCase()
            .replace(/[^a-z0-9\s]+/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 60);

        const normalizedWord = sanitizeForMatch(word);
        const isNativeFilenameLanguage = ['cy', 'ga', 'mt'].includes(audioLangCode);
        const normalizedTargetWord = targetWord ? sanitizeForMatch(targetWord) : null;
        const matchWord = (isNativeFilenameLanguage && normalizedTargetWord) ? normalizedTargetWord : normalizedWord;

        const phrasesHit = indices.phrasesByWord.get(`${audioLangCode}::${matchWord}`);
        if (phrasesHit) {
          fileName = phrasesHit.fileName;
          filePath = phrasesHit.filePath;
        }
      }
    }

    // Verbs CSV fallback (word-based lookup)
    if (!fileName && !filePath && word) {
      const verbsHit = indices.verbsByWord.get(`${audioLangCode}::${word.toLowerCase().trim()}`);
      if (verbsHit) {
        fileName = verbsHit.fileName;
        filePath = verbsHit.filePath;
      }
    }
  } catch (error) {
    console.error('Error looking up CSV index:', error);
  }

  if (!fileName || !filePath) return null;
  return { fileName, filePath };
}

// Thrown when the B2 account's daily download cap (bandwidth or Class B
// transactions) is exhausted — callers should stop immediately rather than
// keep attempting downloads that will all fail until the cap resets.
export class B2CapExceededError extends Error {
  constructor() {
    super('B2 download cap exceeded')
    this.name = 'B2CapExceededError'
  }
}

// Download a resolved audio file from the appropriate B2 bucket.
export async function fetchAudioFromB2(
  filePath: string,
  fileName: string,
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  // Determine which bucket based on topic folder in file path
  const isSecondaryBucket = filePath.startsWith('EssentialWords/') || filePath.startsWith('ExampleSentences/');
  const bucketNumber: 1 | 2 = isSecondaryBucket ? 2 : 1;
  const bucketName = isSecondaryBucket ? 'voco-audio-library2' : 'voco-audio-library';

  // Get B2 auth for the appropriate bucket (cached)
  const b2Auth = await getB2Auth(bucketNumber);

  const authenticatedUrl = `${b2Auth.authData.downloadUrl}/file/${bucketName}/${filePath}`;
  const audioResponse = await fetch(authenticatedUrl, {
    headers: { 'Authorization': b2Auth.downloadAuthToken }
  });

  if (!audioResponse.ok) {
    if (audioResponse.status === 403) {
      const body = await audioResponse.text().catch(() => '');
      if (body.includes('cap_exceeded')) throw new B2CapExceededError();
    }
    return null;
  }

  const buffer = await audioResponse.arrayBuffer();
  const contentType = fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
  return { buffer, contentType };
}
