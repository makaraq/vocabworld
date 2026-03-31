'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { createClient } from '@/lib/supabase/browser-client'
import { FREE_TOPIC_IDS } from '@/lib/pricing'
import { initRevenueCat, logOutRevenueCat } from '@/lib/revenuecat-client'

// ============================================
// TYPES
// ============================================
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
  // Auth state
  user: User | null
  session: Session | null
  loading: boolean
  
  // Subscription state
  isPremium: boolean
  subscriptionLoading: boolean
  subscriptionStatus: SubscriptionStatus | null
  
  // Auth methods
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  
  // Subscription methods
  refreshSubscription: () => Promise<void>
  canAccessTopic: (topicId: number) => boolean
  
  // Token for API calls
  getAccessToken: () => Promise<string | null>
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ============================================
// PROVIDER
// ============================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  
  const supabase = createClient()
  const initializingRef = useRef(false)

  // ============================================
  // SUBSCRIPTION FETCHING
  // ============================================
  const fetchSubscriptionStatus = useCallback(async (userId: string) => {
    if (!userId) return
    
    setSubscriptionLoading(true)
    try {
      console.log('📊 Fetching subscription status for user:', userId)
      const response = await fetch('/api/subscription/status')
      const data = await response.json()
      setSubscriptionStatus(data)
      console.log('📊 Subscription result:', data)
    } catch (error) {
      console.error('❌ Failed to fetch subscription:', error)
      setSubscriptionStatus({ isPremium: false, subscription: null })
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      await fetchSubscriptionStatus(user.id)
    }
  }, [user?.id, fetchSubscriptionStatus])

  // ============================================
  // TOPIC ACCESS
  // ============================================
  const canAccessTopic = useCallback((topicId: number): boolean => {
    if (FREE_TOPIC_IDS.includes(topicId)) return true
    return subscriptionStatus?.isPremium ?? false
  }, [subscriptionStatus])

  // ============================================
  // AUTH METHODS
  // ============================================
  const signInWithGoogle = async () => {
    console.log('🔐 Starting Google sign-in...')
    // Use web OAuth for all platforms — native iOS SDK always puts iOS client ID
    // as token audience which Supabase rejects. Web OAuth uses the web client and
    // redirects back via the com.vocabworld.app:// URL scheme on iOS.
    const redirectTo = Capacitor.isNativePlatform()
      ? 'com.vocabworld.app://auth/callback'
      : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) throw error
  }

  const signInWithApple = async () => {
    console.log('🔐 Starting Apple sign-in...')
    if (Capacitor.isNativePlatform()) {
      await SocialLogin.initialize({ apple: {} })
      const result = await SocialLogin.login({ provider: 'apple', options: {} })
      if (!result?.result?.idToken) throw new Error('No ID token from Apple')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.result.idToken
      })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
    }
  }

  const signOut = async () => {
    console.log('🔐 Signing out...')
    await logOutRevenueCat()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setSubscriptionStatus(null)
  }

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Use current session if available
    if (session?.access_token) {
      return session.access_token
    }
    
    // Try to get fresh session
    try {
      const { data, error } = await supabase.auth.getSession()
      if (!error && data.session) {
        return data.session.access_token
      }
      
      // Try refresh
      const { data: refreshData } = await supabase.auth.refreshSession()
      return refreshData.session?.access_token ?? null
    } catch {
      return null
    }
  }, [session, supabase])

  // ============================================
  // INITIALIZATION & AUTH STATE LISTENER
  // ============================================
  useEffect(() => {
    if (initializingRef.current) return
    initializingRef.current = true

    const initializeAuth = async () => {
      console.log('🔐 Initializing auth...')
      
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Session error:', error)
        }
        
        if (initialSession) {
          console.log('✅ Session found:', {
            userId: initialSession.user.id,
            email: initialSession.user.email,
            name: initialSession.user.user_metadata?.full_name || initialSession.user.user_metadata?.name
          })
          setSession(initialSession)
          setUser(initialSession.user)
          
          // Fetch subscription
          await fetchSubscriptionStatus(initialSession.user.id)

          // Initialise RevenueCat with Supabase user ID as appUserId
          initRevenueCat(initialSession.user.id).catch(console.error)
          
          // Update login streak (timezone-aware)
          try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            await fetch('/api/progress/streak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId: initialSession.user.id,
                timezone 
              })
            })
          } catch (e) {
            console.log('Failed to update streak:', e)
          }
        } else {
          console.log('⚠️ No session found')
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔐 Auth state changed:', event, {
          hasSession: !!newSession,
          userId: newSession?.user?.id,
          email: newSession?.user?.email
        })
        
        if (newSession) {
          setSession(newSession)
          setUser(newSession.user)
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchSubscriptionStatus(newSession.user.id)
            if (event === 'SIGNED_IN') {
              initRevenueCat(newSession.user.id).catch(console.error)
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setSubscriptionStatus(null)
        }
        
        setLoading(false)
      }
    )

    initializeAuth()

    return () => {
      authSubscription.unsubscribe()
    }
  }, [supabase, fetchSubscriptionStatus])

  // ============================================
  // STREAK UPDATE ON APP FOCUS
  // ============================================
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // App regained focus - check and update streak
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          await fetch('/api/progress/streak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.id,
              timezone 
            })
          })
        } catch (e) {
          console.log('Failed to update streak on focus:', e)
        }
      }
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // ============================================
  // RENDER
  // ============================================
  const isPremium = subscriptionStatus?.isPremium ?? false

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
