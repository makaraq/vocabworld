import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient()
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    const targetLanguageCode = searchParams.get('targetLanguageCode')
    const sourceLanguageCode = searchParams.get('sourceLanguageCode')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!topicId || !targetLanguageCode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const { data: words, error: vocabError } = await supabase
      .from('vocabulary')
      .select('id, word_en, topic_id')
      .eq('topic_id', topicId)
      .order('learning_order', { ascending: true })

    if (vocabError) throw vocabError
    if (!words || words.length === 0) {
      return NextResponse.json({ cards: [] })
    }

    // Shuffle then take up to limit
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, limit)
    const vocabularyIds = shuffled.map((w) => w.id)

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

    const effSource = sourceLanguageCode || 'en'
    let sourceTranslations: Record<number, string> = {}
    if (effSource !== 'en') {
      const { data } = await supabase
        .from('vocabulary_translations')
        .select('vocabulary_id, translated_word')
        .in('vocabulary_id', vocabularyIds)
        .eq('language_code', effSource)
      if (data) {
        sourceTranslations = data.reduce((acc: Record<number, string>, item) => {
          acc[item.vocabulary_id] = item.translated_word
          return acc
        }, {})
      }
    }

    const cards = shuffled.map((w) => ({
      vocabularyId: w.id,
      targetWord:
        targetLanguageCode === 'en'
          ? w.word_en
          : targetTranslations[w.id] || w.word_en,
      sourceWord:
        effSource === 'en'
          ? w.word_en
          : sourceTranslations[w.id] || w.word_en,
      englishWord: w.word_en,
    }))

    return NextResponse.json({ cards })
  } catch (error: any) {
    console.error('Error fetching topic quiz cards:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz cards' }, { status: 500 })
  }
}
