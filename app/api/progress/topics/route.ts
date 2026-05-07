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
    return NextResponse.json({ completedTopicIds })

  } catch (error) {
    console.error('Error in topics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getDetailedTopicProgress(userId: string, languageCode: string) {
  try {
    
    // Get all topics with their word counts
    const { data: allTopics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name')

    if (topicsError) {
      console.error('❌ Error fetching topics:', topicsError)
      return NextResponse.json({ error: 'Failed to fetch topics', details: topicsError.message }, { status: 500 })
    }

    
    // Sort topics by ID (simplest approach that works in serverless)
    const topics = allTopics?.sort((a, b) => a.id - b.id) || []

    if (topics?.length > 0) {
    }

    // Get progress for each topic
    const topicProgress = await Promise.all(
      topics.map(async (topic) => {
        // Get topic completion data (this is the correct table)
        const { data: topicData, error: topicError } = await supabase
          .from('user_topic_completion')
          .select('*')
          .eq('user_id', userId)
          .eq('topic_id', topic.id)
          .eq('target_language_code', languageCode)
          .single()

        if (topicError && topicError.code !== 'PGRST116') {
          console.error(`❌ Error fetching topic completion for topic ${topic.id}:`, topicError)
        }

        // If no progress record exists, get total words count and return default
        if (!topicData) {
          // Get total word count for this topic in the target language
          const { count: totalWords, error: countError } = await supabase
            .from('vocabulary')
            .select(`
              id,
              vocabulary_translations!inner (
                id,
                language_code
              )
            `, { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('vocabulary_translations.language_code', languageCode)

          return {
            topicId: topic.id,
            topicName: topic.name,
            totalWords: totalWords || 0,
            learnedWords: 0,
            completionPercentage: 0,
            isCompleted: false
          }
        }

        // Use data from user_topic_completion table
        const completionPercentage = topicData.total_words > 0 ? (topicData.words_learned / topicData.total_words) * 100 : 0
        

        return {
          topicId: topic.id,
          topicName: topic.name,
          totalWords: topicData.total_words,
          learnedWords: topicData.words_learned,
          completionPercentage,
          isCompleted: topicData.is_completed
        }
      })
    )

    return NextResponse.json({
      topics: topicProgress,
      languageCode,
      languageName: getLanguageName(languageCode)
    })

  } catch (error) {
    console.error('❌ Error fetching detailed topic progress:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to fetch topic progress',
      details: error instanceof Error ? error.message : String(error)
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
