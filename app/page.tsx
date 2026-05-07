"use client"
import { useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"
import { createClient } from '@/lib/supabase/browser-client'

export default function LanguagePage() {
  const supabase = createClient()

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
      <LanguageSelector />
      <WelcomeOverlay />
      <Toaster />
    </div>
  )
}
