"use client"

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// This page cannot be statically generated
export const dynamic = 'force-dynamic'

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams?.get('error')
      const errorDescription = searchParams?.get('error_description')

      if (error) {
        console.error('OAuth error:', error, errorDescription)
        router.push(`/auth/error?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }

      // Check if user is already logged in (session exists)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User is authenticated, redirect to home
        console.log('✅ User already authenticated, redirecting to home')
        router.push('/')
        return
      }

      // If we reach here with no session and no error, something went wrong
      // This shouldn't happen normally as OAuth redirects go to /api/auth/callback
      console.log('⚠️ No session found, redirecting to home')
      router.push('/')
    }

    handleCallback()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  )
}