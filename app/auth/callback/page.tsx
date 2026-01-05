"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams?.get('code')
      const error = searchParams?.get('error')

      if (error) {
        console.error('OAuth error:', error)
        router.push(`/auth/error?error=${encodeURIComponent(error)}`)
        return
      }

      if (code) {
        try {
          console.log('🔵 Exchanging code for session...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('🔴 Session exchange error:', error)
            router.push(`/auth/error?error=${encodeURIComponent(error.message)}`)
            return
          }

          if (data.session) {
            console.log('🟢 Authentication successful!')
            router.push('/')
            return
          }
        } catch (error) {
          console.error('🔴 Auth callback error:', error)
          router.push(`/auth/error?error=${encodeURIComponent('Authentication failed')}`)
          return
        }
      }

      // No code, redirect to home
      router.push('/')
    }

    handleAuthCallback()
  }, [searchParams, router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}