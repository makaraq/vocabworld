'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'

export function PaymentSuccessHandler() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshSubscription } = useAuth()

  // Handle payment success
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const paymentSuccess = searchParams.get('payment_success')
      
      if (paymentSuccess === 'true') {
        console.log('🎉 Payment successful! Refreshing subscription status...')
        
        // Clear the URL parameter
        const newUrl = window.location.pathname
        router.replace(newUrl)
        
        // Set flag for subscription refresh
        localStorage.setItem('subscriptionJustActivated', 'true')
        
        // Show success toast
        toast({
          title: "🎉 Payment Successful!",
          description: "Welcome to VOCO Premium! All topics are now unlocked.",
          duration: 5000,
        })
        
        // Refresh subscription status immediately
        try {
          await refreshSubscription()
          console.log('✅ Subscription status refreshed after payment')
        } catch (error) {
          console.error('❌ Failed to refresh subscription:', error)
        }
      }
    }

    handlePaymentSuccess()
  }, [searchParams, router, toast, refreshSubscription])

  return null // This component doesn't render anything
}