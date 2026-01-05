import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('email')

    if (!userEmail) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    console.log(`🔍 Finding user with email: ${userEmail}`)
    
    // Get the user ID
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', userEmail)
    
    if (userError) {
      console.error('❌ Error finding user:', userError)
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = users[0]
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`)
    
    // Clear user_progress table
    console.log('🧹 Clearing user_progress...')
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', user.id)
    
    if (progressError) {
      console.error('❌ Error clearing user_progress:', progressError)
      return NextResponse.json({ error: 'Failed to clear user_progress' }, { status: 500 })
    }
    
    // Reset user profile stats
    console.log('🧹 Resetting user profile stats...')
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        daily_login_streak: 0,
        last_login_date: null,
        words_learned_today: 0,
        total_words_learned: 0
      })
      .eq('id', user.id)
    
    if (profileError) {
      console.error('❌ Error resetting user profile:', profileError)
      return NextResponse.json({ error: 'Failed to reset user profile' }, { status: 500 })
    }
    
    console.log('🎉 Successfully cleared all progress data for user:', userEmail)
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared all progress data for ${userEmail}`,
      userId: user.id
    })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}