'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
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
  const cleanupTapListenerRef = useRef<(() => void) | null>(null)

  // Fetch fresh scheduling context and reschedule all local notifications.
  // Fire-and-forget — never throws, won't block the auth flow.
  async function triggerNotificationReschedule() {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return
    try {
      const [ctxRes, settingsRes] = await Promise.all([
        fetch('/api/notifications/context'),
        fetch('/api/settings'),
      ])
      if (!ctxRes.ok || !settingsRes.ok) return
      const ctx = await ctxRes.json()
      const { settings } = await settingsRes.json()
      const notifPrefs = {
        enabled: false,
        dailyReminderEnabled: true,
        dailyReminderTime: '09:00',
        streakProtectionEnabled: true,
        reviewReminderEnabled: true,
        ...(settings?.notifications ?? {}),
      }
      const { rescheduleAllNotifications } = await import('@/lib/notifications')
      await rescheduleAllNotifications(notifPrefs, ctx)
    } catch {
      // Non-fatal — notifications will reschedule on next open
    }
  }

  // ============================================
  // SUBSCRIPTION FETCHING
  // ============================================
  const fetchSubscriptionStatus = useCallback(async (userId: string) => {
    if (!userId) return
    
    setSubscriptionLoading(true)
    try {
      const response = await fetch('/api/subscription/status')
      const data = await response.json()
      setSubscriptionStatus(data)
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
    if (Capacitor.isNativePlatform()) {
      // Get OAuth URL from Supabase without auto-opening
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.sprind.app://auth/callback',
          skipBrowserRedirect: true
        }
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL returned')

      // Listen for deep link before opening browser
      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (url.includes('auth/callback')) {
          listener.remove()
          await Browser.close()
          const urlObj = new URL(url)
          const code = urlObj.searchParams.get('code')
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) console.error('🔴 Code exchange error:', exchangeError)
          }
        }
      })

      // Open SFSafariViewController (in-app overlay, app stays active)
      await Browser.open({ url: data.url, presentationStyle: 'popover' })
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
    }
  }

  const signInWithApple = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await SignInWithApple.authorize()
      if (!result?.response?.identityToken) throw new Error('No ID token from Apple')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken
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
      
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Session error:', error)
        }
        
        if (initialSession) {
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
            // Persist timezone for the notifications context API (fire-and-forget)
            void supabase
              .from('user_profiles')
              .update({ timezone, updated_at: new Date().toISOString() })
              .eq('id', initialSession.user.id)
            // Reschedule notifications with fresh context
            triggerNotificationReschedule().catch(() => {})
            // Listen for notification taps (e.g. open_review)
            import('@/lib/notifications').then(({ setupNotificationTapListener }) => {
              setupNotificationTapListener().then(cleanup => {
                cleanupTapListenerRef.current = cleanup
              })
            }).catch(() => {})
          } catch (e) {
          }
        } else {
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
          // Reschedule notifications on every foreground
          triggerNotificationReschedule().catch(() => {})
        } catch (e) {
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
