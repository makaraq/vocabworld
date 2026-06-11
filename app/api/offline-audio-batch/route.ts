import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveAudioFile, fetchAudioFromB2 } from '@/lib/audio/universal-audio-core';

// Bulk audio fetch for offline language-pack downloads.
// One request returns up to MAX_ITEMS clips (base64), so a full pack needs
// ~170 requests instead of ~8,300 individual /api/universal-audio calls.
//
// POST body: { items: [{ wordId, languageCode, word?, targetWord? }] }
// Response:  {
//   files:   { "lang:wordId": { b64, type } },  // found clips
//   missing: ["lang:wordId"],                   // no audio exists
//   skipped: [items]                            // not processed (size budget) — resend
// }

const MAX_ITEMS = 50;
const B2_CONCURRENCY = 10;
// Stay safely under serverless response-size limits (Vercel: 4.5MB).
// Base64 adds ~33%, so 3MB of audio ≈ 4MB of JSON.
const BYTE_BUDGET = 3 * 1024 * 1024;

interface BatchItem {
  wordId: string | number;
  languageCode: string;
  word?: string;
  targetWord?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    // Each call covers up to 50 files, so 120/min ≈ 6,000 files/min ceiling
    if (!checkRateLimit(`batch:${ip}`, 120, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '10' } }
      );
    }

    const body = await request.json().catch(() => null);
    const rawItems = body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    if (rawItems.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Max ${MAX_ITEMS} items per request` }, { status: 400 });
    }

    const items: BatchItem[] = rawItems
      .filter((it: any) => it && /^\d+$/.test(String(it.wordId)) && typeof it.languageCode === 'string' && it.languageCode.length <= 10)
      .map((it: any) => ({
        wordId: String(it.wordId),
        languageCode: it.languageCode,
        word: typeof it.word === 'string' ? it.word.slice(0, 200) : undefined,
        targetWord: typeof it.targetWord === 'string' ? it.targetWord.slice(0, 200) : undefined,
      }));

    const files: { [key: string]: { b64: string; type: string } } = {};
    const missing: string[] = [];
    const skipped: BatchItem[] = [];

    let bytesUsed = 0;
    let budgetExceeded = false;
    let index = 0;

    const worker = async () => {
      while (true) {
        const i = index++;
        const item = items[i];
        if (!item) return;
        if (budgetExceeded) {
          skipped.push(item);
          continue;
        }
        const key = `${item.languageCode}:${item.wordId}`;
        try {
          const resolved = await resolveAudioFile(String(item.wordId), item.languageCode, item.word, item.targetWord);
          if (!resolved) {
            missing.push(key);
            continue;
          }
          const audio = await fetchAudioFromB2(resolved.filePath, resolved.fileName);
          if (!audio || audio.buffer.byteLength === 0) {
            missing.push(key);
            continue;
          }
          if (bytesUsed + audio.buffer.byteLength > BYTE_BUDGET) {
            budgetExceeded = true;
            skipped.push(item);
            continue;
          }
          bytesUsed += audio.buffer.byteLength;
          files[key] = {
            b64: Buffer.from(audio.buffer).toString('base64'),
            type: audio.contentType,
          };
        } catch (e) {
          // Transient B2 failure — let the client retry this item
          skipped.push(item);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(B2_CONCURRENCY, items.length) }, () => worker()));

    return NextResponse.json({ files, missing, skipped });
  } catch (error) {
    console.error('Offline audio batch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
