import { NextRequest, NextResponse } from 'next/server'
import { progressService } from '@/lib/progress/progress-service'
import { getApiUser } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id
  const { vocabularyId, targetLanguageCode, clientEventId, playedAt } = await request.json()
  if (!vocabularyId || !targetLanguageCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Idempotency: if this exact event was already applied (offline replay or a
  // retry after an ambiguous reconnect), skip the increment but still return the
  // current derived state so the client reconciles correctly.
  const duplicate = clientEventId ? await progressService.isEventProcessed(clientEventId) : false

  let result: { success: boolean; error?: string; isNewWord?: boolean } = { success: true, isNewWord: false }
  if (!duplicate) {
    result = await progressService.trackWordPlayed(userId, vocabularyId, targetLanguageCode, playedAt)
    if (!result.isNewWord) {
      await progressService.updateCompletionCountForWord(userId, vocabularyId, targetLanguageCode)
    }
    if (clientEventId && result.success) {
      await progressService.markEventProcessed(clientEventId, userId)
    }
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
    duplicate,
    completedTopicIds,
    topicCompletionCounts,
    stats,
  })
}
