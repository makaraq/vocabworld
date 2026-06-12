"use client"
import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"
import { LandingPage } from "@/components/landing/landing-page"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from '@/lib/supabase/browser-client'

export default function LanguagePage() {
  const supabase = createClient()
  const { user, loading } = useAuth()

  // Signed-out web visitors see a public landing page first (required by
  // Google OAuth branding verification: the home page must be viewable
  // without login and explain the app's purpose). The native app and
  // signed-in users go straight into the app.
  const [entered, setEntered] = useState(false)
  const [isWeb, setIsWeb] = useState(false)
  useEffect(() => {
    setIsWeb(!Capacitor.isNativePlatform())
  }, [])
  const showLanding = isWeb && !loading && !user && !entered

  useEffect(() => {
    const checkPaymentReturn = async () => {
      const isPaymentReturn =
        localStorage.getItem('subscriptionJustActivated') === 'true' ||
        localStorage.getItem('restoreLanguages') === 'true'

      if (isPaymentReturn) {
        try {
          await supabase.auth.refreshSession()
        } catch (e) {
          console.error('Session refresh error:', e)
        }
      }
    }
    checkPaymentReturn()
  }, [supabase])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 pt-16 pb-8"
      style={{
        backgroundImage: "url('/bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {showLanding ? (
        <LandingPage onGetStartedAction={() => setEntered(true)} />
      ) : (
        <>
          <LanguageSelector />
          <WelcomeOverlay />
        </>
      )}
      <Toaster />
    </div>
  )
}
