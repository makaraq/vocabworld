"use client"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"

export default function LanguagePage() {
  const { toast } = useToast()

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
