import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Service-role client — needed for admin.deleteUser() and bypasses RLS for data cleanup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗑️ Starting account deletion for user:', user.id)

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
      console.log('ℹ️ Found active subscriptions; RevenueCat will handle cancellation.')
    }

    // Step 2: Delete user data in correct order (respecting foreign keys)
    console.log('🗑️ Deleting user data...')

    // Delete subscription events
    const { error: eventsError } = await supabaseAdmin
      .from('subscription_events')
      .delete()
      .eq('user_id', user.id)

    if (eventsError) {
      console.error('⚠️ Error deleting subscription events:', eventsError.message)
    }

    // Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id)

    if (subscriptionsError) {
      console.error('⚠️ Error deleting subscriptions:', subscriptionsError.message)
    }

    // Delete custom playlists
    const { error: playlistsError } = await supabaseAdmin
      .from('custom_playlists')
      .delete()
      .eq('user_id', user.id)

    if (playlistsError) {
      console.error('⚠️ Error deleting playlists:', playlistsError.message)
    }

    // Delete progress records
    const { error: progressError } = await supabaseAdmin
      .from('user_topic_progress')
      .delete()
      .eq('user_id', user.id)

    if (progressError) {
      console.error('⚠️ Error deleting progress:', progressError.message)
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('⚠️ Error deleting profile:', profileError.message)
    }

    // Step 3: Delete auth user (requires service role)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

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
