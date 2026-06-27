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

export async function GET(req: NextRequest) {
  try {
    // Resolves the user from session cookies (web) OR Bearer token (native app)
    const user = await getApiUser(req)

    if (!user) {
      return NextResponse.json({ isPremium: false, subscription: null })
    }
    
    // Read subscription state from our DB — kept up to date by RC webhooks
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('subscription_status, subscription_plan, subscription_period_end')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
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
