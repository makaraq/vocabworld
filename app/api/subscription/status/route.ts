import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getApiUser } from '@/lib/auth/api-auth'

// Service role client for reading subscription data (bypasses RLS)
// Lazy service-role client: defers createClient so importing this route during
// the static-export build does not require Supabase env vars at build time.
let _client: ReturnType<typeof createClient<any>> | null = null
function getSupabaseAdmin() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

// Only a 200 is an answer. A lookup that fails returns non-2xx so the client
// can tell a failed check from "not Premium"; the body keeps the not-Premium
// shape for app builds that read only the body.
export async function GET(req: NextRequest) {
  try {
    // Resolves the user from session cookies (web) OR Bearer token (native app)
    const user = await getApiUser(req)

    // getApiUser returns null for a token that doesn't verify (bad, expired) and
    // when Supabase auth is unreachable. The client only asks with a session, so
    // either way the user is unknown, which is not the same as not Premium.
    if (!user) {
      return NextResponse.json({ isPremium: false, subscription: null }, { status: 401 })
    }
    
    // Read subscription state from our DB — kept up to date by RC webhooks
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('subscription_status, subscription_plan, subscription_period_end')
      .eq('id', user.id)
      .single()
    
    // PGRST116 is .single() finding no row, which is a real "not Premium".
    // Any other error (outage, timeout, connection) is a failed lookup.
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[Subscription Status] Profile lookup failed:', profileError)
      return NextResponse.json({ isPremium: false, subscription: null }, { status: 503 })
    }

    if (!profile) {
      return NextResponse.json({ isPremium: false, subscription: null })
    }
    
    if (profile.subscription_status === 'premium') {
      return NextResponse.json({
        isPremium: true,
        subscription: {
          id: user.id,
          status: 'active',
          planType: profile.subscription_plan || 'monthly',
          currentPeriodEnd: profile.subscription_period_end,
          cancelAtPeriodEnd: false,
        }
      })
    }
    
    return NextResponse.json({ isPremium: false, subscription: null })
    
  } catch (error: any) {
    console.error('[Subscription Status] Error:', error)
    return NextResponse.json(
      { isPremium: false, subscription: null },
      { status: 500 }
    )
  }
}
