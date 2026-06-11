'use client'

// TEMPORARY test harness page — delete before commit.
import { OfflineDownloadsSection } from '@/components/offline/offline-downloads-section'

export default function OfflineTestPage() {
  return (
    <div className="min-h-screen p-6 flex items-start justify-center" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' }}>
      <div className="w-full max-w-sm pt-10">
        <OfflineDownloadsSection />
      </div>
    </div>
  )
}
