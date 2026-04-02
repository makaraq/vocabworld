/**
 * RevenueCat server-side utility.
 *
 * Used in:
 *  - /api/subscription/webhook  (verify RC authorization header + parse events)
 *  - /api/subscription/status   (optional: fetch subscriber info from RC REST API)
 */

// ─── Webhook verification ────────────────────────────────────────────────────

/**
 * RC webhooks arrive with an `Authorization` header whose value equals the
 * secret you set in the RC Dashboard → Project → Integrations → Webhooks.
 *
 * Returns true if the request is authentic.
 */
export function verifyRevenueCatWebhook(authorizationHeader: string | null): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[RC Webhook] REVENUECAT_WEBHOOK_SECRET is not configured')
    return false
  }
  return authorizationHeader === secret
}

// ─── RC REST API helper ──────────────────────────────────────────────────────

const RC_API_BASE = 'https://api.revenuecat.com/v1'

/**
 * Fetch a subscriber record from the RevenueCat REST API.
 * Useful for debugging or server-side entitlement checks outside of webhooks.
 */
export async function getRCSubscriber(appUserId: string): Promise<{
  isPremium: boolean
  expirationDate: string | null
} | null> {
  const apiKey = process.env.REVENUECAT_API_KEY
  if (!apiKey) {
    console.error('[RC] REVENUECAT_API_KEY is not set')
    return null
  }

  try {
    const res = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('[RC] REST API error:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const entitlements: Record<string, any> = data?.subscriber?.entitlements ?? {}
    const entitlement = entitlements['Vocab World Unlimited']

    const isPremium =
      !!entitlement &&
      (!entitlement.expires_date || new Date(entitlement.expires_date) > new Date())

    return {
      isPremium,
      expirationDate: entitlement?.expires_date ?? null,
    }
  } catch (err) {
    console.error('[RC] Failed to fetch subscriber:', err)
    return null
  }
}

// ─── Webhook event types ─────────────────────────────────────────────────────

export type RCWebhookEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'TRANSFER'
  | 'TEST'

export interface RCWebhookEvent {
  event: {
    type: RCWebhookEventType
    app_user_id: string            // = Supabase user UUID (we set this as appUserId)
    original_app_user_id?: string
    product_id: string
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO'
    purchased_at_ms: number
    expiration_at_ms: number | null
    store: 'APP_STORE' | 'PLAY_STORE' | 'RC_BILLING' | 'STRIPE' | 'MAC_APP_STORE'
    environment: 'SANDBOX' | 'PRODUCTION'
    entitlement_ids: string[]
    price_in_purchased_currency?: number
    currency?: string
    country_code?: string
  }
  api_version: '1.0'
}

/**
 * Derive a canonical subscription_status and plan from an RC webhook event.
 */
export function deriveSubscriptionUpdate(event: RCWebhookEvent['event']): {
  subscription_status: 'premium' | 'free'
  subscription_plan: 'monthly' | 'yearly' | null
  subscription_period_end: string | null
} {
  const activeEvents: RCWebhookEventType[] = [
    'INITIAL_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'PRODUCT_CHANGE',
  ]
  const inactiveEvents: RCWebhookEventType[] = [
    'CANCELLATION',
    'EXPIRATION',
    'BILLING_ISSUE',
  ]

  const isActive = activeEvents.includes(event.type)
  const isInactive = inactiveEvents.includes(event.type)

  if (!isActive && !isInactive) {
    // TEST, TRANSFER, SUBSCRIBER_ALIAS — no status change needed
    return { subscription_status: 'premium', subscription_plan: null, subscription_period_end: null }
  }

  const subscription_status = isActive ? 'premium' : 'free'

  // Determine plan from product_id e.g. "vocab_world_monthly" / "vocab_world_yearly"
  let subscription_plan: 'monthly' | 'yearly' | null = null
  if (event.product_id.includes('annual') || event.product_id.includes('yearly') || event.product_id.includes('year')) {
    subscription_plan = 'yearly'
  } else if (event.product_id.includes('monthly') || event.product_id.includes('month')) {
    subscription_plan = 'monthly'
  }

  const subscription_period_end = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null

  return { subscription_status, subscription_plan, subscription_period_end }
}
