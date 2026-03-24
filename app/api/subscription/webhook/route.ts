import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyRevenueCatWebhook,
  deriveSubscriptionUpdate,
  type RCWebhookEvent,
} from '@/lib/revenuecat-server'

// Service-role client — bypasses RLS so we can write from the webhook handler
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // ── 1. Authenticate the webhook ──────────────────────────────────────────
  const authorization = req.headers.get('Authorization')

  if (!verifyRevenueCatWebhook(authorization)) {
    console.error('[RC Webhook] Authorization failed')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let payload: RCWebhookEvent
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload?.event
  if (!event?.type || !event?.app_user_id) {
    console.warn('[RC Webhook] Missing event type or app_user_id')
    return NextResponse.json({ received: true }) // 200 so RC does not retry
  }

  console.log(`[RC Webhook] ${event.type} | user: ${event.app_user_id} | env: ${event.environment}`)

  // ── 3. Skip test / non-actionable events ─────────────────────────────────
  if (event.type === 'TEST') {
    console.log('[RC Webhook] Test event — no DB update')
    return NextResponse.json({ received: true })
  }

  if (event.type === 'TRANSFER' || event.type === 'SUBSCRIBER_ALIAS') {
    return NextResponse.json({ received: true })
  }

  // ── 4. Derive status update and write to Supabase ─────────────────────────
  const { subscription_status, subscription_plan, subscription_period_end } =
    deriveSubscriptionUpdate(event)

  const updateData: Record<string, unknown> = {
    id: event.app_user_id,
    subscription_status,
    subscription_updated_at: new Date().toISOString(),
    revenuecat_app_user_id: event.app_user_id,
  }

  if (subscription_plan) {
    updateData.subscription_plan = subscription_plan
  }

  if (subscription_period_end !== undefined) {
    updateData.subscription_period_end = subscription_period_end
  }

  const { error: dbError } = await supabase
    .from('user_profiles')
    .upsert(updateData, { onConflict: 'id', ignoreDuplicates: false })

  if (dbError) {
    console.error('[RC Webhook] DB upsert failed:', dbError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  console.log(`[RC Webhook] ✅ ${event.type} → ${subscription_status} | user: ${event.app_user_id}`)
  return NextResponse.json({ received: true })
}
