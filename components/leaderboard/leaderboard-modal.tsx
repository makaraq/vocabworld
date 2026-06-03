"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import { useAuth } from "@/contexts/auth-context"
import { getFlagIcon } from "@/utils/flags"

interface LeaderboardEntry {
  rank: number
  userId: string
  firstName: string | null
  avatarUrl: string | null
  wordsPlayed: number
  streak: number
  isCurrentUser: boolean
}

interface LeaderboardModalProps {
  open: boolean
  onCloseAction: () => void
  targetLanguageCode: string
  targetLanguageName: string
}

export function LeaderboardModal({
  open,
  onCloseAction,
  targetLanguageCode,
  targetLanguageName,
}: LeaderboardModalProps) {
  const { user } = useAuth()
  const [period, setPeriod] = useState<'week' | 'alltime'>('week')
  const [scope, setScope] = useState<'language' | 'global'>('language')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ phase: 'idle' | 'pending' | 'dragging'; startY: number; currentY: number; startTime: number }>({
    phase: 'idle', startY: 0, currentY: 0, startTime: 0,
  })
  const closingRef = useRef(false)

  const fetchLeaderboard = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId: user.id, period, scope })
      if (scope === 'language') params.set('targetLanguageCode', targetLanguageCode)
      const res = await fetch(`/api/leaderboard?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setCurrentUserRank(data.currentUserRank || null)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, period, scope, targetLanguageCode])

  const animateClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
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
    if (target.closest('button, a, input, select, [role="tab"]')) return

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
    if (!open || !user?.id) return
    fetchLeaderboard()
  }, [open, user?.id, fetchLeaderboard])

  useEffect(() => {
    if (open) {
      closingRef.current = false
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
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animateClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, animateClose])

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getInitial = (entry: LeaderboardEntry) => {
    if (entry.firstName) return entry.firstName[0].toUpperCase()
    return '#'
  }

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.firstName) return entry.firstName
    const hash = entry.userId.slice(-4).toUpperCase()
    return `Learner #${hash}`
  }

  const renderRow = (entry: LeaderboardEntry) => (
    <div
      key={entry.userId}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        entry.isCurrentUser
          ? 'bg-blue-500/20 border border-blue-400/30'
          : 'bg-white/5'
      }`}
    >
      <div className="w-8 text-center flex-shrink-0">
        {rankEmoji(entry.rank) ? (
          <span className="text-lg">{rankEmoji(entry.rank)}</span>
        ) : (
          <span className="text-white/50 text-sm font-semibold">{entry.rank}</span>
        )}
      </div>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
      >
        {entry.avatarUrl ? (
          <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <span className="text-white font-semibold text-xs">{getInitial(entry)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          entry.isCurrentUser ? 'text-blue-200' : 'text-white'
        }`}>
          {getDisplayName(entry)}
          {entry.isCurrentUser && !entry.firstName && (
            <span className="text-blue-300/70 text-xs ml-1.5">(you)</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <span className="text-white font-bold text-sm">{entry.wordsPlayed.toLocaleString()}</span>
          <span className="text-white/40 text-xs ml-1">plays</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Icon icon="solar:fire-bold" width="14" className="text-orange-400" />
          <span className="text-orange-300 text-xs font-semibold">{entry.streak}</span>
        </div>
      </div>
    </div>
  )

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Leaderboard">
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={animateClose}
      />
      <div
        ref={modalRef}
        className={`relative w-full max-h-[85vh] bg-white/10 backdrop-blur-2xl rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 select-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div data-drag-handle className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        <div data-drag-handle className="flex items-center justify-between px-5 pt-2 pb-3 cursor-grab active:cursor-grabbing">
          <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
            <Icon icon="solar:cup-star-bold" width="22" className="text-yellow-400" />
            Leaderboard
          </h2>
          <button
            onClick={animateClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all cursor-pointer"
            aria-label="Close leaderboard"
          >
            <Icon icon="solar:close-circle-bold" width="20" height="20" />
          </button>
        </div>

        <div className="px-5 pb-3 space-y-2">
          <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden" role="tablist" aria-label="Leaderboard time period">
            {([['week', 'This Week'], ['alltime', 'All Time']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${
                  period === key ? 'bg-blue-500 text-white' : 'text-white/50 active:bg-white/10'
                }`}
                role="tab"
                aria-selected={period === key}
                aria-label={label}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden" role="tablist" aria-label="Leaderboard scope">
            <button
              onClick={() => setScope('language')}
              className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                scope === 'language' ? 'bg-blue-500 text-white' : 'text-white/50 active:bg-white/10'
              }`}
              role="tab"
              aria-selected={scope === 'language'}
              aria-label={`${targetLanguageName} leaderboard`}
            >
              <Icon icon={getFlagIcon(targetLanguageCode)} width="14" />
              {targetLanguageName}
            </button>
            <button
              onClick={() => setScope('global')}
              className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                scope === 'global' ? 'bg-blue-500 text-white' : 'text-white/50 active:bg-white/10'
              }`}
              role="tab"
              aria-selected={scope === 'global'}
              aria-label="Global leaderboard"
            >
              <Icon icon="solar:global-bold" width="14" />
              Global
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="px-5 pb-6 overflow-y-auto max-h-[55vh]" style={{ overscrollBehaviorY: 'none' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="solar:cup-star-bold" width="40" className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No activity yet</p>
              <p className="text-white/25 text-xs mt-1">Start learning to appear on the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map(renderRow)}
            </div>
          )}

          {currentUserRank && !entries.some(e => e.isCurrentUser) && (
            <>
              <div className="flex items-center gap-2 py-2 px-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-[10px]">Your position</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              {renderRow(currentUserRank)}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
