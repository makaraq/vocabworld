/**
 * Clear all progress data for a specific user
 * Usage: node scripts/clear-user-progress.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearUserProgress() {
  const userEmail = 'miraitv@gmail.com'
  
  try {
    console.log(`🔍 Finding user with email: ${userEmail}`)
    
    // Get the user ID
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', userEmail)
    
    if (userError) {
      console.error('❌ Error finding user:', userError)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('❌ User not found')
      return
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
    } else {
      console.log('✅ Cleared user_progress')
    }
    
    // Clear subscription_events if they exist
    console.log('🧹 Clearing subscription_events...')
    const { error: eventsError } = await supabase
      .from('subscription_events')
      .delete()
      .eq('user_id', user.id)
    
    if (eventsError && eventsError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('❌ Error clearing subscription_events:', eventsError)
    } else {
      console.log('✅ Cleared subscription_events (or table doesn\'t exist)')
    }
    
    // Clear user_subscriptions if they exist  
    console.log('🧹 Clearing user_subscriptions...')
    const { error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id)
    
    if (subscriptionsError && subscriptionsError.code !== 'PGRST116') {
      console.error('❌ Error clearing user_subscriptions:', subscriptionsError)
    } else {
      console.log('✅ Cleared user_subscriptions (or table doesn\'t exist)')
    }
    
    // Reset user profile stats if they exist
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
    } else {
      console.log('✅ Reset user profile stats')
    }
    
    console.log('\n🎉 Successfully cleared all progress data for user:', userEmail)
    console.log('💡 You can now test with fresh data!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

clearUserProgress()