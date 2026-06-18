'use client'

import { useEffect } from 'react'
import { installOfflineFetch } from '@/lib/offline/offline-fetch'
import { offlineManager } from '@/lib/offline/offline-manager'
import { registerOfflineIcons } from '@/lib/icons/offline-icons'
import { progressQueue } from '@/lib/offline/progress-queue'
import { reviewQueue } from '@/lib/offline/review-queue'

// Register bundled icons/flags at module load — before any <Icon> renders — so
// they appear offline instead of fetching api.iconify.design.
registerOfflineIcons()

// Installs the offline fetch interceptor and restores download-pack state as
// early as possible in the client lifecycle. Renders nothing.
export function OfflineProvider() {
  useEffect(() => {
    installOfflineFetch()
    offlineManager.init()
    if (process.env.NODE_ENV !== 'production') {
      ;(window as any).__vwOffline = offlineManager
      ;(window as any).__vwProgressQueue = progressQueue
      ;(window as any).__vwReviewQueue = reviewQueue
    }

    // Replay anything done offline (word plays + SR review grades): once on
    // mount (covers an app closed offline and reopened online) and whenever
    // connectivity returns.
    const flush = () => {
      progressQueue.flush().catch(() => {})
      reviewQueue.flushReviews().catch(() => {})
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  return null
}
