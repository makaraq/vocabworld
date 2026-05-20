import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer()
  try {
    const { searchParams } = new URL(request.url)
    const vocabularyId = searchParams.get('vocabularyId')
    const targetLanguageCode = searchParams.get('targetLanguageCode')
    const count = parseInt(searchParams.get('count') || '3')

    if (!vocabularyId || !targetLanguageCode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const vocId = parseInt(vocabularyId)

    if (targetLanguageCode === 'en') {
      const { data: correctWord } = await supabase
        .from('vocabulary')
        .select('topic_id')
        .eq('id', vocId)
        .single()

      const topicId = correctWord?.topic_id

      let distractors: string[] = []

      if (topicId) {
        const { data: sameTopicWords } = await supabase
          .from('vocabulary')
          .select('word_en')
          .eq('topic_id', topicId)
          .neq('id', vocId)
          .limit(50)

        if (sameTopicWords && sameTopicWords.length >= count) {
          const shuffled = sameTopicWords.sort(() => Math.random() - 0.5)
          distractors = shuffled.slice(0, count).map(w => w.word_en)
        }
      }

      if (distractors.length < count) {
        const { data: anyWords } = await supabase
          .from('vocabulary')
          .select('word_en')
          .neq('id', vocId)
          .limit(50)

        if (anyWords) {
          const existing = new Set(distractors)
          const extras = anyWords
            .filter(w => !existing.has(w.word_en))
            .sort(() => Math.random() - 0.5)
          distractors.push(...extras.slice(0, count - distractors.length).map(w => w.word_en))
        }
      }

      return NextResponse.json({ distractors })
    }

    const { data: correctWord } = await supabase
      .from('vocabulary')
      .select('topic_id')
      .eq('id', vocId)
      .single()

    const topicId = correctWord?.topic_id

    let distractors: string[] = []

    if (topicId) {
      const { data: sameTopicVocab } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('topic_id', topicId)
        .neq('id', vocId)
        .limit(50)

      if (sameTopicVocab && sameTopicVocab.length > 0) {
        const ids = sameTopicVocab.map(v => v.id)
        const { data: translations } = await supabase
          .from('vocabulary_translations')
          .select('translated_word')
          .in('vocabulary_id', ids)
          .eq('language_code', targetLanguageCode)

        if (translations && translations.length >= count) {
          const shuffled = translations.sort(() => Math.random() - 0.5)
          distractors = shuffled.slice(0, count).map(t => t.translated_word)
        }
      }
    }

    if (distractors.length < count) {
      const { data: anyTranslations } = await supabase
        .from('vocabulary_translations')
        .select('translated_word')
        .eq('language_code', targetLanguageCode)
        .neq('vocabulary_id', vocId)
        .limit(50)

      if (anyTranslations) {
        const existing = new Set(distractors)
        const extras = anyTranslations
          .filter(t => !existing.has(t.translated_word))
          .sort(() => Math.random() - 0.5)
        distractors.push(
          ...extras.slice(0, count - distractors.length).map(t => t.translated_word)
        )
      }
    }

    return NextResponse.json({ distractors })
  } catch (error: any) {
    console.error('Error fetching distractors:', error)
    return NextResponse.json({ error: 'Failed to fetch distractors' }, { status: 500 })
  }
}
