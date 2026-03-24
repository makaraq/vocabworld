import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Service role client for reading subscription data (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
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
              // Ignore — called from Server Component during middleware refresh
            }
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ isPremium: false, subscription: null })
    }
    
    // Read subscription state from our DB — kept up to date by RC webhooks
    const { data: profile, error: profileError } = await supabaseAdmin
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
