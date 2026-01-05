import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe, FREE_TOPIC_IDS } from './stripe'

export interface SubscriptionData {
  id: string
  status: string
  planType: 'monthly' | 'yearly'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface SubscriptionStatus {
  isPremium: boolean
  subscription: SubscriptionData | null
}

export class SubscriptionService {
  
  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const supabase = createServerComponentClient({ cookies })
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('subscription_status, stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single()
    
    if (error || !profile) {
      console.log('📊 No profile found for user:', userId)
      return { isPremium: false, subscription: null }
    }
    
    // If user has premium status in database
    if (profile.subscription_status === 'premium' && profile.stripe_subscription_id) {
      try {
        // Verify with Stripe
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id) as any
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          return {
            isPremium: true,
            subscription: {
              id: subscription.id,
              status: subscription.status,
              planType: subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            }
          }
        }
      } catch (err) {
        console.error('❌ Error fetching Stripe subscription:', err)
      }
    }
    
    return { isPremium: false, subscription: null }
  }
  
  /**
   * Check if user can access a specific topic
   */
  async canAccessTopic(userId: string | null, topicId: number): Promise<boolean> {
    // Free topics are always accessible
    if (FREE_TOPIC_IDS.includes(topicId)) {
      return true
    }
    
    // Premium topics require authentication and subscription
    if (!userId) {
      return false
    }
    
    const status = await this.getSubscriptionStatus(userId)
    return status.isPremium
  }
  
  /**
   * Create or get Stripe customer for user
   */
  async getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
    const supabase = createServerComponentClient({ cookies })
    
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()
    
    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id
    }
    
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        supabase_user_id: userId,
      },
    })
    
    // Save customer ID to database
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId)
    
    return customer.id
  }
  
  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(userId, email)
    
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
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        },
      },
    })
    
    return session.url || ''
  }
  
  /**
   * Create customer portal session
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const supabase = createServerComponentClient({ cookies })
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()
    
    if (!profile?.stripe_customer_id) {
      throw new Error('No Stripe customer found')
    }
    
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    })
    
    return session.url
  }
  
  /**
   * Handle subscription update from webhook
   */
  async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const supabase = createServerComponentClient({ cookies })
    const userId = subscription.metadata?.user_id
    
    if (!userId) {
      console.error('❌ No user_id in subscription metadata')
      return
    }
    
    const isActive = subscription.status === 'active' || subscription.status === 'trialing'
    
    await supabase
      .from('user_profiles')
      .update({
        subscription_status: isActive ? 'premium' : 'free',
        stripe_subscription_id: subscription.id,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    console.log(`✅ Updated subscription for user ${userId}: ${isActive ? 'premium' : 'free'}`)
  }
  
  /**
   * Handle subscription deletion from webhook
   */
  async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const supabase = createServerComponentClient({ cookies })
    const userId = subscription.metadata?.user_id
    
    if (!userId) {
      // Try to find user by stripe_subscription_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single()
      
      if (profile) {
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'free',
            stripe_subscription_id: null,
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)
        
        console.log(`✅ Removed subscription for user ${profile.id}`)
      }
      return
    }
    
    await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'free',
        stripe_subscription_id: null,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    console.log(`✅ Removed subscription for user ${userId}`)
  }
}

export const subscriptionService = new SubscriptionService()
