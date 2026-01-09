'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'

export function PaymentSuccessHandler() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshSubscription, user, forceSetPremium } = useAuth()

  // Handle payment success
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const paymentSuccess = searchParams.get('payment_success')
      const sessionId = searchParams.get('session_id')
      
      if (paymentSuccess === 'true') {
        console.log('🎉 Payment successful! Session ID:', sessionId)
        
        // IMMEDIATELY force premium access
        forceSetPremium()
        console.log('🔥 FORCED PREMIUM ACCESS ACTIVATED')
        
        // Set multiple flags for subscription activation
        localStorage.setItem('subscriptionJustActivated', 'true')
        localStorage.setItem('paymentCompletedAt', Date.now().toString())
        localStorage.setItem('forcePremuimAccess', 'true') // Backup flag
        
        // Set cleanup timer to remove temporary flags after 10 minutes
        setTimeout(() => {
          localStorage.removeItem('forcePremuimAccess')
          console.log('🧹 Cleaned up temporary premium access flags')
        }, 600000) // 10 minutes
        
        // Clean up payment progress flags
        localStorage.removeItem('paymentInProgress')
        const urlBeforePayment = localStorage.getItem('urlBeforePayment')
        const topicBeforePayment = localStorage.getItem('topicBeforePayment')
        const authStateBeforePayment = localStorage.getItem('authStateBeforePayment')
        
        localStorage.removeItem('userIdBeforePayment')
        localStorage.removeItem('authStateBeforePayment')
        localStorage.removeItem('urlBeforePayment')
        localStorage.removeItem('topicBeforePayment')
        
        // Show success toast first
        toast({
          title: "🎉 Payment Successful!",
          description: "Welcome to VOCO Premium! All topics are now unlocked.",
          duration: 8000,
        })
        
        // If we have the original URL/topic, redirect back to it
        if (urlBeforePayment && urlBeforePayment !== '/' && urlBeforePayment !== window.location.pathname) {
          console.log('🔄 Restoring original location:', urlBeforePayment)
          setTimeout(() => {
            router.push(urlBeforePayment)
          }, 1000) // Small delay to let the toast show
        } else if (topicBeforePayment) {
          console.log('🔄 Restoring to topic:', topicBeforePayment)
          setTimeout(() => {
            router.push(`/?topic=${topicBeforePayment}`)
          }, 1000)
        } else {
          // Just clear URL params and stay on current page
          const newUrl = window.location.pathname
          router.replace(newUrl, { scroll: false })
        }
        
        // Force refresh subscription status immediately and multiple times
        const forceRefresh = async () => {
          try {
            await refreshSubscription()
            console.log('✅ Subscription status refreshed after payment')
            
            // Refresh again after 2 seconds
            setTimeout(async () => {
              await refreshSubscription()
              console.log('✅ Second subscription refresh completed')
            }, 2000)
            
            // And again after 5 seconds
            setTimeout(async () => {
              await refreshSubscription()
              console.log('✅ Third subscription refresh completed')
            }, 5000)
            
          } catch (error) {
            console.error('❌ Failed to refresh subscription:', error)
          }
        }
        
        // Start immediate refresh
        forceRefresh()
      }
    }

    // Only run if user is authenticated (prevents sign-out issues)
    if (user) {
      handlePaymentSuccess()
    }
  }, [searchParams, router, toast, refreshSubscription, user])

  return null // This component doesn't render anything
}