import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create Supabase client for browser with localStorage persistence.
 *
 * On Capacitor native we use the direct @supabase/supabase-js client because
 * the SSR browser client stores session data in cookies internally — even when
 * `storage: window.localStorage` is passed. WKWebView does NOT persist cookies
 * across app restarts, so the session is lost every time the user closes the
 * app. The direct client uses localStorage exclusively, which DOES persist.
 *
 * On the web we keep the SSR browser client so the Next.js middleware can
 * refresh tokens via cookies as usual.
 */
export function createClient() {
  const isNative =
    typeof window !== 'undefined' &&
    !!(window as any).Capacitor?.isNativePlatform?.()

  if (isNative) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: window.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }
    )
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  )
}
