import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { PRICING } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('🍪 Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  httpOnly: false,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax'
                })
              })
            } catch (error) {
              console.log('⚠️ Cookie setting error:', error)
            }
          },
        },
      }
    )
    
    // Get authenticated user with fallback refresh
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // If getUser fails, try refreshing the session first
    if (authError && authError.message.includes('JWT')) {
      console.log('🔄 JWT error detected, attempting session refresh...')
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError) {
        // Retry getting user after refresh
        const retry = await supabase.auth.getUser()
        user = retry.data?.user || null
        authError = retry.error
      }
    }
    
    console.log('🔍 Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      email: user?.email,
      authError: authError?.message,
      cookies: allCookies.filter(c => c.name.includes('supabase')).length
    })
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ No user found in session')
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }
    
    const { priceType } = await req.json()
    
    // Validate price type
    if (priceType !== 'monthly' && priceType !== 'yearly') {
      return NextResponse.json({ error: 'Invalid price type' }, { status: 400 })
    }
    
    const priceId = PRICING[priceType].priceId
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 })
    }
    
    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    
    let customerId = profile?.stripe_customer_id
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
      
      // Save customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }
    
    // Get origin for redirect URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    })
    
    return NextResponse.json({ url: session.url })
    
  } catch (error: any) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
