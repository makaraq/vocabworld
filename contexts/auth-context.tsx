'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { User, Session, createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { createClient } from '@/lib/supabase/browser-client'
import { FREE_TOPIC_IDS } from '@/lib/pricing'
import { initRevenueCat, logOutRevenueCat, syncTrialReminder } from '@/lib/revenuecat-client'

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
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  
  // Subscription methods
  refreshSubscription: () => Promise<void>
  setOptimisticPremium: (plan: 'monthly' | 'yearly') => void
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

// Module-level purchase flag — survives React re-renders and state resets.
// Cleared on sign-out or when DB confirms premium.
let _purchaseConfirmed = false

const PURCHASE_FLAG_KEY = 'sprind_purchase_confirmed'

function setPurchaseFlag() {
  _purchaseConfirmed = true
  try { localStorage.setItem(PURCHASE_FLAG_KEY, '1') } catch {}
}

function clearPurchaseFlag() {
  _purchaseConfirmed = false
  try { localStorage.removeItem(PURCHASE_FLAG_KEY) } catch {}
}

function hasPurchaseFlag(): boolean {
  if (_purchaseConfirmed) return true
  try { return localStorage.getItem(PURCHASE_FLAG_KEY) === '1' } catch { return false }
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
  const optimisticPremiumRef = useRef(false)
  const cleanupTapListenerRef = useRef<(() => void) | null>(null)

  // Fetch fresh scheduling context and reschedule all local notifications.
  // Fire-and-forget — never throws, won't block the auth flow.
  async function triggerNotificationReschedule() {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return
    // Trial-ending reminder is independent of the study-notification settings —
    // re-sync it from RevenueCat's live entitlement state on every app open so
    // it cancels itself once the user converts/cancels.
    syncTrialReminder().catch(() => {})
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

      if (data.isPremium) {
        clearPurchaseFlag()
        optimisticPremiumRef.current = false
        setSubscriptionStatus(data)
      } else if (!hasPurchaseFlag()) {
        setSubscriptionStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
      if (!hasPurchaseFlag()) {
        setSubscriptionStatus({ isPremium: false, subscription: null })
      }
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      await fetchSubscriptionStatus(user.id)
    }
  }, [user?.id, fetchSubscriptionStatus])

  const setOptimisticPremium = useCallback((plan: 'monthly' | 'yearly') => {
    setPurchaseFlag()
    optimisticPremiumRef.current = true
    setSubscriptionStatus({
      isPremium: true,
      subscription: {
        id: user?.id ?? '',
        status: 'active',
        planType: plan,
        currentPeriodEnd: '',
        cancelAtPeriodEnd: false,
      },
    })
  }, [user?.id])

  // ============================================
  // TOPIC ACCESS
  // ============================================
  const canAccessTopic = useCallback((topicId: number): boolean => {
    if (FREE_TOPIC_IDS.includes(topicId)) return true
    if (hasPurchaseFlag()) return true
    return subscriptionStatus?.isPremium ?? false
  }, [subscriptionStatus])

  // ============================================
  // AUTH METHODS
  // ============================================
  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      // Use @supabase/supabase-js directly for native OAuth.
      // The @supabase/ssr browser client stores PKCE verifiers in cookies
      // which don't persist correctly in Capacitor's WKWebView.
      const nativeAuth = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { storage: window.localStorage, flowType: 'pkce', persistSession: true } }
      )

      const { data, error } = await nativeAuth.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.sprind.app://auth/callback',
          skipBrowserRedirect: true
        }
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL returned')

      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (url.includes('auth/callback')) {
          listener.remove()
          await Browser.close()
          const urlObj = new URL(url)
          const code = urlObj.searchParams.get('code')
          if (code) {
            const { error: exchangeError } = await nativeAuth.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError)
              return
            }
            // Sync the session to the main SSR client so onAuthStateChange fires
            const { data: { session: newSession } } = await nativeAuth.auth.getSession()
            if (newSession) {
              await supabase.auth.setSession({
                access_token: newSession.access_token,
                refresh_token: newSession.refresh_token,
              })
            }
          }
        }
      })

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
    if (Capacitor.getPlatform() === 'ios') {
      // clientId/redirectURI are required by the plugin's types but are ignored
      // by the native iOS flow (it uses the app's bundle ID). `scopes` is the part
      // that matters here — it makes Apple include email/name in the identity token.
      const result = await SignInWithApple.authorize({
        clientId: 'com.sprind.app',
        redirectURI: 'https://ripkorbuxnoljiprhlyk.supabase.co/auth/v1/callback',
        scopes: 'email name',
      })
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

  // Email/password — no browser redirect or PKCE exchange, so the existing
  // `supabase` client works on both web and native. signInWithPassword returns
  // the session directly and onAuthStateChange fires to update the UI.
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // When "Confirm email" is enabled in Supabase, signUp returns no session —
    // the user must click the emailed link before they can sign in.
    return { needsEmailConfirmation: data.session === null }
  }

  // Sends a recovery email. The link opens our web reset page in the browser
  // (not the app) — see app/auth/reset-password. redirectTo must be on the
  // Supabase "Redirect URLs" allowlist. Resolves without error even when no
  // account exists, so callers shouldn't reveal whether the email was found.
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.sprind.uk/auth/reset-password',
    })
    if (error) throw error
  }

  const signOut = async () => {
    await logOutRevenueCat()
    await supabase.auth.signOut()
    clearPurchaseFlag()
    optimisticPremiumRef.current = false
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

          // Initialise RevenueCat with Supabase user ID as appUserId, then
          // re-sync the trial-ending reminder once RC knows the entitlement
          // (triggerNotificationReschedule below may run before RC is ready).
          initRevenueCat(initialSession.user.id)
            .then(() => syncTrialReminder())
            .catch(console.error)
          
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
  const isPremium = subscriptionStatus?.isPremium || hasPurchaseFlag()

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
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
        refreshSubscription,
        setOptimisticPremium,
        canAccessTopic,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
