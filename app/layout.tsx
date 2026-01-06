import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"
import "../styles/stripe-elements.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "VOCO - AI Language Learning",
  description: "Learn languages with AI-powered vocabulary and premium TTS voices",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} antialiased`}>
      <head>
        <script src="https://js.puter.com/v2/"></script>
      </head>
      <body className="font-sans" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
