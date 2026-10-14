import React from 'react'
import { Search } from 'lucide-react'
import { LANGUAGE_NAMES, ORDERED_LANGUAGE_CODES, flagIcon } from './app-data'
import { AppIcon } from './icons'
import { FocusRing, Touch } from './motion'

// The language picker of LanguageSelector ("native" / "target" pages), for
// the 440pt width. With English as the main language this is the "target"
// page: the question reads "I want to learn" and English is left out.

export const LanguagePicker: React.FC<{
  question: string
  /** The language already chosen on the other page, left out of the grid. */
  exclude: string
  /** holdingLanguageCode: the tile under the finger swells to 1.05. */
  holding?: { code: string; press: number; touch?: number; focus?: number }
  contentStyle?: React.CSSProperties
}> = ({ question, exclude, holding, contentStyle }) => {
  const codes = ORDERED_LANGUAGE_CODES.filter((c) => c !== exclude)
  return (
    <div className="text-center mb-12" style={contentStyle}>
      <h1 className="text-3xl font-normal text-white mb-8">{question}</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            readOnly
            value=""
            data-slot="input"
            className="flex h-12 w-full min-w-0 rounded-2xl border bg-black/40 px-3 py-1 text-base shadow-lg outline-none border-white/20 text-white placeholder:text-white/60 pl-12"
            placeholder="Search languages..."
          />
        </div>
      </div>

      {/* Language Grid. At rest the list fades under its bottom edge
          (Liquid Glass scroll edge effect, Safari 26 scroll timelines). */}
      <div
        className="max-h-96 overflow-y-auto mb-6 language-grid-container"
        style={{ ['--lg-edge-bottom' as string]: '20px' } as React.CSSProperties}
      >
        <div className="grid grid-cols-3 gap-4">
          {codes.map((code) => {
            const mine = holding?.code === code
            const press = mine ? holding.press : 0
            return (
              <button
                key={code}
                className="p-5 bg-black/40 border border-white/20 rounded-xl text-center min-h-[75px] flex flex-col items-center justify-center gap-2 shadow-lg"
                style={{ position: 'relative', transform: `scale(${1 + 0.05 * press})` }}
              >
                <AppIcon icon={flagIcon(code)} className="w-7 h-7" />
                <p className="text-white font-medium text-sm leading-tight">{LANGUAGE_NAMES[code]}</p>
                {mine && <FocusRing p={holding.focus ?? 0} radius={16} inset={0} />}
                {mine && holding.touch !== undefined && <Touch t={holding.touch} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
