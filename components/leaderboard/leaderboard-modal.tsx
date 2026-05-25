"use client"

import React, { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
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

  useEffect(() => {
    if (!open || !user?.id) return
    fetchLeaderboard()
  }, [open, user?.id, period, scope, targetLanguageCode])

  const fetchLeaderboard = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        period,
        scope,
      })
      if (scope === 'language') {
        params.set('targetLanguageCode', targetLanguageCode)
      }
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
  }

  const rankAccent = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500'
    if (rank === 2) return 'from-slate-300 to-slate-400'
    if (rank === 3) return 'from-orange-400 to-amber-600'
    return 'from-white/20 to-white/10'
  }

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
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {rankEmoji(entry.rank) ? (
          <span className="text-lg">{rankEmoji(entry.rank)}</span>
        ) : (
          <span className="text-white/50 text-sm font-semibold">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
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

      {/* Name */}
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

      {/* Stats */}
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

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onCloseAction() }}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="border-0 p-0 rounded-t-3xl overflow-hidden bg-white/10 backdrop-blur-2xl"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <SheetTitle className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
            <Icon icon="solar:cup-star-bold" width="22" className="text-yellow-400" />
            Leaderboard
          </SheetTitle>
          <button
            onClick={onCloseAction}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
            aria-label="Close leaderboard"
          >
            <Icon icon="solar:close-circle-bold" width="20" height="20" />
          </button>
        </div>

        {/* Toggles */}
        <div className="px-5 pb-3 space-y-2">
          {/* Period toggle */}
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

          {/* Scope toggle */}
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

        {/* Leaderboard list */}
        <div className="px-5 pb-6 overflow-y-auto max-h-[55vh]">
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

          {/* Pinned current user if not in top 20 */}
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
      </SheetContent>
    </Sheet>
  )
}
