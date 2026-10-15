'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { currentTheme, isPreviewing, onThemeChange, setTheme, themeById } from '@/lib/themes'

// The app's backdrop, fixed behind every screen. It draws the theme's
// --app-backdrop (set before first paint by the class on <html>), and when
// the theme changes it lays the old backdrop over the new one and fades it
// out, so the change happens in front of the user rather than as a cut.
//
// It also keeps premium themes for Premium: once the subscription is known
// and is not Premium, a kept premium theme goes back to the default.

export function ThemeBackdrop() {
  const [fading, setFading] = useState<{ key: number; from: string; out: boolean } | null>(null)
  const { isPremium, subscriptionLoading, subscriptionStatus } = useAuth()

  useEffect(
    () =>
      onThemeChange((_, from) => {
        const key = Date.now()
        setFading({ key, from, out: false })
        requestAnimationFrame(() => requestAnimationFrame(() => setFading((f) => (f?.key === key ? { ...f, out: true } : f))))
        window.setTimeout(() => setFading((f) => (f?.key === key ? null : f)), 800)
      }),
    [],
  )

  useEffect(() => {
    if (subscriptionLoading || subscriptionStatus === null || isPremium || isPreviewing()) return
    if (themeById(currentTheme()).premium) setTheme('original')
  }, [isPremium, subscriptionLoading, subscriptionStatus])

  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none" style={{ background: 'var(--app-backdrop)' }}>
      {fading && (
        <div
          key={fading.key}
          className="absolute inset-0"
          style={{
            background: fading.from,
            opacity: fading.out ? 0 : 1,
            transition: 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}
    </div>
  )
}
