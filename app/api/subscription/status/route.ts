import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'

// Service role client for reading subscription data (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const stripe = getStripe()
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
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
