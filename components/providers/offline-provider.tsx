'use client'

import { useEffect } from 'react'
import { installOfflineFetch } from '@/lib/offline/offline-fetch'
import { offlineManager } from '@/lib/offline/offline-manager'

// Installs the offline fetch interceptor and restores download-pack state as
// early as possible in the client lifecycle. Renders nothing.
export function OfflineProvider() {
  useEffect(() => {
    installOfflineFetch()
    offlineManager.init()
    if (process.env.NODE_ENV !== 'production') {
      ;(window as any).__vwOffline = offlineManager
    }
  }, [])

  return null
}
