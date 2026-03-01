/**
 * Playlist API - Manage user playlists and playlist words
 * 
 * GET /api/playlists - List user's playlists
 * POST /api/playlists - Create new playlist
 * GET /api/playlists/[id] - Get playlist with words
 * PUT /api/playlists/[id] - Update playlist (rename)
 * DELETE /api/playlists/[id] - Delete playlist
 * POST /api/playlists/[id]/words - Add word to playlist
 * DELETE /api/playlists/[id]/words/[wordId] - Remove word from playlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create authenticated Supabase client
async function getAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // For now, use service role key for server-side operations
  // In production, you'd want to use the user's session
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey)
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Get user ID from request (simplified - in production, use proper auth)
async function getUserId(request: NextRequest): Promise<string | null> {
  // Try to get from Authorization header or cookie
  const authHeader = request.headers.get('Authorization')
  const userId = request.headers.get('X-User-Id')
  
  if (userId) {
    return userId
  }
  
  // In production, decode JWT from cookie/header
  return null
}

// GET - List user's playlists
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const playlistId = searchParams.get('playlistId')
    const sourceLanguageCode = searchParams.get('sourceLanguageCode')
    const targetLanguageCode = searchParams.get('targetLanguageCode')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await getAuthenticatedClient()
    
    // If playlistId is provided, get single playlist with words
    if (playlistId) {
      // Get playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('user_playlists')
        .select('*')
        .eq('id', playlistId)
        .eq('user_id', userId)
        .single()
      
      if (playlistError || !playlist) {
        return NextResponse.json(
          { error: 'Playlist not found' },
          { status: 404 }
        )
      }
      
      // Get words in playlist with dictionary translations
      const { data: playlistWords, error: wordsError } = await supabase
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
      
      return NextResponse.json({
        playlist,
        words: playlistWords || []
      })
    }
    
    // Get all playlists for user with word counts (filtered by language pair if provided)
    let query = supabase
      .from('user_playlists')
      .select(`
        *,
        user_playlist_words(count)
      `)
      .eq('user_id', userId)
    
    // Filter by language pair if provided
    if (sourceLanguageCode) {
      query = query.eq('source_language_code', sourceLanguageCode)
    }
    if (targetLanguageCode) {
      query = query.eq('target_language_code', targetLanguageCode)
    }
    
    const { data: playlists, error } = await query.order('updated_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching playlists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch playlists' },
        { status: 500 }
      )
    }
    
    // Transform to include word_count from the joined count
    const playlistsWithCount = (playlists || []).map(p => ({
      ...p,
      word_count: p.user_playlist_words?.[0]?.count || 0
    }))
    
    return NextResponse.json({ playlists: playlistsWithCount })
    
  } catch (error) {
    console.error('Playlist GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new playlist or add word to playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, playlistId, word, translations, sourceLanguageCode, targetLanguageCode } = body
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await getAuthenticatedClient()
    
    // If playlistId and word provided, add word to playlist
    if (playlistId && word) {
      // First, ensure word exists in dictionary_words
      const normalizedWord = word.toLowerCase().trim()
      
      // Check if word exists in dictionary_words (using word_en column)
      const { data: existingWord, error: wordError } = await supabase
        .from('dictionary_words')
        .select('id')
        .eq('word_en', normalizedWord)
        .single()
      
      let dictionaryWordId: number
      
      if (!existingWord) {
        // Create new dictionary word entry
        const { data: newWord, error: insertError } = await supabase
          .from('dictionary_words')
          .insert({
            word_en: normalizedWord,
            translations: translations || {}
          })
          .select('id')
          .single()
        
        if (insertError) {
          // If duplicate (race condition), try to fetch the existing row
          if (insertError.code === '23505') {
            const { data: raceWord } = await supabase
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
        
        // Update translations if provided (merge with existing)
        if (translations && Object.keys(translations).length > 0) {
          // Get current translations first
          const { data: currentWord } = await supabase
            .from('dictionary_words')
            .select('translations')
            .eq('id', dictionaryWordId)
            .single()
          
          const mergedTranslations = {
            ...(currentWord?.translations || {}),
            ...translations
          }
          
          await supabase
            .from('dictionary_words')
            .update({ translations: mergedTranslations })
            .eq('id', dictionaryWordId)
        }
      }
      
      // Check if word already in playlist
      const { data: existingEntry } = await supabase
        .from('user_playlist_words')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('dictionary_word_id', dictionaryWordId)
        .single()
      
      if (existingEntry) {
        return NextResponse.json({ 
          success: true, 
          message: 'Word already in playlist',
          wordId: existingEntry.id
        })
      }
      
      // Add word to playlist (no 'word' column - only references dictionary_word_id)
      const { data: playlistWord, error: addError } = await supabase
        .from('user_playlist_words')
        .insert({
          playlist_id: playlistId,
          dictionary_word_id: dictionaryWordId
        })
        .select()
        .single()
      
      if (addError) {
        console.error('Error adding word to playlist:', addError)
        return NextResponse.json(
          { error: 'Failed to add word to playlist' },
          { status: 500 }
        )
      }
      
      // Update playlist word count
      await supabase.rpc('increment_playlist_word_count', { 
        playlist_id: playlistId 
      })
      
      return NextResponse.json({ 
        success: true, 
        wordId: playlistWord.id 
      })
    }
    
    // Create new playlist
    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name required' },
        { status: 400 }
      )
    }
    
    if (!sourceLanguageCode || !targetLanguageCode) {
      return NextResponse.json(
        { error: 'Source and target language codes required' },
        { status: 400 }
      )
    }
    
    const { data: playlist, error } = await supabase
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
      
      // Check for duplicate name error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A playlist with this name already exists for this language pair' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create playlist' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      playlist 
    })
    
  } catch (error) {
    console.error('Playlist POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update playlist (rename)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, playlistId, name } = body
    
    if (!userId || !playlistId || !name) {
      return NextResponse.json(
        { error: 'User ID, playlist ID, and name required' },
        { status: 400 }
      )
    }
    
    const supabase = await getAuthenticatedClient()
    
    const { data: playlist, error } = await supabase
      .from('user_playlists')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', playlistId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating playlist:', error)
      return NextResponse.json(
        { error: 'Failed to update playlist' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      playlist 
    })
    
  } catch (error) {
    console.error('Playlist PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete playlist or remove word from playlist
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const playlistId = searchParams.get('playlistId')
    const wordId = searchParams.get('wordId')
    
    if (!userId || !playlistId) {
      return NextResponse.json(
        { error: 'User ID and playlist ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await getAuthenticatedClient()
    
    // If wordId provided, remove word from playlist
    if (wordId) {
      const { error } = await supabase
        .from('user_playlist_words')
        .delete()
        .eq('id', wordId)
        .eq('playlist_id', playlistId)
      
      if (error) {
        console.error('Error removing word from playlist:', error)
        return NextResponse.json(
          { error: 'Failed to remove word' },
          { status: 500 }
        )
      }
      
      // Update playlist word count
      await supabase.rpc('decrement_playlist_word_count', { 
        playlist_id: playlistId 
      })
      
      return NextResponse.json({ success: true })
    }
    
    // Delete entire playlist (cascade will delete words)
    const { error } = await supabase
      .from('user_playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error deleting playlist:', error)
      return NextResponse.json(
        { error: 'Failed to delete playlist' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Playlist DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
