import React from 'react'
import { AppIcon } from './icons'

// MY WORDS, the last page of the topic menu (language-selector.tsx), with
// no playlists yet. The film never stops on it, but it is part of the strip
// the menu slides, as in the app.

export const MyWordsSection: React.FC = () => (
  <div className="h-full flex flex-col gap-3 overflow-hidden">
    <button className="flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center shadow-lg relative">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
          <AppIcon icon="solar:magnifer-bold" width="32" height="32" className="text-white" />
        </div>
        <div>
          <p className="text-white text-lg font-semibold">Search Word</p>
          <p className="text-white/60 text-sm mt-1">Find any word &amp; get translation</p>
        </div>
      </div>
    </button>

    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 flex flex-col overflow-hidden max-h-[340px] min-h-[100px]">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-white font-semibold text-base flex items-center gap-2">
          <AppIcon icon="solar:playlist-bold" width="20" height="20" className="text-blue-400" />
          My Playlists
        </h3>
        <button className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
          <AppIcon icon="solar:add-circle-bold" width="20" height="20" className="text-white/80" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="text-center py-6">
          <AppIcon icon="solar:folder-with-files-bold-duotone" width="48" height="48" className="text-white/30 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No playlists yet</p>
          <p className="text-white/40 text-xs mt-1">Search words and add them to playlists</p>
        </div>
      </div>
    </div>
  </div>
)
