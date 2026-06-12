import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveAudioFile, fetchAudioFromB2, getAudioLanguageCode, B2CapExceededError } from '@/lib/audio/universal-audio-core';

// Universal Audio API - B2 Authenticated Access
// Fetches audio from private B2 bucket using API credentials
// Supports multiple B2 buckets (primary + secondary for new topics)
// CSV index + B2 auth caching live in lib/audio/universal-audio-core.ts,
// shared with /api/offline-audio-batch.

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    // Bulk offline downloads go through /api/offline-audio-batch; this limit
    // only needs to cover normal playback bursts.
    if (!checkRateLimit(ip, 600, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '10' } }
      );
    }

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

    const resolved = await resolveAudioFile(wordId, languageCode, word, targetWord);

    if (!resolved) {
      return NextResponse.json(
        { error: 'Audio file not found', wordId, languageCode: getAudioLanguageCode(languageCode) },
        { status: 404 }
      );
    }

    const audio = await fetchAudioFromB2(resolved.filePath, resolved.fileName);

    if (!audio) {
      return NextResponse.json(
        { error: 'Failed to fetch audio from B2' },
        { status: 502 }
      );
    }

    return new NextResponse(audio.buffer, {
      status: 200,
      headers: {
        'Content-Type': audio.contentType,
        'Content-Length': audio.buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${resolved.fileName}"`,
        'Access-Control-Allow-Origin': '*',
        'X-Audio-Source': audio.source,
      },
    });

  } catch (error) {
    if (error instanceof B2CapExceededError) {
      return NextResponse.json(
        { error: 'audio_unavailable', message: 'Audio storage download limit reached. Try again later.' },
        { status: 503, headers: { 'Retry-After': '3600' } }
      );
    }
    console.error('Audio API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
