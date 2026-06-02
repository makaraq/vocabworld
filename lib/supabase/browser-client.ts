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
 * IMPORTANT: The native client is cached as a singleton. `createBrowserClient`
 * from @supabase/ssr is already a singleton, but `createClient` from
 * @supabase/supabase-js is NOT — it creates a new instance every call. Without
 * caching, auth-context.tsx would create a fresh client on every render, and
 * the onAuthStateChange listener would be on a different instance than the one
 * signInWithGoogle/signInWithApple use → listener never fires → auth breaks.
 *
 * On the web we keep the SSR browser client so the Next.js middleware can
 * refresh tokens via cookies as usual.
 */
let _nativeClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  const isNative =
    typeof window !== 'undefined' &&
    !!(window as any).Capacitor?.isNativePlatform?.()

  if (isNative) {
    if (!_nativeClient) {
      _nativeClient = createSupabaseClient(
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
    return _nativeClient
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
