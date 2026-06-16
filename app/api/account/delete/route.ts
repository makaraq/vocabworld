import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/auth/api-auth'

// Service-role client — needed for admin.deleteUser() and bypasses RLS for data cleanup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: Request) {
  try {
    // Resolves the user from session cookies (web) OR Bearer token (native app)
    const user = await getApiUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    // Step 1: Get active subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError)
    } else if (subscriptions && subscriptions.length > 0) {
      // Subscriptions will be cancelled automatically by RevenueCat when the account is deleted.
      // No action needed here — the RC webhook will update the DB status.
    }

    // Step 2: Delete user data in correct order (children before parents)

    // Delete word-level progress
    const { error: wordProgressError } = await supabaseAdmin
      .from('user_word_progress')
      .delete()
      .eq('user_id', user.id)
    if (wordProgressError) console.error('⚠️ Error deleting word progress:', wordProgressError.message)

    // Delete topic position (was incorrectly named user_topic_progress before)
    const { error: topicPositionError } = await supabaseAdmin
      .from('user_topic_position')
      .delete()
      .eq('user_id', user.id)
    if (topicPositionError) console.error('⚠️ Error deleting topic positions:', topicPositionError.message)

    // Delete topic completion records
    const { error: topicCompletionError } = await supabaseAdmin
      .from('user_topic_completion')
      .delete()
      .eq('user_id', user.id)
    if (topicCompletionError) console.error('⚠️ Error deleting topic completions:', topicCompletionError.message)

    // Delete login streaks
    const { error: streaksError } = await supabaseAdmin
      .from('user_login_streaks')
      .delete()
      .eq('user_id', user.id)
    if (streaksError) console.error('⚠️ Error deleting login streaks:', streaksError.message)

    // Delete daily progress
    const { error: dailyProgressError } = await supabaseAdmin
      .from('user_daily_progress')
      .delete()
      .eq('user_id', user.id)
    if (dailyProgressError) console.error('⚠️ Error deleting daily progress:', dailyProgressError.message)

    // Delete language progress
    const { error: langProgressError } = await supabaseAdmin
      .from('user_language_progress')
      .delete()
      .eq('user_id', user.id)
    if (langProgressError) console.error('⚠️ Error deleting language progress:', langProgressError.message)

    // Delete playlist words first (FK child of user_playlists), then playlists
    // user_playlist_words cascades from user_playlists, but explicit is safer
    const { data: userPlaylists } = await supabaseAdmin
      .from('user_playlists')
      .select('id')
      .eq('user_id', user.id)

    if (userPlaylists && userPlaylists.length > 0) {
      const playlistIds = userPlaylists.map((p: { id: number }) => p.id)
      const { error: playlistWordsError } = await supabaseAdmin
        .from('user_playlist_words')
        .delete()
        .in('playlist_id', playlistIds)
      if (playlistWordsError) console.error('⚠️ Error deleting playlist words:', playlistWordsError.message)
    }

    const { error: playlistsError } = await supabaseAdmin
      .from('user_playlists')
      .delete()
      .eq('user_id', user.id)
    if (playlistsError) console.error('⚠️ Error deleting playlists:', playlistsError.message)

    // Delete subscription events (FK child of user_profiles)
    const { error: eventsError } = await supabaseAdmin
      .from('subscription_events')
      .delete()
      .eq('user_id', user.id)
    if (eventsError) console.error('⚠️ Error deleting subscription events:', eventsError.message)

    // Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id)
    if (subscriptionsError) console.error('⚠️ Error deleting subscriptions:', subscriptionsError.message)

    // Delete user profile (must come before auth user deletion since subscription_events FK points here)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user.id)
    if (profileError) console.error('⚠️ Error deleting profile:', profileError.message)

    // Step 3: Delete the auth user — this cascades any remaining rows referencing auth.users(id)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (authDeleteError) {
      console.error('❌ Error deleting auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete account', details: authDeleteError.message },
        { status: 500 }
      )
    }

    // Note: no server-side signOut needed — the client calls signOut() after receiving this response

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })

  } catch (error: any) {
    console.error('❌ Account deletion failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete account', details: error.message },
      { status: 500 }
    )
  }
}
