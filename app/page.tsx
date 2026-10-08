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

  // Signed-out web visitors get the public landing page, which is a download
  // CTA only — the web app is not a way in any more. The native app and
  // already signed-in users go straight into the app. `?app=1` is an escape
  // hatch for support and testing.
  const [bypass, setBypass] = useState(false)
  const [isWeb, setIsWeb] = useState(false)
  useEffect(() => {
    setIsWeb(!Capacitor.isNativePlatform())
    setBypass(new URLSearchParams(window.location.search).has('app'))
  }, [])
  const showLanding = isWeb && !loading && !user && !bypass

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

  if (showLanding) {
    return (
      <>
        <LandingPage />
        <Toaster />
      </>
    )
  }

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
      <LanguageSelector />
      <WelcomeOverlay />
      <Toaster />
    </div>
  )
}
