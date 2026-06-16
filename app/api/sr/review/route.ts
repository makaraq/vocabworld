import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getApiUser } from '@/lib/auth/api-auth'
import { schedule, Rating, State, type SRCard } from '@/lib/sr/fsrs'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
    const { cardId, rating, targetLanguageCode } = await request.json()

    if (!cardId || !rating || !targetLanguageCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (rating !== Rating.Again && rating !== Rating.Good) {
      return NextResponse.json({ error: 'Invalid rating (must be 1 or 3)' }, { status: 400 })
    }

    const { data: cardRow, error: fetchError } = await supabase
      .from('user_sr_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !cardRow) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const card: SRCard = {
      state: cardRow.state as State,
      difficulty: cardRow.difficulty,
      stability: cardRow.stability,
      due: new Date(cardRow.due),
      lastReview: cardRow.last_review ? new Date(cardRow.last_review) : null,
      reps: cardRow.reps,
      lapses: cardRow.lapses,
    }

    const now = new Date()
    const updated = schedule(card, rating, now)

    const { error: updateError } = await supabase
      .from('user_sr_cards')
      .update({
        state: updated.state,
        difficulty: updated.difficulty,
        stability: updated.stability,
        due: updated.due.toISOString(),
        last_review: updated.lastReview?.toISOString() || now.toISOString(),
        reps: updated.reps,
        lapses: updated.lapses,
      })
      .eq('id', cardId)

    if (updateError) throw updateError

    const today = now.toISOString().split('T')[0]
    const { error: dailyError } = await supabase
      .from('user_daily_progress')
      .upsert(
        {
          user_id: userId,
          target_language_code: targetLanguageCode,
          activity_date: today,
          words_reviewed_count: 1,
        },
        { onConflict: 'user_id,target_language_code,activity_date' }
      )

    if (dailyError) {
      const { error: incrementError } = await supabase.rpc('increment_daily_reviews', {
        p_user_id: userId,
        p_language_code: targetLanguageCode,
        p_date: today,
      })
      if (incrementError) {
        console.error('Failed to update daily progress:', incrementError)
      }
    }

    return NextResponse.json({
      success: true,
      nextDue: updated.due.toISOString(),
      state: updated.state,
    })
  } catch (error: any) {
    console.error('Error processing review:', error)
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 })
  }
}
