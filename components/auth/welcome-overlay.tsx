'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function WelcomeOverlay() {
  const { user, signInWithGoogle, loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [hasBeenSkipped, setHasBeenSkipped] = useState(false)
  
  useEffect(() => {
    // Check if user previously skipped welcome screen
    const skipped = localStorage.getItem('welcome-skipped')
    if (skipped === 'true') {
      setHasBeenSkipped(true)
    }
  }, [])
  
  useEffect(() => {
    // Only show welcome if:
    // 1. Not loading
    // 2. No authenticated user
    // 3. User hasn't manually dismissed it
    // 4. User hasn't skipped it before
    if (!loading) {
      if (!user && !hasBeenSkipped) {
        setShowWelcome(true)
      } else {
        setShowWelcome(false)
        setIsSigningIn(false)
      }
    }
  }, [loading, user, hasBeenSkipped])
  
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
      // OAuth will redirect, so we keep the loading state
    } catch (error) {
      console.error('Sign in failed:', error)
      setIsSigningIn(false)
    }
  }
  
  const handleSkip = () => {
    setShowWelcome(false)
    setHasBeenSkipped(true)
    localStorage.setItem('welcome-skipped', 'true')
  }
  
  // Don't render if loading, user is authenticated, or manually hidden
  if (loading || user || !showWelcome) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      
      {/* Modal Content */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 mx-4 max-w-sm w-full text-center shadow-2xl">
        {/* Welcome Text */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-wide leading-tight drop-shadow-lg">
            WELCOME TO VOCABWORLD!
          </h1>
          
          <p className="text-white/90 text-base drop-shadow">
            Sign into your account
          </p>
        </div>
        
        {/* Google Sign In Button */}
        {isSigningIn ? (
          <div className="w-full bg-white/90 text-gray-800 font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-3 mb-6 text-base shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading || isSigningIn}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 mb-6 text-base shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        )}
      </div>
    </div>
  )
}