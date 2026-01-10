import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Test API: Activate Premium
 * 
 * Simulates successful payment by setting premium status in database.
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
    
    console.log('🧪 TEST: Activating premium for user:', userId)
    
    // Update user profile to premium
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_status: 'premium',
        subscription_plan: 'yearly',
        stripe_subscription_id: 'test_sub_' + Date.now(),
        subscription_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('❌ Error activating premium:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ TEST: Premium activated')
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ Test activate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
