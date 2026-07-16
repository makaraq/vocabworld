'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { ACHIEVEMENTS, tierGradient } from '@/lib/achievements/definitions'
import { getUnlocked, UnlockedRecord } from '@/lib/achievements/storage'
import { useAuth } from '@/contexts/auth-context'
import { openBadgesGallery, subscribeUnlock } from '@/lib/achievements/engine'
import { hapticsLight } from '@/lib/haptics'
import { useT } from '@/components/providers/translation-provider'

export function BadgesCard() {
  const { t, tRaw } = useT()
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
      onClick={() => { hapticsLight(); openBadgesGallery() }}
      onTouchStart={() => setHolding(true)}
      onTouchEnd={() => setHolding(false)}
      onTouchCancel={() => setHolding(false)}
      className={`bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20 w-full hover:bg-white/15 transition-all ${
        holding ? 'scale-[1.03]' : 'scale-100'
      }`}
      aria-label={t('badges.card.aria', { count, total })}
    >
        <div className="flex items-start justify-between mb-1.5 xs:mb-1.5 sm:mb-2">
          <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <Icon icon="solar:medal-star-bold" width="18" height="18" className="text-white" />
          </div>
          {recent.length > 0 && (
            <div className="flex -space-x-1.5">
              {recent.map((a) => (
                <div
                  key={a.id}
                  className={`w-5 h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br ${tierGradient(
                    a.tier,
                  )} ring-2 ring-black/20 flex items-center justify-center`}
                  title={tRaw(`achievements.${a.id}.title`)}
                >
                  <Icon icon={a.icon} width="11" height="11" className="text-white" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">
          {count}
          <span className="text-white/50 text-sm xs:text-base sm:text-base font-medium"> / {total}</span>
        </div>
        <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('badges.card.label')}</div>
    </button>
  )
}
