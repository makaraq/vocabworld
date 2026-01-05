import { createClient } from '@supabase/supabase-js'
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
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        environment: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseAnonKey
        }
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test basic connection with a simple query
    const { data, error } = await supabase.from('vocabulary').select('count').limit(1)
    
    console.log('🔵 Supabase connection test:', {
      hasData: !!data,
      error: error?.message
    })
    
    return NextResponse.json({
      success: true,
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseAnonKey
      },
      connection: {
        working: !error,
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