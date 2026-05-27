import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware to refresh Supabase auth session on every request.
 * This is REQUIRED for Supabase auth to work properly with Next.js App Router.
 * 
 * Without this middleware, sessions will be lost after external redirects (like Stripe).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT remove this getUser() call.
  // It refreshes the auth token and keeps the session alive.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - API routes that don't need auth refresh
     * - Python serverless functions
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|api/sentence-audio|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)',
  ],
}
