import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'

// Lazy initialization of admin client to prevent build-time crashes
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables for admin client')
  }
  
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 Auth check:', { userId: user?.id, authError: authError?.message })
    
    if (authError || !user) {
      return NextResponse.json({ 
        isPremium: false, 
        subscription: null 
      })
    }
    
    // Get user profile with subscription info using service role (bypasses RLS)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_status, stripe_subscription_id, subscription_plan, subscription_period_end')
      .eq('id', user.id)
      .single()
    
    console.log('📊 User profile query:', { userId: user.id, profile, profileError })
    
    if (profileError || !profile) {
      console.log('❌ Profile error or not found:', profileError)
      return NextResponse.json({ 
        isPremium: false, 
        subscription: null 
      })
    }
    
    // If user has premium status, verify with Stripe
    if (profile.subscription_status === 'premium' && profile.stripe_subscription_id) {
      try {
        const stripe = getStripe()
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          return NextResponse.json({
            isPremium: true,
            subscription: {
              id: subscription.id,
              status: subscription.status,
              planType: profile.subscription_plan || 'monthly',
              currentPeriodEnd: profile.subscription_period_end,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            }
          })
        }
      } catch (err) {
        console.error('❌ Error verifying subscription:', err)
      }
    }
    
    return NextResponse.json({ 
      isPremium: false, 
      subscription: null 
    })
    
  } catch (error: any) {
    console.error('❌ Status check error:', error)
    return NextResponse.json(
      { isPremium: false, subscription: null, error: error.message },
      { status: 500 }
    )
  }
}
