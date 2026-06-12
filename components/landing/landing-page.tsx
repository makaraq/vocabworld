'use client'

// Public landing page shown to signed-out WEB visitors (never in the native
// app). Google OAuth branding verification requires the home page to be
// viewable without login and to explain the app's purpose — this page is
// what Google's reviewers (and new visitors) see at https://www.sprind.uk.

import { Icon } from '@iconify/react'

interface LandingPageProps {
  onGetStartedAction: () => void
}

const FEATURES = [
  {
    icon: 'solar:translation-bold',
    title: '50 languages',
    text: 'Learn practical, everyday vocabulary in Spanish, French, German, Japanese, and 46 more languages.',
  },
  {
    icon: 'solar:volume-loud-bold',
    title: 'Native audio pronunciation',
    text: 'Every word comes with clear audio in both your language and the one you are learning.',
  },
  {
    icon: 'solar:cloud-download-bold',
    title: 'Offline mode',
    text: 'Download your languages once and keep learning anywhere — no internet needed.',
  },
  {
    icon: 'solar:cup-star-bold',
    title: 'Quizzes, streaks & progress',
    text: 'Topic quizzes, spaced review, daily streaks, and a leaderboard keep you motivated.',
  },
]

export function LandingPage({ onGetStartedAction }: LandingPageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center px-5 py-10 text-center">
      {/* Hero */}
      <header className="max-w-xl mx-auto mt-8 sm:mt-16">
        <h1 className="text-white font-bold text-4xl sm:text-5xl tracking-tight">Sprind</h1>
        <p className="text-white/90 text-lg sm:text-xl font-medium mt-4 leading-relaxed">
          Learn vocabulary in 50 languages — with audio pronunciation, daily practice, and offline learning.
        </p>
        <p className="text-white/60 text-sm sm:text-base mt-3 leading-relaxed">
          Sprind is a language-learning app that teaches you the words and phrases you will actually use:
          greetings, travel, food, work, common phrases, and more. Pick your language, listen, repeat,
          and track your progress one word at a time.
        </p>
        <button
          onClick={onGetStartedAction}
          className="mt-7 inline-flex items-center gap-2 bg-white text-gray-900 font-semibold text-base px-8 py-3.5 rounded-2xl shadow-2xl hover:bg-white/90 transition-all"
        >
          <Icon icon="solar:rocket-bold" width="20" />
          Get started — it&apos;s free
        </button>
        <p className="text-white/40 text-xs mt-3">Free to use · Sign in with Google or Apple</p>
      </header>

      {/* Features */}
      <section aria-label="Features" className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full mt-12">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2.5">
              <Icon icon={f.icon} width="20" className="text-white" />
              <h2 className="text-white font-semibold text-sm">{f.title}</h2>
            </div>
            <p className="text-white/60 text-xs leading-relaxed mt-2">{f.text}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section aria-label="How it works" className="max-w-2xl w-full mt-10">
        <h2 className="text-white font-bold text-lg">How it works</h2>
        <ol className="text-white/60 text-sm leading-relaxed mt-3 space-y-1.5">
          <li>1. Choose the language you speak and the one you want to learn.</li>
          <li>2. Pick a topic — greetings, numbers, travel, food, verbs, common phrases…</li>
          <li>3. Listen to native pronunciation, repeat, and quiz yourself to make it stick.</li>
        </ol>
      </section>

      {/* Footer */}
      <footer className="mt-auto pt-12 pb-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/60 text-xs">
          <a href="/privacy-policy" className="hover:text-white underline-offset-2 hover:underline">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:text-white underline-offset-2 hover:underline">Terms of Service</a>
          <a href="/support" className="hover:text-white underline-offset-2 hover:underline">Support</a>
          <a href="mailto:miracburakseker@gmail.com" className="hover:text-white underline-offset-2 hover:underline">Contact</a>
        </nav>
        <p className="text-white/30 text-[11px] mt-3">© {new Date().getFullYear()} Sprind. All rights reserved.</p>
      </footer>
    </div>
  )
}
