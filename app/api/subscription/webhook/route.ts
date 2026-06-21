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


  // ── 3. Skip test / non-actionable events ─────────────────────────────────
  if (event.type === 'TEST') {
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
  }

  if (subscription_plan) {
    updateData.subscription_plan = subscription_plan
  }

  if (subscription_period_end !== undefined) {
    updateData.subscription_period_end = subscription_period_end
  }

  // ── Trial-ending reminder tracking ───────────────────────────────────────
  // When a free trial starts, record when it ends and clear any previous
  // "reminder sent" flag so the daily cron (/api/cron/trial-reminders) can
  // email this user ~2 days before they're charged. For every other event
  // (converted, cancelled, expired) clear trial_ends_at so we stop reminding.
  if (
    event.type === 'INITIAL_PURCHASE' &&
    event.period_type === 'TRIAL' &&
    event.expiration_at_ms
  ) {
    updateData.trial_ends_at = new Date(event.expiration_at_ms).toISOString()
    updateData.trial_reminder_sent_at = null
  } else {
    updateData.trial_ends_at = null
  }

  const { error: dbError } = await supabase
    .from('user_profiles')
    .upsert(updateData, { onConflict: 'id', ignoreDuplicates: false })

  if (dbError) {
    console.error('[RC Webhook] DB upsert failed:', dbError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Best-effort: also write the RC app user id (requires add-revenuecat-schema.sql migration).
  // Runs after the primary upsert and never fails the webhook response.
  supabase
    .from('user_profiles')
    .update({ revenuecat_app_user_id: event.app_user_id })
    .eq('id', event.app_user_id)
    .then(({ error }) => {
      if (error) console.warn('[RC Webhook] revenuecat_app_user_id update skipped (column may not exist yet):', error.message)
    })

  return NextResponse.json({ received: true })
}
