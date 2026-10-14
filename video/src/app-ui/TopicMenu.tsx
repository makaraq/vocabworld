import React from 'react'
import { Languages } from 'lucide-react'
import { SECTIONS } from './app-data'
import { SectionIcon } from './icons'
import { TopicCard, type TileState } from './TopicCard'
import { AccountSection, type AccountData } from './AccountSection'
import { MyWordsSection } from './MyWordsSection'

// The topic menu (the "confirmation" page): TopicSlider plus the language
// switcher, from components/language/language-selector.tsx. Classes are the
// app's, resolved for the 440pt width (xs: on, sm: and up off).

export interface TopicMenuProps {
  /** currentSection: drives the title, the dots and data-tour. */
  section: number
  /** Where the strip sits, in sections (fractional while it slides). */
  position?: number
  /** Seconds since the current section's header icon started drawing. */
  iconTime?: number
  tile?: TileState
  /** 0 → 1: the other tiles step back while one is chosen. */
  dimOthers?: number
  /** Entrance per tile, 0 → 1, by index within its section. */
  tileReveal?: (index: number) => number
  account: AccountData
  nativeLanguage: string
  targetLanguage: string
  /** The confirmation page's dip (opacity/scale) while it hands over. */
  contentStyle?: React.CSSProperties
  /** A finger on the ACCOUNT page's Leaderboard tile. */
  leaderboardTouch?: number
  /** A finger swiping the strip: x across the slider, in pt. */
  swipeTouch?: { x: number; opacity: number }
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  section,
  position = section,
  iconTime,
  tile,
  dimOthers = 0,
  tileReveal = () => 1,
  account,
  nativeLanguage,
  targetLanguage,
  contentStyle,
  leaderboardTouch,
  swipeTouch,
}) => {
  const current = SECTIONS[section]
  return (
    <div className="text-center h-full flex flex-col min-h-0" style={contentStyle}>
      <div className="flex-1 mb-4 min-h-0 overflow-hidden">
        {/* TopicSlider */}
        <div className="h-full flex flex-col">
          <div className="mb-2 px-3 py-1 flex-shrink-0">
            <h2 className="font-medium flex items-center justify-center gap-2.5 text-white">
              <div>
                <SectionIcon key={current.name} section={current.name} t={iconTime} />
              </div>
              <span className="text-xl tracking-wide leading-none">{current.name}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-hidden" style={{ touchAction: 'none', position: 'relative' }}>
            <div className="flex h-full" style={{ transform: `translateX(${-position * 100}%)` }}>
              {SECTIONS.map((s, sectionIndex) => (
                <div key={s.name} className="w-full h-full flex-shrink-0 px-2">
                  {s.isAccount ? (
                    <AccountSection data={account} targetLanguage={targetLanguage} leaderboardTouch={leaderboardTouch} />
                  ) : s.isMyWords ? (
                    <MyWordsSection />
                  ) : (
                    <div
                      data-tour={section === sectionIndex ? 'topic-grid' : undefined}
                      className="grid gap-2.5 h-full content-start grid-cols-2"
                    >
                      {s.topics.map((topic, i) => (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          state={tile}
                          dim={dimOthers}
                          reveal={section === sectionIndex ? tileReveal(i) : 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {swipeTouch && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: swipeTouch.x - 23,
                  top: '38%',
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 72%)',
                  boxShadow: '0 0 0 1.5px rgba(255,255,255,0.45)',
                  opacity: swipeTouch.opacity,
                  zIndex: 5,
                }}
              />
            )}
          </div>

          {/* Navigation dots — a glass capsule under Liquid Glass */}
          <nav
            data-tour="section-nav"
            className="flex justify-center gap-3 mt-3 pb-2 pt-2 px-4 flex-shrink-0"
            role="tablist"
            aria-label="Language learning sections"
          >
            {SECTIONS.map((s, index) => (
              <button
                key={s.name}
                role="tab"
                aria-selected={index === section}
                className={`relative ${
                  index === section ? 'w-3 h-3 bg-white rounded-full shadow-lg' : 'w-2.5 h-2.5 bg-white/40 rounded-full'
                }`}
                title={s.name}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Language selector at bottom */}
      <div className="flex-shrink-0 px-3 pb-3" data-tour="language-switcher">
        <div className="flex items-center justify-center gap-3 max-w-full">
          <button className="bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 shadow-lg min-w-0 scale-100">
            <p className="text-white font-medium text-sm truncate">{nativeLanguage}</p>
          </button>
          <div className="flex items-center justify-center flex-shrink-0">
            <Languages className="w-5 h-5 text-white/60" />
          </div>
          <button className="bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 shadow-lg min-w-0 scale-100">
            <p className="text-white font-medium text-sm truncate">{targetLanguage}</p>
          </button>
        </div>
      </div>
    </div>
  )
}
