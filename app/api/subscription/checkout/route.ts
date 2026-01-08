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
    
    // Parse request body once
    const body = await req.json()
    const { priceType, userId } = body
    
    // Try cookie-based authentication first
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

    // Get authenticated user
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // If cookie auth fails and we have userId, try service role validation
    if (!user && userId) {
      console.log('🔄 Cookie auth failed, validating user with service role...')
      
      // Use service role to verify user exists and is valid
      const serviceSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        }
      )
      
      const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(userId)
      
      if (!userError && userData.user) {
        user = userData.user
        console.log('✅ User validated via service role:', user.email)
      } else {
        console.log('❌ Service role validation failed:', userError?.message)
      }
    }
    
    console.log('🔍 Final auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      email: user?.email,
      authError: authError?.message,
      cookies: allCookies.filter(c => c.name.includes('supabase')).length
    })
    
    if (authError && !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ No user found in session or service role validation')
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }

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
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Store customer ID
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?payment_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: priceType,
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}
