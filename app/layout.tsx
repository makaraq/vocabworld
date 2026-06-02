import type React from "react"
import type { Metadata, Viewport } from "next"
import { Space_Grotesk } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { AchievementProvider } from "@/components/achievements/achievement-provider"
import { OfflineBanner } from "@/components/offline-banner"
import "./globals.css"
import "../styles/stripe-elements.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Sprind - Learn Language Fast",
  description: "Learn vocabulary in 50 languages with audio pronunciation, progress tracking, and daily streaks.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            document.documentElement.classList.add('cap-native');
            if (window.location.hostname === 'localhost' && !window.location.port) {
              var _f = window.fetch;
              window.fetch = function(input, init) {
                if (typeof input === 'string' && input.startsWith('/api/')) {
                  input = 'https://sprind-x843.vercel.app' + input;
                }
                return _f.apply(window, arguments);
              };
            }
          }
        ` }} />
      </head>
      <body className="font-sans" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        <AuthProvider>
          <AchievementProvider>
            <OfflineBanner />
            {children}
          </AchievementProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

