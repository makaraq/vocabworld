'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { AchievementDef, tierGradient } from '@/lib/achievements/definitions'
import { hapticsSuccess } from '@/lib/haptics'

interface Props {
  achievement: AchievementDef
  onDismissAction: () => void
  /** Auto-dismiss delay in ms. 0 disables. */
  duration?: number
}

export function AchievementToast({ achievement, onDismissAction, duration = 4200 }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in on next frame so the transition runs.
    const raf = requestAnimationFrame(() => setVisible(true))
    hapticsSuccess()
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!duration) return
    const t = setTimeout(handleDismiss, duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  function handleDismiss() {
    setVisible(false)
    setTimeout(onDismissAction, 320)
  }

  return (
    <div
      className={`pointer-events-auto transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      }`}
      onClick={handleDismiss}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl px-4 py-3 flex items-center gap-3 max-w-sm mx-auto cursor-pointer hover:bg-white/15 transition-colors">
        {/* Tier-gradient badge */}
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierGradient(
            achievement.tier,
          )} flex items-center justify-center flex-shrink-0 shadow-lg`}
        >
          <Icon icon={achievement.icon} width="26" height="26" className="text-white drop-shadow" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">
            Achievement unlocked
          </div>
          <div className="text-white font-bold text-base leading-tight truncate drop-shadow">
            {achievement.title}
          </div>
          <div className="text-white/80 text-xs truncate">{achievement.description}</div>
        </div>

        <Icon
          icon="solar:close-circle-linear"
          width="20"
          height="20"
          className="text-white/50 flex-shrink-0"
        />
      </div>
    </div>
  )
}
