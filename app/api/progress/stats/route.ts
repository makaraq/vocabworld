import { NextRequest, NextResponse } from 'next/server'
import { progressService } from '@/lib/progress/progress-service'
import { getApiUser } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const targetLanguageCode = searchParams.get('targetLanguageCode')
  if (!targetLanguageCode) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  const stats = await progressService.getProgressStats(user.id, targetLanguageCode)
  return NextResponse.json(stats)
}
