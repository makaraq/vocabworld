'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { FREE_TOPIC_IDS } from '@/lib/pricing'

interface SubscriptionStatus {
  isPremium: boolean
  subscription: {
    id: string
    status: string
    planType: 'monthly' | 'yearly'
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isPremium: boolean
  subscriptionLoading: boolean
  subscriptionStatus: SubscriptionStatus | null
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
  canAccessTopic: (topicId: number) => boolean
  forceSetPremium: () => void  // Add direct premium setter
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [forcedPremium, setForcedPremium] = useState(false)  // Local premium override
  const supabase = createClientComponentClient()

  // Force set premium status (for post-payment)
  const forceSetPremium = useCallback(() => {
    console.log('🔥 FORCING PREMIUM ACCESS')
    setForcedPremium(true)
    setSubscriptionStatus(prev => ({
      ...prev,
      isPremium: true
    }))
    localStorage.setItem('forcedPremiumAccess', 'true')
    localStorage.setItem('forcedPremiumAt', Date.now().toString())
  }, [])

  // Check for forced premium access on load
  useEffect(() => {
    const forcedAccess = localStorage.getItem('forcedPremiumAccess')
    const forcedAt = localStorage.getItem('forcedPremiumAt')
    const paymentInProgress = localStorage.getItem('paymentInProgress')
    
    // Check if user just returned from payment (even without URL param)
    if (paymentInProgress === 'true') {
      console.log('🔥 User returned from payment, forcing premium access')
      setForcedPremium(true)
      localStorage.setItem('forcedPremiumAccess', 'true')
      localStorage.setItem('forcedPremiumAt', Date.now().toString())
      localStorage.removeItem('paymentInProgress')
    }
    
    if (forcedAccess === 'true' && forcedAt) {
      const timeSinceForced = Date.now() - parseInt(forcedAt)
      if (timeSinceForced < 3600000) { // 1 hour grace period
        console.log('🔥 Restoring forced premium access')
        setForcedPremium(true)
      } else {
        localStorage.removeItem('forcedPremiumAccess')
        localStorage.removeItem('forcedPremiumAt')
      }
    }
  }, [])

  // Calculate isPremium with forced override priority
  const isPremium = forcedPremium || subscriptionStatus?.isPremium || false

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    setSubscriptionLoading(true)
    try {
      const response = await fetch('/api/subscription/status')
      const data = await response.json()
      setSubscriptionStatus(data)
      console.log('📊 Subscription status:', data)
    } catch (error) {
      console.error('❌ Failed to fetch subscription:', error)
      setSubscriptionStatus({ isPremium: false, subscription: null })
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  // Check if user can access a topic
  const canAccessTopic = useCallback((topicId: number): boolean => {
    // Free topics are always accessible
    if (FREE_TOPIC_IDS.includes(topicId)) {
      return true
    }
    
    // Check forced premium first (highest priority)
    if (forcedPremium) {
      console.log('✅ Access granted via forced premium')
      return true
    }
    
    // Check for recent payment completion (force premium access)
    const forceAccess = localStorage.getItem('forcePremuimAccess')
    const paymentCompletedAt = localStorage.getItem('paymentCompletedAt')
    
    if (forceAccess === 'true' || (paymentCompletedAt && Date.now() - parseInt(paymentCompletedAt) < 300000)) { // 5 minutes grace period
      console.log('✅ Granting premium access due to recent payment')
      return true
    }
    
    // Premium topics require subscription
    const hasPremium = subscriptionStatus?.isPremium ?? false
    console.log('🔍 Access check:', { topicId, hasPremium, forcedPremium })
    return hasPremium
  }, [subscriptionStatus, forcedPremium])

  // Refresh subscription (call after payment)
  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      console.error('❌ Google sign-in error:', error)
      throw error
    }
  }

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      console.error('❌ Apple sign-in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSubscriptionStatus(null)
  }

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        
        if (mounted) {
          setUser(currentUser)
          
          if (currentUser) {
            // Fetch subscription status
            await fetchSubscriptionStatus()
            
            // Update login streak
            try {
              await fetch('/api/progress/streak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
              })
            } catch (error) {
              console.error('Failed to update login streak:', error)
            }
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event)
        const currentUser = session?.user ?? null
        
        if (mounted) {
          setUser(currentUser)
          
          if (currentUser) {
            // Check for recent payment to preserve subscription status
            const paymentCompletedAt = localStorage.getItem('paymentCompletedAt')
            const recentPayment = paymentCompletedAt && Date.now() - parseInt(paymentCompletedAt) < 300000 // 5 minutes
            
            if (recentPayment) {
              console.log('🎉 Recent payment detected, maintaining premium status during auth change')
              setSubscriptionStatus(prev => ({
                ...prev,
                isPremium: true
              }))
            }
            
            await fetchSubscriptionStatus()
          } else {
            // Only reset subscription if no recent payment
            const paymentCompletedAt = localStorage.getItem('paymentCompletedAt')
            const recentPayment = paymentCompletedAt && Date.now() - parseInt(paymentCompletedAt) < 300000
            
            if (!recentPayment) {
              setSubscriptionStatus(null)
            }
          }
          
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      authSubscription.unsubscribe()
    }
  }, [supabase, fetchSubscriptionStatus])

  // Check for subscription activation after payment return
  useEffect(() => {
    const checkPaymentReturn = async () => {
      const justActivated = localStorage.getItem('subscriptionJustActivated')
      if (justActivated === 'true') {
        console.log('🎉 Subscription just activated, refreshing with polling...')
        localStorage.removeItem('subscriptionJustActivated')
        
        // Immediately set premium to true optimistically
        setSubscriptionStatus(prev => ({
          ...prev,
          isPremium: true
        }))
        
        console.log('🔒 Premium access granted optimistically after payment')
        
        // Poll for subscription status a few times (webhook may take a moment)
        let attempts = 0
        const maxAttempts = 8 // Increased attempts
        
        const pollSubscription = async (): Promise<boolean> => {
          await refreshSubscription()
          // Check if premium is now true
          const response = await fetch('/api/subscription/status')
          const data = await response.json()
          console.log(`📊 Poll attempt ${attempts + 1}:`, data)
          
          if (data.isPremium) {
            setSubscriptionStatus(data)
          }
          
          return data.isPremium === true
        }
        
        while (attempts < maxAttempts) {
          const isPremiumNow = await pollSubscription()
          if (isPremiumNow) {
            console.log('✅ Subscription confirmed as premium!')
            break
          }
          attempts++
          if (attempts < maxAttempts) {
            console.log(`⏳ Waiting 3s before retry ${attempts + 1}/${maxAttempts}...`)
            await new Promise(resolve => setTimeout(resolve, 3000)) // Increased delay
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log('⚠️ Subscription may still be processing, but access is granted')
          // Keep optimistic premium status even if polling didn't confirm
        }
      }
    }
    
    checkPaymentReturn()
  }, [refreshSubscription])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPremium,
        subscriptionLoading,
        subscriptionStatus,
        signInWithGoogle,
        signInWithApple,
        signOut,
        refreshSubscription,
        canAccessTopic,
        forceSetPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
