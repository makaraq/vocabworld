import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${encodeURIComponent(error.message)}`)
      }

      if (data.session) {
        console.log('✅ Session created successfully for user:', data.user.email)
        return NextResponse.redirect(requestUrl.origin)
      }
    } catch (error) {
      console.error('❌ Callback processing error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${encodeURIComponent('Authentication failed')}`)
    }
  }

  // If no code or session creation failed, redirect to home
  return NextResponse.redirect(requestUrl.origin)
}