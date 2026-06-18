'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { isPairAvailableOffline, PACKS_CHANGED_EVENT } from '@/lib/offline/offline-manager'

// Shows the "You're offline" warning ONLY when the currently selected
// language pair has not been downloaded for offline use. If the pair is
// downloaded, a brief "offline mode" pill appears instead and then fades —
// the user can keep learning uninterrupted. Switching to a non-downloaded
// language while offline brings the warning back.
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [covered, setCovered] = useState(false)
  const [showPill, setShowPill] = useState(false)
  const pillTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCovered = useRef(false)

  useEffect(() => {
    const checkCoverage = () => {
      const nativeCode = localStorage.getItem('nativeLanguageCode')
      const targetCode = localStorage.getItem('targetLanguageCode')
      const isCovered = isPairAvailableOffline(nativeCode, targetCode)
      setCovered(isCovered)
      return isCovered
    }

    const flashPill = () => {
      setShowPill(true)
      if (pillTimer.current) clearTimeout(pillTimer.current)
      pillTimer.current = setTimeout(() => setShowPill(false), 4000)
    }

    const goOffline = () => {
      setIsOffline(true)
      const isCovered = checkCoverage()
      prevCovered.current = isCovered
      if (isCovered) flashPill()
    }
    const goOnline = () => {
      setIsOffline(false)
      setShowPill(false)
    }

    if (!navigator.onLine) goOffline()

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    window.addEventListener(PACKS_CHANGED_EVENT, checkCoverage as EventListener)

    // While offline, periodically re-check: the user may switch languages,
    // which only updates localStorage (no event fires for same-tab writes).
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        const isCovered = checkCoverage()
        if (isCovered && !prevCovered.current) flashPill()
        prevCovered.current = isCovered
      }
    }, 3000)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      window.removeEventListener(PACKS_CHANGED_EVENT, checkCoverage as EventListener)
      clearInterval(interval)
      if (pillTimer.current) clearTimeout(pillTimer.current)
    }
  }, [])

  if (!isOffline) return null

  // Current languages are downloaded — no warning needed
  if (covered) {
    if (!showPill) return null
    return (
      <div className="fixed inset-x-0 top-0 z-[10000] flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pointer-events-none">
        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xl border border-emerald-400/30 rounded-2xl px-4 py-2.5 shadow-2xl">
          <Icon icon="solar:cloud-check-bold" className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-white text-xs font-semibold">Offline mode — your downloaded lessons are ready</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[10000] flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-2xl max-w-sm w-full">
        <Icon icon="solar:cloud-cross-bold" className="w-6 h-6 text-orange-400 flex-shrink-0" />
        <div>
          <p className="text-white text-sm font-semibold">You&apos;re offline</p>
          <p className="text-white/60 text-xs">Check your connection to keep learning.</p>
        </div>
      </div>
    </div>
  )
}
