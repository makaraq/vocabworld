"use client"
import dynamic from 'next/dynamic'
import { Toaster } from "@/components/ui/toaster"
import { LanguageSelector } from "@/components/language/language-selector"
import { WelcomeOverlay } from "@/components/auth/welcome-overlay"

// Dynamically import payment success handler to avoid SSR issues
const PaymentSuccessHandler = dynamic(
  () => import('@/components/payments/payment-success-handler').then(mod => ({ default: mod.PaymentSuccessHandler })),
  { ssr: false }
)

export default function LanguagePage() {
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
      <PaymentSuccessHandler />
      <Toaster />
    </div>
  )
}
