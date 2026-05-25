/**
 * Playlist API - Manage user playlists and playlist words
 *
 * GET /api/playlists - List user's playlists
 * POST /api/playlists - Create new playlist or add word to playlist
 * PUT /api/playlists - Rename a playlist
 * DELETE /api/playlists - Delete playlist or remove word from playlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service-role client — used for data operations after auth is verified
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify the session cookie and return the authenticated user's ID.
// Returns null if the request is unauthenticated.
async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// GET - List user's playlists
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const playlistId = searchParams.get('playlistId')
    const sourceLanguageCode = searchParams.get('sourceLanguageCode')
    const targetLanguageCode = searchParams.get('targetLanguageCode')

    // If playlistId is provided, get single playlist with words
    if (playlistId) {
      const { data: playlist, error: playlistError } = await supabaseAdmin
        .from('user_playlists')
        .select('*')
        .eq('id', playlistId)
        .eq('user_id', userId)
        .single()

      if (playlistError || !playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
      }

      const { data: playlistWords, error: wordsError } = await supabaseAdmin
        .from('user_playlist_words')
        .select(`
          id,
          added_at,
          learned,
          practice_count,
          dictionary_words!inner(
            id,
            word_en,
            translations
          )
        `)
        .eq('playlist_id', playlistId)
        .order('added_at', { ascending: false })

      if (wordsError) {
        console.error('Error fetching playlist words:', wordsError)
      }

      // Resolve vocabulary IDs for B2 audio lookup
      const words = playlistWords || []
      const englishWords = words
        .map((pw: any) => pw.dictionary_words?.word_en)
        .filter(Boolean)

      if (englishWords.length > 0) {
        const { data: vocabRows } = await supabaseAdmin
          .from('vocabulary')
          .select('id, word_en')
          .in('word_en', englishWords)

        if (vocabRows) {
          const vocabMap = new Map(vocabRows.map((v: any) => [v.word_en, v.id]))
          for (const pw of words as any[]) {
            if (pw.dictionary_words?.word_en) {
              pw.dictionary_words.vocabulary_id = vocabMap.get(pw.dictionary_words.word_en) || null
            }
          }
        }
      }

      return NextResponse.json({ playlist, words })
    }

    // Get all playlists for user with word counts (filtered by language pair if provided)
    let query = supabaseAdmin
      .from('user_playlists')
      .select(`*, user_playlist_words(count)`)
      .eq('user_id', userId)

    if (sourceLanguageCode) query = query.eq('source_language_code', sourceLanguageCode)
    if (targetLanguageCode) query = query.eq('target_language_code', targetLanguageCode)

    const { data: playlists, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching playlists:', error)
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
    }

    const playlistsWithCount = (playlists || []).map(p => ({
      ...p,
      word_count: p.user_playlist_words?.[0]?.count || 0
    }))

    return NextResponse.json({ playlists: playlistsWithCount })

  } catch (error) {
    console.error('Playlist GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new playlist or add word to playlist
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, playlistId, word, translations, sourceLanguageCode, targetLanguageCode } = body

    // If playlistId and word provided, add word to playlist
    if (playlistId && word) {
      // Verify the playlist belongs to this user before adding a word
      const { data: playlistCheck } = await supabaseAdmin
        .from('user_playlists')
        .select('id')
        .eq('id', playlistId)
        .eq('user_id', userId)
        .single()

      if (!playlistCheck) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
      }

      const normalizedWord = word.toLowerCase().trim()

      const { data: existingWord } = await supabaseAdmin
        .from('dictionary_words')
        .select('id')
        .eq('word_en', normalizedWord)
        .single()

      let dictionaryWordId: number

      if (!existingWord) {
        const { data: newWord, error: insertError } = await supabaseAdmin
          .from('dictionary_words')
          .insert({ word_en: normalizedWord, translations: translations || {} })
          .select('id')
          .single()

        if (insertError) {
          if (insertError.code === '23505') {
            const { data: raceWord } = await supabaseAdmin
              .from('dictionary_words')
              .select('id')
              .eq('word_en', normalizedWord)
              .single()
            if (raceWord) {
              dictionaryWordId = raceWord.id
            } else {
              console.error('Error creating dictionary word:', insertError)
              return NextResponse.json({ error: 'Failed to add word' }, { status: 500 })
            }
          } else {
            console.error('Error creating dictionary word:', insertError)
            return NextResponse.json({ error: 'Failed to add word' }, { status: 500 })
          }
        } else if (!newWord) {
          return NextResponse.json({ error: 'Failed to add word' }, { status: 500 })
        } else {
          dictionaryWordId = newWord.id
        }
      } else {
        dictionaryWordId = existingWord.id

        if (translations && Object.keys(translations).length > 0) {
          const { data: currentWord } = await supabaseAdmin
            .from('dictionary_words')
            .select('translations')
            .eq('id', dictionaryWordId)
            .single()

          await supabaseAdmin
            .from('dictionary_words')
            .update({ translations: { ...(currentWord?.translations || {}), ...translations } })
            .eq('id', dictionaryWordId)
        }
      }

      const { data: existingEntry } = await supabaseAdmin
        .from('user_playlist_words')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('dictionary_word_id', dictionaryWordId)
        .single()

      if (existingEntry) {
        return NextResponse.json({ success: true, message: 'Word already in playlist', wordId: existingEntry.id })
      }

      const { data: playlistWord, error: addError } = await supabaseAdmin
        .from('user_playlist_words')
        .insert({ playlist_id: playlistId, dictionary_word_id: dictionaryWordId })
        .select()
        .single()

      if (addError) {
        console.error('Error adding word to playlist:', addError)
        return NextResponse.json({ error: 'Failed to add word to playlist' }, { status: 500 })
      }

      await supabaseAdmin.rpc('increment_playlist_word_count', { playlist_id: playlistId })

      return NextResponse.json({ success: true, wordId: playlistWord.id })
    }

    // Create new playlist
    if (!name) {
      return NextResponse.json({ error: 'Playlist name required' }, { status: 400 })
    }

    if (!sourceLanguageCode || !targetLanguageCode) {
      return NextResponse.json(
        { error: 'Source and target language codes required' },
        { status: 400 }
      )
    }

    const { data: playlist, error } = await supabaseAdmin
      .from('user_playlists')
      .insert({
        user_id: userId,
        name: name.trim(),
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A playlist with this name already exists for this language pair' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, playlist })

  } catch (error) {
    console.error('Playlist POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update playlist (rename)
export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playlistId, name } = body

    if (!playlistId || !name) {
      return NextResponse.json({ error: 'Playlist ID and name required' }, { status: 400 })
    }

    const { data: playlist, error } = await supabaseAdmin
      .from('user_playlists')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', playlistId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating playlist:', error)
      return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, playlist })

  } catch (error) {
    console.error('Playlist PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete playlist or remove word from playlist
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const playlistId = searchParams.get('playlistId')
    const wordId = searchParams.get('wordId')

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 })
    }

    // Verify playlist ownership before any mutation
    const { data: playlistCheck } = await supabaseAdmin
      .from('user_playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', userId)
      .single()

    if (!playlistCheck) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (wordId) {
      const { error } = await supabaseAdmin
        .from('user_playlist_words')
        .delete()
        .eq('id', wordId)
        .eq('playlist_id', playlistId)

      if (error) {
        console.error('Error removing word from playlist:', error)
        return NextResponse.json({ error: 'Failed to remove word' }, { status: 500 })
      }

      await supabaseAdmin.rpc('decrement_playlist_word_count', { playlist_id: playlistId })

      return NextResponse.json({ success: true })
    }

    // Delete entire playlist (cascade will delete words)
    const { error } = await supabaseAdmin
      .from('user_playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting playlist:', error)
      return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Playlist DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
