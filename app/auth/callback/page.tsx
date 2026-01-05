"use client"

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// This page cannot be statically generated
export const dynamic = 'force-dynamic'

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams?.get('code')
      const error = searchParams?.get('error')

      if (error) {
        console.error('OAuth error:', error)
        router.push(`/auth/error?error=${encodeURIComponent(error)}`)
        return
      }

      if (code) {
        try {
          // Call our server-side callback to handle the code exchange
          const response = await fetch(`/api/auth/callback?code=${code}`, {
            method: 'GET'
          })

          if (response.ok) {
            console.log('🟢 Authentication successful!')
            router.push('/')
          } else {
            console.error('🔴 Callback failed:', response.status)
            router.push(`/auth/error?error=${encodeURIComponent('Authentication failed')}`)
          }
        } catch (error) {
          console.error('🔴 Callback error:', error)
          router.push(`/auth/error?error=${encodeURIComponent('Authentication failed')}`)
        }
      } else {
        router.push('/')
      }
    }

    handleCallback()
  }, [searchParams, router])

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