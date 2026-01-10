import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Test API: Deactivate Premium
 * 
 * Resets user to free status for testing.
 * FOR TESTING ONLY - should be disabled in production.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  
  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    
    console.log('🧪 TEST: Deactivating premium for user:', userId)
    
    // Reset user profile to free
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        stripe_subscription_id: null,
        subscription_period_end: null
      })
      .eq('id', userId)
    
    if (error) {
      console.error('❌ Error deactivating premium:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ TEST: Premium deactivated')
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ Test deactivate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
