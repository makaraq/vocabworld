import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for updating subscription data (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, action } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    console.log(`🧪 Test webhook: ${action} for user ${userId}`)
    
    // First, check if the user exists in user_profiles
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('📊 Existing profile:', existingProfile, 'Error:', checkError)
    
    if (action === 'activate') {
      // Simulate webhook updating user to premium
      const updateData = {
        id: userId, // Required for upsert
        subscription_status: 'premium',
        stripe_customer_id: 'test_customer_123',
        stripe_subscription_id: 'test_sub_123',
        subscription_plan: 'monthly',
        subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_updated_at: new Date().toISOString(),
      }
      
      console.log('📝 Upserting with data:', updateData)
      
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(updateData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        console.error('❌ Upsert error:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error,
          existingProfile 
        }, { status: 500 })
      }
      
      console.log('✅ Successfully updated to premium:', data)
      
      return NextResponse.json({ 
        success: true, 
        message: 'User upgraded to premium',
        data,
        existingProfile 
      })
    } else if (action === 'deactivate') {
      // Simulate webhook setting user back to free
      const updateData = {
        id: userId,
        subscription_status: 'free',
        stripe_subscription_id: null,
        subscription_updated_at: new Date().toISOString(),
      }
      
      console.log('📝 Upserting with data:', updateData)
      
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(updateData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        console.error('❌ Upsert error:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error,
          existingProfile 
        }, { status: 500 })
      }
      
      console.log('✅ Successfully downgraded to free:', data)
      
      return NextResponse.json({ 
        success: true, 
        message: 'User downgraded to free',
        data,
        existingProfile 
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('❌ Test webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
