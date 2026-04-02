import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * POST /api/subscription/sync-rc
 *
 * Called immediately after a successful client-side RC purchase or restore.
 * Fetches the subscriber record directly from the RC REST API (no cache),
 * writes the result to user_profiles, then returns the current status.
 *
 * This bridges the gap between "RC SDK says premium" and "webhook hasn't
 * fired yet so DB still says free".
 */

const RC_API_BASE = 'https://api.revenuecat.com/v1'
const RC_ENTITLEMENT = 'Vocab World Unlimited'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate ────────────────────────────────────────────────────
    const cookieStore = await cookies()

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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore from Server Component context
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ isPremium: false }, { status: 401 })
    }

    // ── 2. Fetch subscriber from RC REST API (no cache) ───────────────────
    const apiKey = process.env.REVENUECAT_API_KEY
    if (!apiKey) {
      console.error('[sync-rc] REVENUECAT_API_KEY is not set')
      return NextResponse.json({ isPremium: false }, { status: 500 })
    }

    const rcRes = await fetch(
      `${RC_API_BASE}/subscribers/${encodeURIComponent(user.id)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!rcRes.ok) {
      console.error('[sync-rc] RC API error:', rcRes.status, await rcRes.text())
      return NextResponse.json({ isPremium: false }, { status: 500 })
    }

    const rcData = await rcRes.json()
    const entitlements: Record<string, any> =
      rcData?.subscriber?.entitlements ?? {}
    const entitlement = entitlements[RC_ENTITLEMENT]

    const isPremium =
      !!entitlement &&
      (!entitlement.expires_date ||
        new Date(entitlement.expires_date) > new Date())

    // ── 3. Write to DB ─────────────────────────────────────────────────────
    if (isPremium) {
      const expirationDate: string | null = entitlement?.expires_date ?? null

      // Determine plan from product id stored in RC entitlement
      const productId: string =
        entitlement?.product_identifier ?? ''
      let subscription_plan: 'monthly' | 'yearly' | null = null
      if (
        productId.includes('annual') ||
        productId.includes('yearly') ||
        productId.includes('year')
      ) {
        subscription_plan = 'yearly'
      } else if (
        productId.includes('monthly') ||
        productId.includes('month')
      ) {
        subscription_plan = 'monthly'
      }

      const updateData: Record<string, unknown> = {
        id: user.id,
        subscription_status: 'premium',
        subscription_updated_at: new Date().toISOString(),
      }
      if (subscription_plan) updateData.subscription_plan = subscription_plan
      if (expirationDate) updateData.subscription_period_end = expirationDate

      const { error: dbError } = await supabaseAdmin
        .from('user_profiles')
        .upsert(updateData, { onConflict: 'id', ignoreDuplicates: false })

      if (dbError) {
        console.error('[sync-rc] DB upsert failed:', dbError)
        // Don't return 500 — still tell the client they're premium
        // so the UI unlocks. The webhook will eventually fix the DB.
      } else {
        console.log('[sync-rc] ✅ DB updated to premium for user:', user.id)
      }
    }

    return NextResponse.json({ isPremium })
  } catch (error: any) {
    console.error('[sync-rc] Unexpected error:', error)
    return NextResponse.json({ isPremium: false }, { status: 500 })
  }
}
