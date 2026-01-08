import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/universal-audio') ||
    pathname.startsWith('/icons')
  ) {
    return res
  }

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('⚠️ Middleware auth error:', error.message)
    } else if (session) {
      console.log('✅ Middleware: User authenticated:', session.user.email)
    } else {
      console.log('ℹ️ Middleware: No session found')
    }

    return res
  } catch (error) {
    console.error('❌ Middleware error:', error)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg, *.ico, *.webp (image files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}