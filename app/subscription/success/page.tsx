'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'

function SuccessContent() {
  const router = useRouter()

  useEffect(() => {
    // Mark subscription as just activated for the main app to detect
    localStorage.setItem('subscriptionJustActivated', 'true')
    
    // Redirect to main app after a short delay
    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <Icon icon="solar:check-circle-bold" className="w-12 h-12 text-white" />
      </div>
      
      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-3">
        🎉 Welcome to Premium!
      </h1>
      
      {/* Description */}
      <p className="text-white/70 text-lg mb-6">
        Your subscription is now active. You have full access to all 47 vocabulary topics!
      </p>
      
      {/* Features */}
      <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
        <p className="text-white/80 font-medium mb-2">You now have access to:</p>
        <ul className="space-y-2 text-white/60">
          <li className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
            All 47 vocabulary topics
          </li>
          <li className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
            Audio in 50 languages
          </li>
          <li className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
            Custom playlists
          </li>
          <li className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
            Word search feature
          </li>
        </ul>
      </div>
      
      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-3 text-white/60">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span>Redirecting to the app...</span>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
