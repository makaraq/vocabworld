"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Exchange the code for a session (handles PKCE flow)
        const code = searchParams.get('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Code exchange error:', error)
            router.push(`/auth/error?error=${encodeURIComponent(error.message)}`)
            return
          }
          if (data.session) {
            console.log('✅ Authentication successful!')
            router.push('/')
            return
          }
        }

        // Fallback: check existing session (implicit flow)
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth error:', error)
          router.push(`/auth/error?error=${encodeURIComponent(error.message)}`)
          return
        }
        router.push('/')
      } catch (error) {
        console.error('Callback error:', error)
        router.push(`/auth/error?error=${encodeURIComponent('Authentication failed')}`)
      }
    }

    const timer = setTimeout(handleAuthCallback, 500)
    return () => clearTimeout(timer)
  }, [router, supabase, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Completing sign in...</p>
        <p className="mt-2 text-sm text-gray-500">This will only take a moment</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
