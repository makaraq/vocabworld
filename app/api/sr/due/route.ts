import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { getApiUser } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer()
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const targetLanguageCode = searchParams.get('targetLanguageCode')
    const sourceLanguageCode = searchParams.get('sourceLanguageCode')
    const countOnly = searchParams.get('countOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!targetLanguageCode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (countOnly) {
      const [dueResult, totalResult] = await Promise.all([
        supabase
          .from('user_sr_cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('target_language_code', targetLanguageCode)
          .lte('due', new Date().toISOString()),
        supabase
          .from('user_sr_cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('target_language_code', targetLanguageCode),
      ])

      if (dueResult.error) throw dueResult.error
      return NextResponse.json({ totalDue: dueResult.count || 0, totalCards: totalResult.count || 0 })
    }

    const { data: cards, error: cardsError } = await supabase
      .from('user_sr_cards')
      .select('id, vocabulary_id, state, difficulty, stability, reps, lapses')
      .eq('user_id', userId)
      .eq('target_language_code', targetLanguageCode)
      .lte('due', new Date().toISOString())
      .order('due', { ascending: true })
      .limit(limit)

    if (cardsError) throw cardsError
    if (!cards || cards.length === 0) {
      return NextResponse.json({ cards: [], totalDue: 0 })
    }

    const vocabularyIds = cards.map(c => c.vocabulary_id)

    const { data: vocabData, error: vocabError } = await supabase
      .from('vocabulary')
      .select('id, word_en, topic_id, difficulty_level')
      .in('id', vocabularyIds)

    if (vocabError) throw vocabError

    let targetTranslations: Record<number, string> = {}
    if (targetLanguageCode !== 'en') {
      const { data } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, translated_word')
        .in('vocabulary_id', vocabularyIds)
        .eq('language_code', targetLanguageCode)

      if (data) {
        targetTranslations = data.reduce((acc: Record<number, string>, item) => {
          acc[item.vocabulary_id] = item.translated_word
          return acc
        }, {})
      }
    }

    let sourceTranslations: Record<number, string> = {}
    if (sourceLanguageCode && sourceLanguageCode !== 'en') {
      const { data } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, translated_word')
        .in('vocabulary_id', vocabularyIds)
        .eq('language_code', sourceLanguageCode)

      if (data) {
        sourceTranslations = data.reduce((acc: Record<number, string>, item) => {
          acc[item.vocabulary_id] = item.translated_word
          return acc
        }, {})
      }
    }

    const vocabMap = new Map(vocabData?.map(v => [v.id, v]) || [])

    const { count: totalDue } = await supabase
      .from('user_sr_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_language_code', targetLanguageCode)
      .lte('due', new Date().toISOString())

    const enrichedCards = cards.map(card => {
      const vocab = vocabMap.get(card.vocabulary_id)
      const targetWord = targetLanguageCode === 'en'
        ? vocab?.word_en || ''
        : targetTranslations[card.vocabulary_id] || vocab?.word_en || ''
      const sourceWord = !sourceLanguageCode || sourceLanguageCode === 'en'
        ? vocab?.word_en || ''
        : sourceTranslations[card.vocabulary_id] || vocab?.word_en || ''

      return {
        cardId: card.id,
        vocabularyId: card.vocabulary_id,
        targetWord,
        sourceWord,
        englishWord: vocab?.word_en || '',
        topicId: vocab?.topic_id,
        state: card.state,
      }
    })

    return NextResponse.json({ cards: enrichedCards, totalDue: totalDue || cards.length })
  } catch (error: any) {
    console.error('Error fetching due SR cards:', error)
    return NextResponse.json({ error: 'Failed to fetch due cards' }, { status: 500 })
  }
}
