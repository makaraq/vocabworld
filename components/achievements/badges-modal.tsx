'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import {
  ACHIEVEMENTS,
  AchievementCategory,
  AchievementDef,
  tierGradient,
} from '@/lib/achievements/definitions'
import { getUnlocked, UnlockedRecord } from '@/lib/achievements/storage'
import { useAuth } from '@/contexts/auth-context'

interface Props {
  open: boolean
  onCloseAction: () => void
}

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  words: 'Words',
  topics: 'Topics',
  streak: 'Streaks',
  section: 'Sections',
  language: 'Languages',
  time: 'Special Times',
  special: 'Special',
}

const CATEGORY_ORDER: AchievementCategory[] = [
  'words',
  'topics',
  'streak',
  'section',
  'language',
  'time',
  'special',
]

export function BadgesModal({ open, onCloseAction }: Props) {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState<UnlockedRecord[]>([])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setUnlocked(getUnlocked(user?.id))
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
  }, [open, user?.id])

  const unlockedSet = useMemo(() => new Set(unlocked.map((u) => u.id)), [unlocked])

  const grouped = useMemo(() => {
    const map: Record<AchievementCategory, AchievementDef[]> = {
      words: [],
      topics: [],
      streak: [],
      section: [],
      language: [],
      time: [],
      special: [],
    }
    for (const a of ACHIEVEMENTS) map[a.category].push(a)
    return map
  }, [])

  const stats = useMemo(
    () => ({
      total: ACHIEVEMENTS.length,
      unlocked: unlocked.length,
    }),
    [unlocked],
  )

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCloseAction}
      />
      <div
        className={`relative w-full sm:max-w-2xl max-h-[92vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide drop-shadow-lg">Badges</h2>
            <p className="text-white/70 text-sm">
              {stats.unlocked} of {stats.total} unlocked
            </p>
          </div>
          <button
            onClick={onCloseAction}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <Icon icon="solar:close-circle-linear" width="20" height="20" className="text-white" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
          {/* Borders section */}
          <section>
            <h3 className="text-white/90 font-semibold text-sm uppercase tracking-wider mb-2.5">
              Borders
            </h3>
            <p className="text-white/50 text-[11px] mb-2.5">Complete a topic multiple times to earn border colors.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {([
                { name: 'Beginner', desc: '1x completed', border: 'border-white/80', bg: 'bg-white/20', icon: 'solar:star-bold' },
                { name: 'Explorer', desc: '2x completed', border: 'border-green-400', bg: 'bg-green-400/20', icon: 'solar:compass-bold' },
                { name: 'Adventurer', desc: '3x completed', border: 'border-orange-400', bg: 'bg-orange-400/20', icon: 'solar:fire-bold' },
                { name: 'Master', desc: '4x completed', border: 'border-red-400', bg: 'bg-red-400/20', icon: 'solar:crown-bold' },
                { name: 'Legend', desc: '5x completed', border: 'border-purple-400', bg: 'bg-purple-400/20', icon: 'solar:crown-star-bold' },
              ] as const).map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-xl border-2 ${tier.border} p-3 ${tier.bg}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10`}>
                      <Icon icon={tier.icon} width="22" height="22" className="text-white drop-shadow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold text-[13px] leading-tight">
                        {tier.name}
                      </div>
                      <div className="text-white/60 text-[11px] leading-snug mt-0.5">
                        {tier.desc}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat]
            if (list.length === 0) return null
            return (
              <section key={cat}>
                <h3 className="text-white/90 font-semibold text-sm uppercase tracking-wider mb-2.5">
                  {CATEGORY_LABEL[cat]}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {list.map((a) => {
                    const got = unlockedSet.has(a.id)
                    return (
                      <div
                        key={a.id}
                        className={`relative rounded-xl border p-3 transition-all ${
                          got
                            ? 'bg-white/10 border-white/25'
                            : 'bg-white/5 border-white/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              got
                                ? `bg-gradient-to-br ${tierGradient(a.tier)} shadow-lg`
                                : 'bg-white/10'
                            }`}
                          >
                            <Icon
                              icon={got ? a.icon : 'solar:lock-keyhole-bold'}
                              width="22"
                              height="22"
                              className="text-white drop-shadow"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-semibold text-[13px] leading-tight">
                              {a.title}
                            </div>
                            <div className="text-white/60 text-[11px] leading-snug mt-0.5">
                              {a.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
