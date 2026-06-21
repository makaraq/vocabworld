/**
 * GET /api/cron/trial-reminders
 *
 * Daily cron (see vercel.json) that emails users ~2 days before their free
 * trial converts to a paid subscription — the email backstop for the on-device
 * notification, covering web users and anyone who didn't allow notifications.
 *
 * Reliability model:
 *   • Runs once a day (Vercel Hobby limit). Selects every trial ending within
 *     the next 2 days that hasn't been reminded yet.
 *   • trial_reminder_sent_at is the dedup guard — set after a successful send so
 *     no user is ever emailed twice, even if the window overlaps across days.
 *
 * Auth: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when
 * the CRON_SECRET env var is set. We reject anything that doesn't match.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Service-role client — bypasses RLS so the cron can read/write every profile.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FROM_ADDRESS = 'Sprind <noreply@sprind.uk>'
const MAX_PER_RUN = 100 // stay within Resend's free-tier daily cap

async function sendTrialEmail(to: string, trialEndsAt: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[trial-cron] RESEND_API_KEY not set')
    return false
  }

  const endsOn = new Date(trialEndsAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <h1 style="font-size:22px;margin:0 0 16px">Your free trial ends soon</h1>
    <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px">
      Heads up — your Sprind free trial ends on <strong>${endsOn}</strong>.
      When it does, your subscription begins and your payment method will be charged.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px">
      Loving your language progress? You don't need to do anything — keep learning.
      If Sprind isn't for you, you can cancel anytime before then in your
      App Store or Google Play subscription settings, and you won't be charged.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#999;margin:24px 0 0">
      You're receiving this because you started a free trial in Sprind.
    </p>
  </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: 'Your Sprind free trial ends soon',
        html,
      }),
    })
    if (!res.ok) {
      console.error('[trial-cron] Resend error:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('[trial-cron] Resend request failed:', err)
    return false
  }
}

export async function GET(request: Request) {
  // ── Authenticate the cron invocation ──────────────────────────────────────
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Find trials ending within the next 2 days, not yet reminded ───────────
  const now = new Date()
  const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, trial_ends_at')
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', twoDaysOut.toISOString())
    .is('trial_reminder_sent_at', null)
    .not('email', 'is', null)
    .limit(MAX_PER_RUN)

  if (error) {
    console.error('[trial-cron] query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const u of users ?? []) {
    if (!u.email || !u.trial_ends_at) continue
    const ok = await sendTrialEmail(u.email, u.trial_ends_at)
    if (ok) {
      // Mark as reminded so we never email this user twice.
      const { error: updErr } = await supabase
        .from('user_profiles')
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq('id', u.id)
      if (updErr) console.error('[trial-cron] flag update failed for', u.id, updErr)
      sent++
    } else {
      failed++
    }
  }

  return NextResponse.json({ candidates: users?.length ?? 0, sent, failed })
}
