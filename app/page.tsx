"use client"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"
import { TestSimulator } from "@/components/debug/test-simulator"
import { createClient } from '@/lib/supabase/browser-client'

export default function LanguagePage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [showTestSimulator, setShowTestSimulator] = useState(false)
  const [currentLanguages, setCurrentLanguages] = useState<{native: string, target: string}>({native: '', target: ''})
  
  // Check if returning from payment and force session refresh
  useEffect(() => {
    const checkPaymentReturn = async () => {
      const isPaymentReturn = 
        localStorage.getItem('subscriptionJustActivated') === 'true' ||
        localStorage.getItem('restoreLanguages') === 'true'
      
      if (isPaymentReturn) {
        console.log('🔄 Payment return detected on home page - refreshing session...')
        try {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error('❌ Session refresh failed:', error)
          } else if (data.session) {
            console.log('✅ Session refreshed on home page:', data.session.user.email)
          }
        } catch (e) {
          console.error('❌ Session refresh error:', e)
        }
      }
    }
    
    checkPaymentReturn()
  }, [supabase])
  
  // Allow opening test simulator with keyboard shortcut (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setShowTestSimulator(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Read current languages from localStorage
  useEffect(() => {
    const native = localStorage.getItem('nativeLanguageCode') || ''
    const target = localStorage.getItem('targetLanguageCode') || ''
    setCurrentLanguages({ native, target })
  }, [showTestSimulator])

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
      
      {/* Test Simulator - Open with Ctrl+Shift+T */}
      {showTestSimulator && (
        <TestSimulator 
          nativeLanguageCode={currentLanguages.native}
          targetLanguageCode={currentLanguages.target}
          onClose={() => setShowTestSimulator(false)}
        />
      )}
    </div>
  )
}
