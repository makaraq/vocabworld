import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Use service role for webhook handling (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  
  console.log('🔔 Webhook received')
  console.log('🔑 Signature present:', !!signature)
  console.log('🔐 Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET)
  
  if (!signature) {
    console.error('❌ No signature in request')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    console.error('❌ Signature:', signature?.substring(0, 20) + '...')
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }
  
  console.log(`📨 Webhook verified: ${event.type}`)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          await handleSubscriptionChange(subscription, 'created')
        }
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log(`📝 Subscription ${event.type}:`, event.data.object.id)
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription, 'updated')
        break
      }
      
      case 'customer.subscription.deleted': {
        console.log('🗑️ Subscription deleted:', event.data.object.id)
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription, 'deleted')
        break
      }
      
      case 'invoice.payment_succeeded': {
        console.log('💰 Payment succeeded for invoice:', event.data.object.id)
        const invoice = event.data.object as Stripe.Invoice
        // @ts-ignore - subscription exists on invoice
        if (invoice.subscription) {
          // @ts-ignore
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await handleSubscriptionChange(subscription, 'payment_succeeded')
        }
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`⚠️ Payment failed for invoice ${invoice.id}`)
        // Could send notification to user here
        break
      }
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
) {
  // Check both possible metadata keys
  const userId = subscription.metadata?.supabase_user_id || subscription.metadata?.user_id
  
  console.log('🔍 Looking for user ID in subscription metadata:', {
    supabase_user_id: subscription.metadata?.supabase_user_id,
    user_id: subscription.metadata?.user_id,
    resolved_userId: userId
  })
  
  if (!userId) {
    // Try to find user by customer ID
    console.log('⚠️ No user ID in metadata, trying to find by customer ID:', subscription.customer)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()
    
    if (!profile) {
      console.error('❌ Could not find user for subscription:', subscription.id)
      return
    }
    
    await updateUserSubscription(profile.id, subscription, eventType)
    return
  }
  
  await updateUserSubscription(userId, subscription, eventType)
}

async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  const isDeleted = eventType === 'deleted'
  
  const updateData: any = {
    id: userId, // Required for upsert
    subscription_status: isDeleted ? 'free' : (isActive ? 'premium' : 'free'),
    stripe_subscription_id: isDeleted ? null : subscription.id,
    stripe_customer_id: subscription.customer as string,
    subscription_updated_at: new Date().toISOString(),
  }
  
  // Store subscription details
  if (isActive && !isDeleted) {
    updateData.subscription_plan = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'
    
    // Get current_period_end - in newer Stripe API it's on the subscription item
    const periodEnd = (subscription.items?.data?.[0] as any)?.current_period_end
    
    console.log('🕐 Period end:', periodEnd, '→', periodEnd ? new Date(periodEnd * 1000).toISOString() : 'null')
    
    if (periodEnd && typeof periodEnd === 'number') {
      updateData.subscription_period_end = new Date(periodEnd * 1000).toISOString()
    }
  }
  
  console.log('📝 Upserting user subscription:', { userId, updateData })
  
  // Use upsert to create or update the profile
  const { error } = await supabase
    .from('user_profiles')
    .upsert(updateData, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
  
  if (error) {
    console.error('❌ Failed to upsert subscription:', error)
    throw error
  }
  
  console.log(`✅ Subscription ${eventType} for user ${userId}: ${updateData.subscription_status}`)
}
