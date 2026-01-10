import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Check if progress tables exist and have data
    const checks: any = {
      tables: {},
      user: userId,
      timestamp: new Date().toISOString()
    }

    // Check user_word_progress table
    const { data: wordProgress, error: wordError, count: wordCount } = await supabase
      .from('user_word_progress')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5)

    checks.tables.user_word_progress = {
      exists: !wordError || wordError.code !== '42P01', // 42P01 = table doesn't exist
      error: wordError?.message,
      count: wordCount,
      sample: wordProgress
    }

    // Check user_topic_completion table
    const { data: topicProgress, error: topicError, count: topicCount } = await supabase
      .from('user_topic_completion')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5)

    checks.tables.user_topic_completion = {
      exists: !topicError || topicError.code !== '42P01',
      error: topicError?.message,
      count: topicCount,
      sample: topicProgress
    }

    // Check user_language_progress table
    const { data: langProgress, error: langError, count: langCount } = await supabase
      .from('user_language_progress')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5)

    checks.tables.user_language_progress = {
      exists: !langError || langError.code !== '42P01',
      error: langError?.message,
      count: langCount,
      sample: langProgress
    }

    // Check user_daily_progress table
    const { data: dailyProgress, error: dailyError, count: dailyCount } = await supabase
      .from('user_daily_progress')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5)

    checks.tables.user_daily_progress = {
      exists: !dailyError || dailyError.code !== '42P01',
      error: dailyError?.message,
      count: dailyCount,
      sample: dailyProgress
    }

    // Check if triggers exist
    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .in('tgname', [
        'trigger_update_topic_completion',
        'trigger_update_language_progress',
        'trigger_update_daily_progress'
      ])

    checks.triggers = {
      data: triggers,
      error: triggerError?.message
    }

    return NextResponse.json(checks, { status: 200 })

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
