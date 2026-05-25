'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[10000] flex justify-center px-4 pt-[max(env(safe-area-inset-top),12px)]">
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
