import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

// Temporary endpoint to fix subscription status after webhook failure
// DELETE THIS FILE AFTER USE

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  
  try {
    const { userId, stripeCustomerId } = await req.json()
    
    if (!userId || !stripeCustomerId) {
      return NextResponse.json({ error: 'Missing userId or stripeCustomerId' }, { status: 400 })
    }
    
    // Get active subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    })
    
    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }
    
    const subscription = subscriptions.data[0]
    
    // Update user profile - use upsert to create if not exists
    const upsertData = {
      id: userId,
      subscription_status: 'premium',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      subscription_plan: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      subscription_period_end: (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000).toISOString() 
        : null,
      subscription_updated_at: new Date().toISOString(),
    }
    
    console.log('📝 Fixing subscription for user:', userId, upsertData)
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert(upsertData, { onConflict: 'id' })
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription status fixed!',
      data: upsertData 
    })
    
  } catch (error: any) {
    console.error('❌ Fix error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
