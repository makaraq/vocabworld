'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useT } from '@/components/providers/translation-provider'
import { hapticsLight } from '@/lib/haptics'
import type { ThemeId } from '@/lib/themes'
import { ThemePicker } from './theme-picker'
import { CardGuide } from '@/components/tutorial/guide-character'

// Trying themes on the app itself. The swatches sit in a small panel at the
// foot of the screen, and its arrows move the app behind it between the
// topics, a lesson, the lesson's settings and the account page, so each
// theme can be seen live wherever it shows. While the panel is open the app
// (the [data-theme-tool-stage] element, see app/globals.css) is lifted and
// scaled to fit above it, so nothing hides underneath.
//
// It opens on the screen the app is already on: after the first lesson's
// tutorial that is the lesson, from Manage Account the account page.
//
// A crowned theme only previews here: the point is to try it on. Whether to
// ask for Premium is decided on Done (onDoneAction), not on the tap.

export type ThemeToolScreen = 'topics' | 'learning' | 'settings' | 'account'
// In the order you'd move through the app: each step is one move away.
export const THEME_TOOL_SCREENS: ThemeToolScreen[] = ['account', 'topics', 'learning', 'settings']

// Space between the app and the screen top, and between the app and the panel.
const GAP = 10
// The glass bottom sheet's margin from the screen edge (app/liquid-glass.css).
const SHEET_MARGIN = 8
// A page switch fades out and in; arrows wait for it.
const SWITCH_MS = 600

export function ThemeTool({
  open,
  screen,
  home,
  isPremium,
  onScreenAction,
  onPremiumAction,
  onDoneAction,
  guide = false,
}: {
  open: boolean
  screen: ThemeToolScreen
  /** The screen it opened on, where Done goes back to. */
  home: ThemeToolScreen
  isPremium: boolean
  onScreenAction: (screen: ThemeToolScreen) => void
  onPremiumAction: (id: ThemeId) => void
  onDoneAction: () => void
  /** The tutorial guide sits on the panel, trying themes too (first time). */
  guide?: boolean
}) {
  const { t } = useT()
  const [shown, setShown] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const lastStepRef = useRef(0)
  const closingRef = useRef(false)
  // Which way the last arrow went, so the screen name slides in from that side.
  const [dir, setDir] = useState<1 | -1>(1)
  // The panel's height, for the guide standing on its top edge.
  const [sheetHeight, setSheetHeight] = useState(0)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!open || !guide || !sheet) return
    const observer = new ResizeObserver(() => setSheetHeight(sheet.offsetHeight))
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [open, guide])

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    closingRef.current = false
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Lift and scale the app while open; let it settle back on close.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.classList.add('theme-tool-open')
    return () => {
      root.classList.remove('theme-tool-open')
      window.setTimeout(() => {
        if (root.classList.contains('theme-tool-open')) return
        root.style.removeProperty('--theme-stage-scale')
        root.style.removeProperty('--theme-stage-shift')
      }, 600)
    }
  }, [open])

  // Fit the app between the top of the screen and the panel, again after
  // each switch (the page fades, the settings modal mounts) and on resize.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const stage = document.querySelector<HTMLElement>('[data-theme-tool-stage]')
    const sheet = sheetRef.current
    if (!stage || !sheet) return

    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)'
    document.body.appendChild(probe)

    const fit = () => {
      const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0
      // Where the stage sits in the layout; offsets ignore the transform.
      let top = -window.scrollY
      for (let el: HTMLElement | null = stage; el; el = el.offsetParent as HTMLElement | null) top += el.offsetTop
      const height = stage.offsetHeight
      // A modal centred on the stage (the lesson settings) can be taller.
      const tallest = Math.max(height, ...Array.from(stage.querySelectorAll<HTMLElement>('[data-theme-tool-extent]'), (el) => el.offsetHeight))
      const regionTop = safeTop + GAP
      const room = Math.max(120, window.innerHeight - sheet.offsetHeight - SHEET_MARGIN - GAP - regionTop)
      const scale = Math.min(1, room / tallest)
      // Centre what is shown in the room; the transform's origin is the stage's top.
      const shift = regionTop + (room - tallest * scale) / 2 - top + ((tallest - height) / 2) * scale
      // Only move for a real change, so later re-measures don't restart the glide.
      const prevScale = parseFloat(root.style.getPropertyValue('--theme-stage-scale')) || 0
      const prevShift = parseFloat(root.style.getPropertyValue('--theme-stage-shift')) || 0
      if (Math.abs(prevScale - scale) < 0.005 && Math.abs(prevShift - shift) < 2) return
      root.style.setProperty('--theme-stage-scale', String(Math.round(scale * 1000) / 1000))
      root.style.setProperty('--theme-stage-shift', `${Math.round(shift)}px`)
    }

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fit)
    }
    schedule()
    const timers = [150, 400, 800].map((ms) => window.setTimeout(schedule, ms))
    const observer = new ResizeObserver(schedule)
    observer.observe(stage)
    observer.observe(sheet)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      probe.remove()
    }
  }, [open, screen])

  if (!open || typeof document === 'undefined') return null

  const step = (dir: 1 | -1) => {
    const now = Date.now()
    if (now - lastStepRef.current < SWITCH_MS) return
    lastStepRef.current = now
    const next = THEME_TOOL_SCREENS[THEME_TOOL_SCREENS.indexOf(screen) + dir]
    if (!next) return
    hapticsLight()
    setDir(dir)
    snapIfLesson(screen, next)
    onScreenAction(next)
  }
  const index = THEME_TOOL_SCREENS.indexOf(screen)

  // Between the topics and the lesson the app swaps in place: no glide to
  // the new size (app/globals.css, theme-stage-instant).
  const snapIfLesson = (from: ThemeToolScreen, to: ThemeToolScreen) => {
    const pair = [from, to].sort().join()
    if (pair !== 'learning,topics') return
    const root = document.documentElement
    root.classList.add('theme-stage-instant')
    window.setTimeout(() => root.classList.remove('theme-stage-instant'), 1000)
  }

  // Done: glide back to where it opened while the app is still small, then
  // lower the panel as the app grows back, so nothing jumps at full size.
  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    hapticsLight()
    const finish = () => {
      setShown(false)
      document.documentElement.classList.remove('theme-tool-open')
      window.setTimeout(onDoneAction, 500)
    }
    if (screen === home) return finish()
    setDir(THEME_TOOL_SCREENS.indexOf(home) > THEME_TOOL_SCREENS.indexOf(screen) ? 1 : -1)
    snapIfLesson(screen, home)
    onScreenAction(home)
    window.setTimeout(finish, SWITCH_MS)
  }

  return createPortal(
    // Covers the screen so the app behind is looked at, not used.
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-label={t('theme.intro.title')}>
      {/* The guide stands on the panel's top edge. She is the panel's
          sibling, not its child: the glass panel clips its overflow
          (app/liquid-glass.css), which would hide her. Rendered first so
          the panel covers her cut-off body, and slides in with it. */}
      {guide && sheetHeight > 0 && (
        <div
          aria-hidden
          className={`absolute bottom-0 inset-x-0 mx-auto w-full max-w-md pointer-events-none transition-[translate,opacity] duration-500 ${
            shown ? 'translate-y-0 opacity-100 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'translate-y-full opacity-0 ease-[cubic-bezier(0.55,0,0.75,0.4)]'
          }`}
          style={{ height: sheetHeight }}
        >
          <CardGuide name="themes" />
        </div>
      )}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-t-3xl shadow-2xl px-4 pt-4 space-y-3.5 transition-[translate,opacity] duration-500 ${
          shown ? 'translate-y-0 opacity-100 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'translate-y-full opacity-0 ease-[cubic-bezier(0.55,0,0.75,0.4)]'
        }`}
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between gap-3 pl-1">
          <h2 className="text-white font-bold text-base truncate">{t('theme.intro.title')}</h2>
          <button
            onClick={close}
            className="flex-shrink-0 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-1.5"
          >
            {t('theme.intro.done')}
          </button>
        </div>

        <ThemePicker compact isPremium={isPremium} onPremiumAction={onPremiumAction} />

        {/* Which screen the app behind shows */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label={t('theme.tool.previous')}
            className="disabled:opacity-35 transition-opacity w-11 h-11 flex-shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
          >
            <Icon icon="solar:alt-arrow-right-linear" width="20" className="rotate-180" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p
              key={screen}
              className={`text-white text-sm font-semibold truncate animate-in fade-in duration-500 ${dir > 0 ? 'slide-in-from-right-3' : 'slide-in-from-left-3'}`}
              aria-live="polite"
            >
              {t(`theme.tool.screen.${screen}` as const)}
            </p>
            <div className="flex justify-center gap-1.5 mt-1.5" aria-hidden="true">
              {THEME_TOOL_SCREENS.map((s) => (
                <span key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === screen ? 'w-4 bg-white' : 'w-1.5 bg-white/35'}`} />
              ))}
            </div>
          </div>
          <button
            onClick={() => step(1)}
            disabled={index === THEME_TOOL_SCREENS.length - 1}
            aria-label={t('theme.tool.next')}
            className="disabled:opacity-35 transition-opacity w-11 h-11 flex-shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
          >
            <Icon icon="solar:alt-arrow-right-linear" width="20" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
