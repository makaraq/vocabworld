import { createBrowserClient } from '@supabase/ssr'

/**
 * Create Supabase client for browser with localStorage persistence.
 * This ensures sessions survive external redirects (like Stripe).
 */
export function createClient() {
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
