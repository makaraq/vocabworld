import { NextRequest, NextResponse } from 'next/server'
import { progressService } from '@/lib/progress/progress-service'

/**
 * POST /api/progress/streak
 * Update user's login streak when they log in (timezone-aware with grace period)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, timezone } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' }, 
        { status: 400 }
      )
    }

    await progressService.updateLoginStreak(userId, timezone)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating login streak:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update login streak' }, 
      { status: 500 }
    )
  }
}
