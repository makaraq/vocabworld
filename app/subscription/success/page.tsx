'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { createClient } from '@/lib/supabase/browser-client'

/**
 * Subscription Success Page
 * 
 * This page is where Stripe redirects after successful payment.
 * 
 * Flow:
 * 1. User arrives from Stripe checkout
 * 2. Force refresh Supabase session
 * 3. Restore saved language codes to main storage
 * 4. Set flags for the main app to detect
 * 5. Redirect to home page
 * 6. Home page sees restoreLanguages flag and shows topic slider
 */
function SuccessContent() {
  const router = useRouter()
  const supabase = createClient()
  const [restoredLanguages, setRestoredLanguages] = useState<{native: string | null, target: string | null}>({
    native: null,
    target: null
  })

  useEffect(() => {
    const handleReturn = async () => {
      
      // CRITICAL: Force refresh session after returning from external site
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('❌ Session refresh failed:', error)
        } else if (data.session) {
        }
      } catch (e) {
        console.error('❌ Session refresh error:', e)
      }
      
      // Read saved language codes from payment flow
      const savedNative = localStorage.getItem('paymentLanguageNative')
      const savedTarget = localStorage.getItem('paymentLanguageTarget')
      
      
      // Restore languages to main storage keys
      if (savedNative) {
        localStorage.setItem('nativeLanguageCode', savedNative)
      }
      if (savedTarget) {
        localStorage.setItem('targetLanguageCode', savedTarget)
      }
      
      setRestoredLanguages({ native: savedNative, target: savedTarget })
      
      // Clean up payment-specific storage
      localStorage.removeItem('paymentLanguageNative')
      localStorage.removeItem('paymentLanguageTarget')
      localStorage.removeItem('paymentInProgress')
      
      // Set flags for main app to detect successful payment
      localStorage.setItem('subscriptionJustActivated', 'true')
      
      // Set flag to restore language view (tells main app to skip welcome, show topics)
      if (savedNative && savedTarget) {
        localStorage.setItem('restoreLanguages', 'true')
      }
      
      // Redirect to main app after showing success message
      setTimeout(() => {
        router.push('/')
      }, 2500)
    }
    
    handleReturn()
  }, [router, supabase])

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
        Your subscription is now active. You have full access to all 43 vocabulary topics!
      </p>
      
      {/* Language Restoration Info */}
      {restoredLanguages.native && restoredLanguages.target && (
        <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/10">
          <p className="text-white/80 text-sm">
            Restoring your language selection...
          </p>
        </div>
      )}
      
      {/* Features */}
      <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
        <p className="text-white/80 font-medium mb-2">You now have access to:</p>
        <ul className="space-y-2 text-white/60">
          <li className="flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
            All 43 vocabulary topics
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
        <span>Taking you back to the app...</span>
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
