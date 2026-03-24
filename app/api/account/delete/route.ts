import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗑️ Starting account deletion for user:', user.id)

    // Step 1: Get active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError)
    } else if (subscriptions && subscriptions.length > 0) {
      // Subscriptions will be cancelled automatically by RevenueCat when the account is deleted.
      // No action needed here — the RC webhook will update the DB status.
      console.log('ℹ️ Found active subscriptions; RevenueCat will handle cancellation.')
    }

    // Step 2: Delete user data in correct order (respecting foreign keys)
    console.log('🗑️ Deleting user data...')

    // Delete subscription events
    const { error: eventsError } = await supabase
      .from('subscription_events')
      .delete()
      .eq('user_id', user.id)

    if (eventsError) {
      console.error('⚠️ Error deleting subscription events:', eventsError.message)
    }

    // Delete subscriptions
    const { error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id)

    if (subscriptionsError) {
      console.error('⚠️ Error deleting subscriptions:', subscriptionsError.message)
    }

    // Delete custom playlists
    const { error: playlistsError } = await supabase
      .from('custom_playlists')
      .delete()
      .eq('user_id', user.id)

    if (playlistsError) {
      console.error('⚠️ Error deleting playlists:', playlistsError.message)
    }

    // Delete progress records
    const { error: progressError } = await supabase
      .from('user_topic_progress')
      .delete()
      .eq('user_id', user.id)

    if (progressError) {
      console.error('⚠️ Error deleting progress:', progressError.message)
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('⚠️ Error deleting profile:', profileError.message)
    }

    // Step 3: Delete auth user (this should cascade remaining data)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('❌ Error deleting auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete account', details: authDeleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ Account successfully deleted:', user.id)

    // Sign out the user
    await supabase.auth.signOut()

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
