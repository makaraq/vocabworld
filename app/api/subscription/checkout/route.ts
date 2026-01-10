import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { PRICING } from '@/lib/pricing'

/**
 * Subscription Checkout API
 * 
 * Creates a Stripe checkout session for subscription.
 * Uses Authorization header for authentication (more reliable than cookies).
 */

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  
  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Authorization header')
      return NextResponse.json(
        { error: 'Unauthorized - no token provided' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Token verification failed:', authError?.message)
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)
    
    // Get request body
    const { priceType } = await req.json()
    
    if (!priceType || !['monthly', 'yearly'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      )
    }
    
    // Get or create Stripe customer
    let customerId: string
    
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
      console.log('✅ Using existing Stripe customer:', customerId)
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      customerId = customer.id
      console.log('✅ Created new Stripe customer:', customerId)
      
      // Save customer ID to profile
      await supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }
    
    // Get price ID
    const priceId = priceType === 'yearly' 
      ? PRICING.yearly.priceId 
      : PRICING.monthly.priceId
    
    if (!priceId) {
      console.error('❌ Missing Stripe price ID for:', priceType)
      return NextResponse.json(
        { error: 'Price configuration error' },
        { status: 500 }
      )
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: priceType
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: priceType
        }
      }
    })
    
    console.log('✅ Checkout session created:', session.id)
    
    return NextResponse.json({ url: session.url })
    
  } catch (error: any) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
