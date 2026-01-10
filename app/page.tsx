"use client"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"
import { TestSimulator } from "@/components/debug/test-simulator"

export default function LanguagePage() {
  const { toast } = useToast()
  const [showTestSimulator, setShowTestSimulator] = useState(false)
  const [currentLanguages, setCurrentLanguages] = useState<{native: string, target: string}>({native: '', target: ''})
  
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
