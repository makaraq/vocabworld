'use client'

// The app's topic menu, sitting below the download button — swiped the way
// the app swipes it, through the same seven sections, with the same topics in
// the same order, the same mdi tile icons, the same section dots and language
// pills as components/language/language-selector.tsx.
//
// The slider is built like the real one: every section is laid out side by
// side in a strip, the strip follows the finger by writing `transform`
// straight to the node (no state per frame), and it snaps on release with the
// same threshold and the same curve. The ACCOUNT page is left out — its
// numbers would be a fiction — so this starts on FIRST AID KIT, the app's own
// default.
//
// Everything here is a still: the playlists below are fixed copy, and the only
// thing any tap does is go to the App Store. A drag never counts as a tap.
//
// Drawn in the brand orange on the page's own paper rather than mocked up as
// a screenshot.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Languages } from 'lucide-react'
import { AppStoreLink } from '@/components/landing/app-store-button'
import { SHOWCASE_SECTIONS } from '@/components/landing/landing-sections'

// Everything but ACCOUNT, so the strip opens on FIRST AID KIT like the app.
const SECTIONS = SHOWCASE_SECTIONS.filter((s) => s.name !== 'ACCOUNT')

/** Fixed copy standing in for a showcase account's playlists. */
const PLAYLISTS = [
  { name: 'Market Spanish', words: 42 },
  { name: 'Phone calls', words: 28 },
  { name: 'Tricky verbs', words: 19 },
  { name: 'Small talk', words: 16 },
]

/** A drag beyond this many px is a swipe, so it must not open the App Store. */
const SWIPE_SLOP = 10
/** The app's own snap curve. */
const SNAP = 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)'

export function MenuShowcase() {
  const [index, setIndex] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  const drag = useRef({ startX: 0, dx: 0, width: 0, moved: false, active: false, id: -1 })

  const place = useCallback((section: number, offset: number, animate: boolean) => {
    const el = strip.current
    if (!el) return
    const width = drag.current.width || el.clientWidth || 1
    el.style.transition = animate ? SNAP : 'none'
    el.style.transform = `translateX(${-section * 100 + (offset / width) * 100}%)`
  }, [])

  // Keep the strip in step when the dots move it, and on resize.
  useEffect(() => {
    place(index, 0, true)
  }, [index, place])

  useEffect(() => {
    const onResize = () => place(index, 0, false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [index, place])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      drag.current = {
        startX: e.clientX,
        dx: 0,
        // One section's width, not the whole strip's.
        width: (e.currentTarget as HTMLElement).clientWidth || 1,
        moved: false,
        active: true,
        id: e.pointerId,
      }
      // Capture, so the drag survives leaving the panel and no stray move
      // from another pointer can nudge the strip.
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // Safari throws on an already-released pointer; the drag still works.
      }
      place(index, 0, false)
    },
    [index, place],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d.active || e.pointerId !== d.id) return
      // A mouse that is not held down is not dragging, whatever the browser
      // decides to send us.
      if (e.pointerType === 'mouse' && e.buttons === 0) return
      d.dx = e.clientX - d.startX
      if (Math.abs(d.dx) > SWIPE_SLOP) d.moved = true
      // Resist at the ends, the way the real menu does.
      const atEnd = (d.dx > 0 && index === 0) || (d.dx < 0 && index === SECTIONS.length - 1)
      place(index, atEnd ? d.dx * 0.25 : d.dx, false)
    },
    [index, place],
  )

  const onPointerUp = useCallback(() => {
    const d = drag.current
    if (!d.active) {
      // Whatever happened, never leave the strip resting off-centre.
      place(index, 0, true)
      return
    }
    d.active = false
    d.id = -1

    // Same rule as the app: 50px, or 15% of the width, whichever is smaller —
    // or any drag that crossed 30% of the way across.
    const threshold = Math.min(50, d.width * 0.15)
    const travelled = Math.abs(d.dx) / d.width
    let next = index
    if ((-d.dx > threshold || (d.dx < 0 && travelled > 0.3)) && index < SECTIONS.length - 1) {
      next = index + 1
    } else if ((d.dx > threshold || (d.dx > 0 && travelled > 0.3)) && index > 0) {
      next = index - 1
    }

    place(next, 0, true)
    if (next !== index) setIndex(next)
  }, [index, place])

  // A swipe must not follow the link underneath it.
  const guard = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }, [])

  return (
    <section aria-label="A look at the app" className="relative z-10 w-full max-w-md mx-auto">
      <div
        className="rounded-[28px] border border-[#FF5B1A]/15 bg-[#FF5B1A]/[0.04] px-4 py-5 sm:px-5 select-none"
        onClickCapture={guard}
      >
        {/* Section title */}
        <h2 className="font-semibold flex items-center justify-center gap-2.5 text-[#B8390A] mb-4">
          <span
            className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: SECTIONS[index].icon }}
          />
          <span className="text-base sm:text-lg tracking-wide leading-none">
            {SECTIONS[index].name}
          </span>
        </h2>

        {/* The slider: every section side by side, the strip follows the drag */}
        {/* The panes carry their own side padding, and the slider pulls it
            back out, so neighbours keep a gutter mid-swipe without the tiles
            sitting any narrower. */}
        <div
          className="overflow-hidden touch-pan-y -mx-3 sm:-mx-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <AppStoreLink label="Download Sprind on the App Store" className="block cursor-pointer">
            <div ref={strip} className="flex" style={{ willChange: 'transform' }}>
              {SECTIONS.map((section) => (
                <div
                  key={section.name}
                  // One fixed height for every section, so the panel never
                  // jumps as you swipe past a shorter one.
                  className="w-full flex-shrink-0 px-3 sm:px-4 min-h-[478px] sm:min-h-[542px] content-start"
                >
                  {section.name === 'MY WORDS' ? (
                    <MyWords />
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 content-start">
                      {section.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="bg-[#FF5B1A] rounded-2xl p-3 sm:p-4 text-center h-28 sm:h-32 shadow-[0_12px_28px_-16px_rgba(255,91,26,0.9)]"
                        >
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <Icon icon={topic.icon} className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            <p className="text-white text-sm sm:text-base font-medium leading-tight">
                              {topic.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AppStoreLink>
        </div>

        {/* Section dots — tapping one moves, like the real nav */}
        <div className="flex justify-center gap-2.5 mt-5">
          {SECTIONS.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-label={s.name}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-[#FF5B1A]' : 'bg-[#FF5B1A]/25'
              }`}
            />
          ))}
        </div>

        {/* Language pills */}
        <AppStoreLink label="Download Sprind on the App Store" className="block">
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="rounded-xl border border-[#FF5B1A]/30 bg-white p-2.5 flex-1 min-w-0">
              <p className="text-[#B8390A] font-medium text-sm truncate">English</p>
            </div>
            <Languages className="w-5 h-5 text-[#FF5B1A]/60 flex-shrink-0" />
            <div className="rounded-xl border border-[#FF5B1A]/30 bg-white p-2.5 flex-1 min-w-0">
              <p className="text-[#B8390A] font-medium text-sm truncate">Spanish</p>
            </div>
          </div>
        </AppStoreLink>
      </div>

      <p className="text-[#0D0B0A]/35 text-xs text-center mt-4">
        Swipe through the topics. Tap anywhere to get the app.
      </p>
    </section>
  )
}

/** MY WORDS: the Search Word card the app leads with, then the playlists. */
function MyWords() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-[#FF5B1A]/25 bg-white p-4 sm:p-5 text-center shadow-[0_12px_28px_-20px_rgba(255,91,26,0.8)]">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FF5B1A]/10 rounded-full flex items-center justify-center">
            <Icon icon="solar:magnifer-bold" className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF5B1A]" />
          </div>
          <div>
            <p className="text-[#0D0B0A] text-lg sm:text-xl font-semibold">Search Word</p>
            <p className="text-[#0D0B0A]/45 text-sm mt-1">Look up any word and save it</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#FF5B1A]/20 bg-white/60 p-3 sm:p-4">
        <h3 className="text-[#B8390A] font-semibold text-base flex items-center gap-2 mb-3">
          <Icon icon="solar:playlist-bold" className="w-5 h-5" />
          My Playlists
        </h3>
        <div className="space-y-2">
          {PLAYLISTS.map((playlist) => (
            <div
              key={playlist.name}
              className="flex items-center justify-between gap-3 bg-[#FF5B1A] rounded-xl px-3.5 py-2.5"
            >
              <p className="text-white font-medium text-sm truncate">{playlist.name}</p>
              <p className="text-white/80 text-xs flex-shrink-0">{playlist.words} words</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
