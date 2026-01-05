import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, requestUrl.origin)
    )
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Session exchange error:', error)
        return NextResponse.redirect(
          new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
        )
      }

      if (data.session) {
        // Check if user profile exists, create if not
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', data.session.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const providerData = getProviderInfo(data.session.user)
          
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              auth_user_id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || null,
              avatar_url: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture || null,
              provider: providerData.provider,
              provider_id: providerData.provider_id,
              preferred_language: 'en',
              learning_languages: [],
              subscription_status: 'free'
            })

          if (insertError) {
            console.error('Error creating user profile:', insertError)
          }
        }

        // Redirect to the app
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent('Authentication failed')}`, requestUrl.origin)
      )
    }
  }

  // No code or error, redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}

function getProviderInfo(authUser: any): { provider: 'google' | 'apple' | 'email', provider_id: string | null } {
  if (authUser.app_metadata?.provider === 'google') {
    return {
      provider: 'google',
      provider_id: authUser.user_metadata?.sub || authUser.user_metadata?.provider_id || null
    }
  }
  
  if (authUser.app_metadata?.provider === 'apple') {
    return {
      provider: 'apple',
      provider_id: authUser.user_metadata?.sub || authUser.user_metadata?.provider_id || null
    }
  }

  return {
    provider: 'email',
    provider_id: null
  }
}