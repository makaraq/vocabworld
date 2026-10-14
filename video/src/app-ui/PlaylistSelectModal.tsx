import React from 'react'
import { AppIcon } from './icons'
import { Touch } from './motion'
import { vh } from './AppScreen'

// "Add to Playlist", the sheet opened from the example sentences
// (PlaylistSelectModal in components/learning/search-word-learning.tsx). On a
// phone it is a bottom sheet, which Liquid Glass insets and rounds all round.

export interface PlaylistRow {
  id: string
  name: string
  wordCount: number
}

export const PlaylistSelectModal: React.FC<{
  word: string
  translation: string
  playlists: PlaylistRow[]
  /** The row being added to (spinner), then added (green check). */
  adding?: string
  addedTo?: string
  touch?: { id: string; t: number }
}> = ({ word, translation, playlists, adding, addedTo, touch }) => (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-[6px] z-50 flex items-end justify-center p-0">
    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-t-3xl w-full flex flex-col shadow-2xl"
      style={{ maxHeight: vh(90) }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <h3 className="text-white font-semibold text-lg">Add to Playlist</h3>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <AppIcon icon="solar:close-circle-bold" className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="p-4 bg-white/5 border-b border-white/10 flex-shrink-0">
        <p className="text-white font-medium">{word}</p>
        <p className="text-white/60 text-sm">{translation}</p>
      </div>

      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value=""
            placeholder="New playlist name..."
            className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-3 py-2 text-white text-sm outline-none"
          />
          <button className="bg-white/10 backdrop-blur-sm border border-white/25 text-white px-4 py-2 rounded-2xl font-semibold text-sm opacity-40">
            Create
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 min-h-0">
        <div className="space-y-2">
          {playlists.map((playlist) => {
            const added = addedTo === playlist.id
            return (
              <button
                key={playlist.id}
                className={`w-full border rounded-2xl p-3 flex items-center justify-between ${
                  added ? 'bg-green-500/15 border-green-400/30' : 'bg-white/5 border-white/10'
                }`}
                style={{ position: 'relative' }}
              >
                <div className="flex items-center gap-3">
                  {added ? (
                    <AppIcon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
                  ) : adding === playlist.id ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full" />
                  ) : null}
                  <span className={added ? 'text-green-300 font-medium' : 'text-white font-medium'}>{playlist.name}</span>
                </div>
                <span className={added ? 'text-green-400/60 text-sm' : 'text-white/40 text-sm'}>
                  {added ? 'Added!' : `${playlist.wordCount} ${playlist.wordCount === 1 ? 'word' : 'words'}`}
                </span>
                {touch?.id === playlist.id && <Touch t={touch.t} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  </div>
)
