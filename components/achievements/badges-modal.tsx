'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { hapticsLight } from '@/lib/haptics'
import { useT } from '@/components/providers/translation-provider'
import type { UiKey } from '@/lib/i18n/ui-strings'

interface Props {
  open: boolean
  onCloseAction: () => void
}

const CATEGORY_LABEL_KEY: Record<AchievementCategory, UiKey> = {
  words: 'badges.category.words',
  topics: 'badges.category.topics',
  streak: 'badges.category.streak',
  section: 'badges.category.section',
  language: 'badges.category.language',
  time: 'badges.category.time',
  special: 'badges.category.special',
}

const CATEGORY_ORDER: AchievementCategory[] = [
  'words', 'topics', 'streak', 'section', 'language', 'time', 'special',
]

export function BadgesModal({ open, onCloseAction }: Props) {
  const { t, tRaw } = useT()
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState<UnlockedRecord[]>([])
  const [shown, setShown] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ phase: 'idle' | 'pending' | 'dragging'; startY: number; currentY: number; startTime: number }>({
    phase: 'idle', startY: 0, currentY: 0, startTime: 0,
  })
  const closingRef = useRef(false)

  const unlockedSet = useMemo(() => new Set(unlocked.map((u) => u.id)), [unlocked])

  const grouped = useMemo(() => {
    const map: Record<AchievementCategory, AchievementDef[]> = {
      words: [], topics: [], streak: [], section: [], language: [], time: [], special: [],
    }
    for (const a of ACHIEVEMENTS) map[a.category].push(a)
    return map
  }, [])

  const stats = useMemo(
    () => ({ total: ACHIEVEMENTS.length, unlocked: unlocked.length }),
    [unlocked],
  )

  const animateClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    hapticsLight()
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'
      modalRef.current.style.transform = 'translateY(100%)'
      modalRef.current.style.opacity = '0'
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'opacity 0.3s ease-out'
      backdropRef.current.style.opacity = '0'
    }
    setTimeout(() => {
      document.body.style.overflow = ''
      onCloseAction()
    }, 300)
  }, [onCloseAction])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select')) return

    const isHandle = !!target.closest('[data-drag-handle]')
    const scrollEl = scrollRef.current
    const isAtTop = !scrollEl || scrollEl.scrollTop <= 0

    if (!isHandle && !isAtTop) return

    dragState.current = {
      phase: isHandle ? 'dragging' : 'pending',
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      startTime: Date.now(),
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const s = dragState.current
    if (s.phase === 'idle') return

    const clientY = e.touches[0].clientY
    const dy = clientY - s.startY

    if (s.phase === 'pending') {
      if (dy > 8) s.phase = 'dragging'
      else if (dy < -8) { s.phase = 'idle'; return }
      else return
    }

    s.currentY = clientY
    const translateY = dy < 0 ? dy * 0.15 : dy

    if (modalRef.current) {
      modalRef.current.style.transform = `translateY(${translateY}px)`
      modalRef.current.style.transition = 'none'
    }
    if (backdropRef.current && dy > 0) {
      backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / 400))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const s = dragState.current
    if (s.phase !== 'dragging') { s.phase = 'idle'; return }
    s.phase = 'idle'

    const dy = s.currentY - s.startY
    const dt = Date.now() - s.startTime
    const velocity = dy / Math.max(dt, 1)

    if (dy > 100 || velocity > 0.4) {
      animateClose()
    } else {
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
        modalRef.current.style.transform = 'translateY(0)'
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.3s ease'
        backdropRef.current.style.opacity = '1'
      }
    }
  }, [animateClose])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (!target.closest('[data-drag-handle]') || target.closest('button')) return

    e.preventDefault()
    const startY = e.clientY
    const startTime = Date.now()
    let currentY = startY

    const onMove = (ev: MouseEvent) => {
      currentY = ev.clientY
      const dy = currentY - startY
      const translateY = dy < 0 ? dy * 0.15 : dy
      if (modalRef.current) {
        modalRef.current.style.transform = `translateY(${translateY}px)`
        modalRef.current.style.transition = 'none'
      }
      if (backdropRef.current && dy > 0) {
        backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / 400))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const dy = currentY - startY
      const dt = Date.now() - startTime
      const velocity = dy / Math.max(dt, 1)
      if (dy > 100 || velocity > 0.4) {
        animateClose()
      } else {
        if (modalRef.current) {
          modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
          modalRef.current.style.transform = 'translateY(0)'
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 0.3s ease'
          backdropRef.current.style.opacity = '1'
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [animateClose])

  useEffect(() => {
    if (open) {
      closingRef.current = false
      setUnlocked(getUnlocked(user?.id))
      modalRef.current?.style.removeProperty('transform')
      modalRef.current?.style.removeProperty('transition')
      modalRef.current?.style.removeProperty('opacity')
      backdropRef.current?.style.removeProperty('opacity')
      backdropRef.current?.style.removeProperty('transition')
      document.body.style.overflow = 'hidden'
      const raf = requestAnimationFrame(() => setShown(true))
      return () => {
        cancelAnimationFrame(raf)
        document.body.style.overflow = ''
      }
    }
    setShown(false)
    return () => { document.body.style.overflow = '' }
  }, [open, user?.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animateClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, animateClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('badges.modal.title')}>
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={animateClose}
      />
      <div
        ref={modalRef}
        className={`relative w-full sm:max-w-2xl max-h-[92vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 select-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle */}
        <div data-drag-handle className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div data-drag-handle className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide drop-shadow-lg">{t('badges.modal.title')}</h2>
            <p className="text-white/70 text-sm">
              {t('badges.modal.unlockedOf', { unlocked: stats.unlocked, total: stats.total })}
            </p>
          </div>
          <button
            onClick={animateClose}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
            aria-label={t('common.close')}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-6 space-y-5" style={{ overscrollBehaviorY: 'none' }}>
          {/* Borders section */}
          <section>
            <h3 className="text-white/90 font-semibold text-sm uppercase tracking-wider mb-2.5">
              {t('badges.borders.title')}
            </h3>
            <p className="text-white/50 text-[11px] mb-2.5">{t('badges.borders.desc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {([
                { nameKey: 'badges.border.beginner', times: 1, border: 'border-white/80', bg: 'bg-white/20', icon: 'solar:star-bold' },
                { nameKey: 'badges.border.explorer', times: 2, border: 'border-green-400', bg: 'bg-green-400/20', icon: 'solar:compass-bold' },
                { nameKey: 'badges.border.adventurer', times: 3, border: 'border-orange-400', bg: 'bg-orange-400/20', icon: 'solar:fire-bold' },
                { nameKey: 'badges.border.master', times: 4, border: 'border-red-400', bg: 'bg-red-400/20', icon: 'solar:crown-bold' },
                { nameKey: 'badges.border.legend', times: 5, border: 'border-purple-400', bg: 'bg-purple-400/20', icon: 'solar:shield-star-bold' },
              ] as const).map((tier) => (
                <div
                  key={tier.nameKey}
                  className={`relative rounded-xl border-2 ${tier.border} p-3 ${tier.bg}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10`}>
                      <Icon icon={tier.icon} width="22" height="22" className="text-white drop-shadow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold text-[13px] leading-tight">
                        {t(tier.nameKey)}
                      </div>
                      <div className="text-white/60 text-[11px] leading-snug mt-0.5">
                        {t('badges.border.completedTimes', { n: tier.times })}
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
                  {t(CATEGORY_LABEL_KEY[cat])}
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
                              {tRaw(`achievements.${a.id}.title`)}
                            </div>
                            <div className="text-white/60 text-[11px] leading-snug mt-0.5">
                              {tRaw(`achievements.${a.id}.description`)}
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
