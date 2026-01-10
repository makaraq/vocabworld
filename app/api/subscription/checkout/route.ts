import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { PRICING } from '@/lib/pricing'

// Service role client for database operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  try {
    const cookieStore = await cookies()
    
    // Debug: Log all cookies
    const allCookies = cookieStore.getAll()
    console.log('🍪 Checkout - All cookies:', allCookies.map(c => c.name))
    
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
    
    // Try getUser first (more secure), fallback to getSession if needed
    let user = null
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      console.log('🔐 getUser failed, trying getSession:', userError?.message)
      // Fallback to getSession which might work better in some cases
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !sessionData.session) {
        console.log('❌ Both auth methods failed:', { userError, sessionError })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionData.session.user
      console.log('✅ Got user from session:', user.id)
    } else {
      user = userData.user
      console.log('✅ Got user from getUser:', user.id)
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    
    // Get or create Stripe customer (using admin client to bypass RLS)
    const { data: profile } = await supabaseAdmin
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
      
      // Save customer ID (using admin client to bypass RLS)
      await supabaseAdmin
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
