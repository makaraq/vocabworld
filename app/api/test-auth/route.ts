import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Testing Supabase connection...')
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔵 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
    })
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    
    console.log('🔵 Supabase auth test:', {
      hasSession: !!data.session,
      error: error?.message
    })
    
    return NextResponse.json({
      success: true,
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseAnonKey
      },
      auth: {
        hasSession: !!data.session,
        error: error?.message
      }
    })
  } catch (error) {
    console.error('🔴 Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}