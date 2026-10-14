import React from 'react'
import { createAvatar } from '@dicebear/core'
import { funEmoji } from '@dicebear/collection'
import { AppIcon } from './icons'
import { flagIcon } from './app-data'
import { vh } from './AppScreen'

// The leaderboard sheet (components/leaderboard/leaderboard-modal.tsx), with
// the app's smiley avatars (lib/avatars/smiley-avatar.ts: DiceBear fun-emoji,
// cheerful eyes and mouths only, the same backgrounds).

export interface LeaderboardEntry {
  rank: number
  firstName: string
  avatarSeed: string
  wordsPlayed: number
  streak: number
  isCurrentUser?: boolean
}

const SMILEY_EYES = ['cute', 'wink', 'wink2', 'plain', 'glasses', 'love', 'stars', 'shades', 'closed', 'closed2', 'sleepClose']
const SMILEY_MOUTHS = ['lilSmile', 'wideSmile', 'smileTeeth', 'smileLol', 'cute', 'shy', 'plain', 'tongueOut', 'kissHeart', 'shout']
const BACKGROUNDS = ['7c3aed', 'db2777', '059ff2', '71cf62', 'fcbc34', 'd84be5', 'f6859b', '34c3a0']

const avatars = new Map<string, string>()
function smileyAvatar(seed: string): string {
  const hit = avatars.get(seed)
  if (hit) return hit
  const svg = createAvatar(funEmoji, {
    seed,
    eyes: SMILEY_EYES as never,
    mouth: SMILEY_MOUTHS as never,
    backgroundColor: BACKGROUNDS,
    radius: 50,
  }).toString()
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  avatars.set(seed, uri)
  return uri
}

const MEDALS: Record<number, string> = { 1: '#FFCE3A', 2: '#C7D0DB', 3: '#E08C4F' }

const Row: React.FC<{ entry: LeaderboardEntry }> = ({ entry }) => (
  <div
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
      entry.isCurrentUser ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-white/5'
    }`}
  >
    <div className="w-8 flex items-center justify-center flex-shrink-0">
      {MEDALS[entry.rank] ? (
        <AppIcon icon="solar:medal-ribbons-star-bold" width="22" height="22" style={{ color: MEDALS[entry.rank] }} />
      ) : (
        <span className="text-white/50 text-sm font-semibold">{entry.rank}</span>
      )}
    </div>
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
    >
      <img src={smileyAvatar(entry.avatarSeed)} alt="" className="w-full h-full object-cover rounded-full" />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-blue-200' : 'text-white'}`}>{entry.firstName}</p>
    </div>
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="text-right">
        <span className="text-white font-bold text-sm">{entry.wordsPlayed.toLocaleString('en-US')}</span>
        <span className="text-white/40 text-xs ml-1">plays</span>
      </div>
      <div className="flex items-center gap-0.5">
        <AppIcon icon="solar:fire-bold" width="14" className="text-orange-400" />
        <span className="text-orange-300 text-xs font-semibold">{entry.streak}</span>
      </div>
    </div>
  </div>
)

export const LeaderboardModal: React.FC<{
  entries: LeaderboardEntry[]
  targetLanguageCode: string
  targetLanguageName: string
  /** The sheet's entrance, 0 → 1 (translate-y-full → 0, opacity). */
  shown: number
}> = ({ entries, targetLanguageCode, targetLanguageName, shown }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-md" style={{ opacity: shown }} />
    <div
      className="relative w-full bg-white/10 backdrop-blur-2xl rounded-t-3xl shadow-2xl flex flex-col select-none"
      style={{ maxHeight: vh(85), transform: `translateY(${(1 - shown) * 100}%)`, opacity: shown }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/30" />
      </div>

      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
          <AppIcon icon="solar:cup-star-bold" width="22" className="text-yellow-400" />
          Leaderboard
        </h2>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70">
          <AppIcon icon="solar:close-circle-bold" width="20" height="20" />
        </button>
      </div>

      <div className="px-5 pb-3 space-y-2">
        <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden" role="tablist">
          <button className="flex-1 py-2 text-xs font-semibold bg-blue-500 text-white">This Week</button>
          <button className="flex-1 py-2 text-xs font-semibold text-white/50">All Time</button>
        </div>
        <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden" role="tablist">
          <button className="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 bg-blue-500 text-white">
            <AppIcon icon={flagIcon(targetLanguageCode)} width="14" />
            {targetLanguageName}
          </button>
          <button className="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 text-white/50">
            <AppIcon icon="solar:global-bold" width="14" />
            Global
          </button>
        </div>
      </div>

      <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: vh(55), overscrollBehaviorY: 'none' }}>
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <Row key={entry.rank} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  </div>
)
