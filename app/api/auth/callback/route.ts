import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // Return a JSON response instead of redirect for the client to handle
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json(
    { success: false, error: 'No code provided' },
    { status: 400 }
  )
}