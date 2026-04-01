import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider"
import "./globals.css"
import "../styles/stripe-elements.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Vocab World - AI Language Learning",
  description: "Learn languages with AI-powered vocabulary and premium TTS voices",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
          document.addEventListener('selectstart', function(e) { e.preventDefault(); }, true);
        ` }} />
      </head>
      <body className="font-sans" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        <ServiceWorkerProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}

