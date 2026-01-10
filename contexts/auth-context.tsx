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
  getAccessToken: () => Promise<string | null>
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
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const supabase = createClientComponentClient()

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
    // Premium topics require subscription
    return subscriptionStatus?.isPremium ?? false
  }, [subscriptionStatus])

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
    setAccessToken(null)
    setSubscriptionStatus(null)
  }

  // Get access token for API calls - use stored token or try to refresh
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // First try the stored token
    if (accessToken) {
      console.log('✅ getAccessToken: Using stored token')
      return accessToken
    }
    
    // Try to get fresh session
    try {
      console.log('🔄 getAccessToken: Trying to get fresh session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.log('❌ getAccessToken error:', error.message)
        // Try refreshing the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData.session) {
          console.log('❌ getAccessToken: Refresh failed')
          return null
        }
        console.log('✅ getAccessToken: Session refreshed')
        setAccessToken(refreshData.session.access_token)
        return refreshData.session.access_token
      }
      if (session) {
        console.log('✅ getAccessToken: Got session')
        setAccessToken(session.access_token)
        return session.access_token
      }
      console.log('❌ getAccessToken: No session found')
      return null
    } catch (error) {
      console.error('❌ getAccessToken exception:', error)
      return null
    }
  }, [supabase, accessToken])

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        console.log('🔐 Getting initial session...')
        let { data: { session } } = await supabase.auth.getSession()
        
        // If no session, try to refresh (might help after returning from external site)
        if (!session) {
          console.log('🔄 No session found, trying to refresh...')
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshData.session) {
            session = refreshData.session
            console.log('✅ Session refreshed successfully')
          } else {
            console.log('❌ Session refresh failed:', refreshError?.message)
          }
        }
        
        const currentUser = session?.user ?? null
        
        if (mounted) {
          setUser(currentUser)
          if (session?.access_token) {
            setAccessToken(session.access_token)
            console.log('✅ Initial session loaded with token for user:', currentUser?.email)
          } else {
            console.log('⚠️ No session/token available')
          }
          
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
          
          // Store access token when session changes
          if (session?.access_token) {
            setAccessToken(session.access_token)
            console.log('✅ Auth state change: token stored')
          } else {
            setAccessToken(null)
          }
          
          if (currentUser) {
            await fetchSubscriptionStatus()
          } else {
            setSubscriptionStatus(null)
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
        
        // Poll for subscription status a few times (webhook may take a moment)
        let attempts = 0
        const maxAttempts = 5
        
        const pollSubscription = async (): Promise<boolean> => {
          await refreshSubscription()
          // Check if premium is now true
          const response = await fetch('/api/subscription/status')
          const data = await response.json()
          console.log(`📊 Poll attempt ${attempts + 1}:`, data)
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
            console.log(`⏳ Waiting 2s before retry ${attempts + 1}/${maxAttempts}...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log('⚠️ Subscription may still be processing, try refreshing the page')
        }
      }
    }
    
    checkPaymentReturn()
  }, [refreshSubscription])

  const isPremium = subscriptionStatus?.isPremium ?? false

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
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
