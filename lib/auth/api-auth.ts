/**
 * lib/auth/api-auth.ts
 *
 * Shared API-route authentication that works for BOTH clients:
 *   1. Web: Supabase session cookies (via @supabase/ssr)
 *   2. Native (Capacitor): `Authorization: Bearer <access_token>` header,
 *      attached by the fetch shim in app/layout.tsx. The WKWebView runs on
 *      capacitor://localhost, so its cookies are never sent to the API host —
 *      the Bearer header is the only viable auth path on device.
 *
 * Same pattern as app/api/playlists/route.ts. Routes that skip the Bearer
 * fallback return 401 to the native app even though the user is signed in.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface ApiUser {
  id: string
  email: string | null
}

/** Service-role client for data operations after auth is verified. */
export function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Resolves the authenticated user from cookies first, then from the
 * Authorization Bearer header. Returns null when neither is valid.
 */
export async function getApiUser(request: Request): Promise<ApiUser | null> {
  // 1. Cookie-based auth (web)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id) return { id: user.id, email: user.email ?? null }

  // 2. Authorization header fallback (native/Capacitor)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: tokenUser } } = await getAdminClient().auth.getUser(token)
    if (tokenUser?.id) return { id: tokenUser.id, email: tokenUser.email ?? null }
  }

  return null
}
