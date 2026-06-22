'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Lottie from 'lottie-react'
import { Button } from '@/components/ui/button'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/contexts/auth-context'
import { hapticsLight } from '@/lib/haptics'
import languageTranslatorAnim from '@/lib/animations/language-translator.json'

export function WelcomeOverlay() {
  const { user, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailNotice, setEmailNotice] = useState<string | null>(null)
  
  // Reset sign-in spinner whenever the user is signed out (e.g. after account
  // deletion). The component stays mounted while the user is logged in (it just
  // returns null), so isSigningIn can still be true from a previous sign-in.
  useEffect(() => {
    if (!user) {
      setIsSigningIn(false)
    }
  }, [user])

  // Apple Sign-In is only offered on iOS (Apple provides no native Android SDK)
  useEffect(() => {
    setIsIOS(Capacitor.getPlatform() === 'ios')
  }, [])

  useEffect(() => {
    // Don't show while loading
    if (loading) return
    
    // Don't show if user is authenticated
    if (user) {
      setShowOverlay(false)
      return
    }
    
    // Check for payment return - don't show overlay if returning from Stripe
    const isPaymentReturn = 
      localStorage.getItem('paymentInProgress') === 'true' ||
      localStorage.getItem('subscriptionJustActivated') === 'true' ||
      localStorage.getItem('restoreLanguages') === 'true'
    
    if (isPaymentReturn) {
      setShowOverlay(false)
      return
    }
    
    // Show overlay immediately for unauthenticated users
    if (!user) {
      setShowOverlay(true)
    }
  }, [loading, user])
  
  const handleGoogleSignIn = async () => {
    hapticsLight()
    setIsSigningIn(true)
    try {
      // On native, listen for the in-app browser closing so we can reset the
      // spinner if the user dismisses Safari without completing sign-in.
      const cap = (window as any)?.Capacitor
      if (cap?.isNativePlatform?.()) {
        const { Browser } = await import('@capacitor/browser')
        const listener = await Browser.addListener('browserFinished', () => {
          listener.remove()
          setTimeout(() => setIsSigningIn(false), 500)
        })
        // Safety timeout — Browser.close() called programmatically
        // doesn't fire browserFinished, so reset after 10s max
        setTimeout(() => setIsSigningIn(false), 10000)
      }

      await signInWithGoogle()
      // OAuth will redirect / handle via deep link; keep spinner until resolved
    } catch (error) {
      console.error('Sign in failed:', error)
      setIsSigningIn(false)
    }
  }

  const handleAppleSignIn = async () => {
    hapticsLight()
    setIsSigningIn(true)
    try {
      // Native Apple sheet on iOS — resolves in-app, no browser redirect.
      // On success the auth listener updates `user` and this overlay hides itself.
      await signInWithApple()
    } catch (error) {
      // Includes the user cancelling the Apple sheet — just reset the spinner.
      console.error('Apple sign in failed:', error)
      setIsSigningIn(false)
    }
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    hapticsLight()
    setEmailError(null)
    setEmailNotice(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setEmailError('Enter your email and password.')
      return
    }
    if (isSignUp && password.length < 8) {
      setEmailError('Password must be at least 8 characters.')
      return
    }

    setIsSigningIn(true)
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUpWithEmail(trimmedEmail, password)
        if (needsEmailConfirmation) {
          // No session yet — prompt them to confirm, then switch to sign-in mode.
          setEmailNotice('Check your email to confirm your account, then sign in.')
          setIsSignUp(false)
          setPassword('')
          setIsSigningIn(false)
        }
        // Otherwise a session exists and the auth listener hides this overlay.
      } else {
        await signInWithEmail(trimmedEmail, password)
        // On success the auth listener updates `user` and the overlay hides itself.
      }
    } catch (err: any) {
      console.error('Email auth failed:', err)
      setEmailError(err?.message || 'Something went wrong. Please try again.')
      setIsSigningIn(false)
    }
  }

  const handleForgotPassword = async () => {
    hapticsLight()
    setEmailError(null)
    setEmailNotice(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError('Enter your email above first, then tap “Forgot password.”')
      return
    }

    setIsSigningIn(true)
    try {
      await resetPassword(trimmedEmail)
      // Don't reveal whether the email maps to an account.
      setEmailNotice('If an account exists for that email, a reset link is on its way. Open it, set a new password, then sign in here.')
    } catch (err: any) {
      console.error('Password reset failed:', err)
      setEmailError(err?.message || 'Could not send the reset email. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  // Don't render if conditions not met
  if (loading || user || !showOverlay) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      
      {/* Modal Content */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 mx-4 max-w-sm w-full text-center shadow-2xl">
        {/* Hero animation */}
        <div className="w-56 h-56 mx-auto mb-4 -mt-2">
          <Lottie animationData={languageTranslatorAnim} loop autoplay />
        </div>

        {/* Welcome Text */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-lg">
            Thousands of words. Organized on Sprind.
          </h1>
        </div>
        
        {/* Sign In Buttons */}
        {isSigningIn ? (
          <div className="w-full bg-white/90 text-gray-800 font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-base shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Signing in...</span>
          </div>
        ) : showEmailForm ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 text-left">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              className="w-full h-14 bg-white/90 text-gray-800 placeholder-gray-500 px-4 rounded-xl text-base outline-none focus:ring-2 focus:ring-white/70"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full h-14 bg-white/90 text-gray-800 placeholder-gray-500 px-4 rounded-xl text-base outline-none focus:ring-2 focus:ring-white/70"
            />

            {!isSignUp && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || isSigningIn}
                className="self-end text-sm text-white/80 underline underline-offset-2 -mt-1"
              >
                Forgot password?
              </button>
            )}

            {emailError && <p className="text-sm text-red-200 px-1">{emailError}</p>}
            {emailNotice && <p className="text-sm text-green-100 px-1">{emailNotice}</p>}

            <Button
              type="submit"
              disabled={loading || isSigningIn}
              className="w-full h-14 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 rounded-xl transition-all duration-200 flex items-center justify-center text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>

            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setEmailError(null); setEmailNotice(null) }}
              className="text-sm text-white/90 underline underline-offset-2"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
            <button
              type="button"
              onClick={() => { setShowEmailForm(false); setEmailError(null); setEmailNotice(null) }}
              className="text-sm text-white/60"
            >
              ← Back
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {isIOS && (
              <Button
                onClick={handleAppleSignIn}
                disabled={loading || isSigningIn}
                className="w-full h-14 bg-black hover:bg-gray-900 text-white font-semibold px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            )}

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading || isSigningIn}
              className="w-full h-14 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <Button
              onClick={() => { hapticsLight(); setShowEmailForm(true); setEmailError(null); setEmailNotice(null) }}
              disabled={loading || isSigningIn}
              className="w-full h-14 bg-white/15 hover:bg-white/25 text-white font-semibold px-6 rounded-xl border border-white/30 transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Continue with Email
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
