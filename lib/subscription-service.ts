import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { FREE_TOPIC_IDS } from './pricing'

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
      .select('subscription_status, subscription_plan, subscription_period_end')
      .eq('id', userId)
      .single()
    
    if (error || !profile) {
      console.log('📊 No profile found for user:', userId)
      return { isPremium: false, subscription: null }
    }
    
    // Trust the subscription_status field — kept up to date by RC webhooks
    if (profile.subscription_status === 'premium') {
      return {
        isPremium: true,
        subscription: {
          id: userId,
          status: 'active',
          planType: (profile.subscription_plan as 'monthly' | 'yearly') ?? 'monthly',
          currentPeriodEnd: profile.subscription_period_end ?? new Date().toISOString(),
          cancelAtPeriodEnd: false,
        }
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
  
  // Stripe checkout/customer/portal methods removed.
  // Purchases are now handled client-side via the RevenueCat SDK.
  // See: lib/revenuecat-client.ts and hooks/use-revenuecat.ts
}

export const subscriptionService = new SubscriptionService()
