import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getApiUser } from '@/lib/auth/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Retrieve user's position in a topic
export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')
  const targetLanguageCode = searchParams.get('targetLanguageCode')

  if (!topicId || !targetLanguageCode) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('user_topic_position')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', parseInt(topicId))
      .eq('target_language_code', targetLanguageCode)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    return NextResponse.json({
      currentWordIndex: data?.current_word_index || 0,
      totalWords: data?.total_words || 0,
      lastAccessedAt: data?.last_accessed_at || null
    })
  } catch (error) {
    console.error('Error fetching topic position:', error)
    return NextResponse.json({ error: 'Failed to fetch position' }, { status: 500 })
  }
}

// POST: Save/update user's position in a topic
export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { topicId, targetLanguageCode, currentWordIndex, totalWords } = await request.json()
  const userId = user.id

  if (topicId === undefined || !targetLanguageCode || currentWordIndex === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('user_topic_position')
      .upsert({
        user_id: userId,
        topic_id: topicId,
        target_language_code: targetLanguageCode,
        current_word_index: currentWordIndex,
        total_words: totalWords || 0,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,topic_id,target_language_code'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving topic position:', error)
    return NextResponse.json({ error: 'Failed to save position' }, { status: 500 })
  }
}
