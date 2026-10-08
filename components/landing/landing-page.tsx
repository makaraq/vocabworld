'use client'

// Public landing page for signed-out web visitors at https://www.sprind.uk.
// Sprind is an app, not a web product: this page has exactly one job, which is
// to get the visitor into the App Store. There is no web sign-in here.
// It doubles as the public home page Google's OAuth branding review requires,
// so it still says, in one line, what the app is.

import { AppStoreButton } from '@/components/landing/app-store-button'
import { FloatingBackdrop } from '@/components/landing/floating-backdrop'

export function LandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#FFFDFB] flex flex-col items-center px-6 text-center overflow-hidden">
      <FloatingBackdrop />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-md w-full py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app-icon.png"
          alt="Sprind"
          width={96}
          height={96}
          className="w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-[22px] shadow-[0_10px_40px_-12px_rgba(255,91,26,0.55)]"
        />

        <h1 className="mt-10 text-[#0D0B0A] font-bold text-[2.1rem] sm:text-5xl leading-[1.08] tracking-[-0.03em]">
          Fifty languages.
          <br />
          Two minutes a day.
        </h1>

        <p className="mt-6 text-[#0D0B0A]/55 text-base sm:text-lg leading-relaxed">
          Sprind teaches the words you actually use, with native audio, quizzes and streaks.
        </p>

        <div className="mt-14">
          <AppStoreButton />
        </div>

        <p className="mt-6 text-[#0D0B0A]/35 text-xs tracking-wide">iPhone and iPad</p>
      </main>

      <footer className="relative z-10 w-full pb-10">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[#0D0B0A]/40 text-xs">
          <a href="/privacy-policy" className="hover:text-[#0D0B0A] underline-offset-2 hover:underline">Privacy</a>
          <a href="/terms-of-service" className="hover:text-[#0D0B0A] underline-offset-2 hover:underline">Terms</a>
          <a href="/support" className="hover:text-[#0D0B0A] underline-offset-2 hover:underline">Support</a>
          <a href="mailto:miracburakseker@gmail.com" className="hover:text-[#0D0B0A] underline-offset-2 hover:underline">Contact</a>
        </nav>
        <p className="text-[#0D0B0A]/25 text-[11px] mt-4">© {new Date().getFullYear()} Sprind</p>
      </footer>
    </div>
  )
}
