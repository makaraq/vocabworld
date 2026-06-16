import { NextRequest, NextResponse } from 'next/server'
import { progressService } from '@/lib/progress/progress-service'
import { getApiUser } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id
  const { vocabularyId, targetLanguageCode } = await request.json()
  if (!vocabularyId || !targetLanguageCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const result = await progressService.trackWordPlayed(userId, vocabularyId, targetLanguageCode)

  if (!result.isNewWord) {
    await progressService.updateCompletionCountForWord(userId, vocabularyId, targetLanguageCode)
  }

  // After tracking, get updated completed topics
  const completedTopics = await progressService.getAllTopicProgress(userId, targetLanguageCode)
  const completedTopicIds = Array.from(completedTopics.entries())
    .filter(([_, progress]) => progress.isCompleted)
    .map(([topicId]) => topicId)

  const topicCompletionCounts = await progressService.getTopicCompletionCounts(userId, targetLanguageCode)

  // For new-word events, also return current stats so the client can fire
  // achievement evaluation in real time during the learning session.
  let stats = null
  if (result.isNewWord) {
    stats = await progressService.getProgressStats(userId, targetLanguageCode)
  }

  return NextResponse.json({
    ...result,
    completedTopicIds,
    topicCompletionCounts,
    stats,
  })
}
