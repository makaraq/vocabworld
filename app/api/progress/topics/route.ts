import { NextRequest, NextResponse } from 'next/server'
import { progressService } from '@/lib/progress/progress-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetLanguageCode = searchParams.get('targetLanguageCode')
    const languageCode = searchParams.get('languageCode')
    const detailed = searchParams.get('detailed')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // If requesting detailed progress for modal
    if (detailed === 'true' && languageCode) {
      return await getDetailedTopicProgress(userId, languageCode)
    }

    // Original functionality for completed topics
    if (!targetLanguageCode) {
      return NextResponse.json({ error: 'Missing targetLanguageCode' }, { status: 400 })
    }

    const completedTopicIds = await progressService.getCompletedTopicIds(userId, targetLanguageCode)
    const topicCompletionCounts = await progressService.getTopicCompletionCounts(userId, targetLanguageCode)
    return NextResponse.json({ completedTopicIds, topicCompletionCounts })

  } catch (error) {
    console.error('Error in topics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getDetailedTopicProgress(userId: string, languageCode: string) {
  try {
    // Batch: fetch topics, completion records, and word counts in parallel
    const [topicsRes, completionRes, wordCountsRes] = await Promise.all([
      supabase.from('topics').select('id, name'),
      supabase
        .from('user_topic_completion')
        .select('topic_id, total_words, words_learned, is_completed')
        .eq('user_id', userId)
        .eq('target_language_code', languageCode),
      supabase.rpc('get_topic_word_counts', { lang_code: languageCode }).maybeSingle(),
    ])

    if (topicsRes.error) {
      return NextResponse.json({ error: 'Failed to fetch topics', details: topicsRes.error.message }, { status: 500 })
    }

    const topics = (topicsRes.data || []).sort((a, b) => a.id - b.id)

    const completionMap = new Map<number, { total_words: number; words_learned: number; is_completed: boolean }>()
    for (const row of completionRes.data || []) {
      completionMap.set(row.topic_id, row)
    }

    // Word counts from RPC or fallback to a single grouped query
    let wordCountMap = new Map<number, number>()
    if (wordCountsRes.data) {
      for (const row of Array.isArray(wordCountsRes.data) ? wordCountsRes.data : []) {
        wordCountMap.set(row.topic_id, row.cnt)
      }
    }

    // For topics without completion records and no RPC counts, do a single batch query
    const missingIds = topics
      .filter(t => !completionMap.has(t.id) && !wordCountMap.has(t.id))
      .map(t => t.id)

    if (missingIds.length > 0) {
      const { data: vocabRows } = await supabase
        .from('vocabulary')
        .select('topic_id')
        .in('topic_id', missingIds)

      if (vocabRows) {
        const counts = new Map<number, number>()
        for (const row of vocabRows) {
          counts.set(row.topic_id, (counts.get(row.topic_id) || 0) + 1)
        }
        for (const [id, cnt] of counts) {
          wordCountMap.set(id, cnt)
        }
      }
    }

    const topicProgress = topics.map((topic) => {
      const completion = completionMap.get(topic.id)
      if (completion) {
        const pct = completion.total_words > 0 ? (completion.words_learned / completion.total_words) * 100 : 0
        return {
          topicId: topic.id,
          topicName: topic.name,
          totalWords: completion.total_words,
          learnedWords: completion.words_learned,
          completionPercentage: pct,
          isCompleted: completion.is_completed,
        }
      }
      return {
        topicId: topic.id,
        topicName: topic.name,
        totalWords: wordCountMap.get(topic.id) || 0,
        learnedWords: 0,
        completionPercentage: 0,
        isCompleted: false,
      }
    })

    return NextResponse.json({
      topics: topicProgress,
      languageCode,
      languageName: getLanguageName(languageCode),
    })
  } catch (error) {
    console.error('❌ Error fetching detailed topic progress:', error)
    return NextResponse.json({
      error: 'Failed to fetch topic progress',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

// Helper function to get language name from code
function getLanguageName(code: string): string {
  const languageMap: { [key: string]: string } = {
    'ar': 'Arabic', 'bg': 'Bulgarian', 'bn': 'Bengali', 'ca': 'Catalan',
    'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish', 'de': 'German',
    'el': 'Greek', 'en': 'English', 'es': 'Spanish', 'et': 'Estonian',
    'eu': 'Basque', 'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French',
    'ga': 'Irish', 'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi',
    'hr': 'Croatian', 'hu': 'Hungarian', 'id': 'Indonesian', 'is': 'Icelandic',
    'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'lt': 'Lithuanian',
    'lv': 'Latvian', 'mk': 'Macedonian', 'ml': 'Malayalam', 'mr': 'Marathi',
    'mt': 'Maltese', 'nl': 'Dutch', 'no': 'Norwegian', 'pl': 'Polish',
    'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'sk': 'Slovak',
    'sl': 'Slovenian', 'sv': 'Swedish', 'ta': 'Tamil', 'te': 'Telugu',
    'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu',
    'vi': 'Vietnamese', 'zh': 'Chinese'
  }
  return languageMap[code] || code.toUpperCase()
}
