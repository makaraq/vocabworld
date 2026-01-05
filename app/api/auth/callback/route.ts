import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  // Get the origin for redirects - use the request URL's origin
  const origin = requestUrl.origin

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
        )
      }
      
      console.log('✅ Auth successful for user:', data.user?.email)
      
      // Redirect to home page on success
      return NextResponse.redirect(`${origin}/`)
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent('Authentication failed')}`
      )
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(`${origin}/`)
}