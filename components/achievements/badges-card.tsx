'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { ACHIEVEMENTS, tierGradient } from '@/lib/achievements/definitions'
import { getUnlocked, UnlockedRecord } from '@/lib/achievements/storage'
import { useAuth } from '@/contexts/auth-context'
import { openBadgesGallery, subscribeUnlock } from '@/lib/achievements/engine'

export function BadgesCard() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState<UnlockedRecord[]>([])
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    setUnlocked(getUnlocked(user?.id))
  }, [user?.id])

  // Refresh when a new badge is unlocked while the card is on screen.
  useEffect(() => {
    return subscribeUnlock(() => {
      setUnlocked(getUnlocked(user?.id))
    })
  }, [user?.id])

  const total = ACHIEVEMENTS.length
  const count = unlocked.length

  // Newest first, take 3 for the preview row.
  const recent = [...unlocked]
    .sort((a, b) => b.unlockedAt - a.unlockedAt)
    .slice(0, 3)
    .map((u) => ACHIEVEMENTS.find((a) => a.id === u.id))
    .filter(Boolean) as typeof ACHIEVEMENTS

  return (
    <button
      onClick={() => openBadgesGallery()}
      onTouchStart={() => setHolding(true)}
      onTouchEnd={() => setHolding(false)}
      onTouchCancel={() => setHolding(false)}
      className={`bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 text-left w-full hover:bg-white/15 transition-all ${
        holding ? 'scale-[1.03]' : 'scale-100'
      }`}
    >
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <Icon icon="solar:medal-star-bold" width="18" height="18" className="text-white" />
          </div>
          {recent.length > 0 && (
            <div className="flex -space-x-1.5">
              {recent.map((a) => (
                <div
                  key={a.id}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br ${tierGradient(
                    a.tier,
                  )} ring-2 ring-black/20 flex items-center justify-center`}
                  title={a.title}
                >
                  <Icon icon={a.icon} width="11" height="11" className="text-white" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white">
          {count}
          <span className="text-white/50 text-sm sm:text-base font-medium"> / {total}</span>
        </div>
        <div className="text-[10px] sm:text-xs text-white/90">Badges</div>
    </button>
  )
}
