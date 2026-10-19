'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useT } from '@/components/providers/translation-provider'
import { hapticsLight } from '@/lib/haptics'
import type { ThemeId } from '@/lib/themes'
import { ThemePicker } from './theme-picker'

// Trying themes on the app itself. The swatches sit in a small panel at the
// foot of the screen, and its arrows move the app behind it between the
// topics, a lesson, the lesson's settings and the account page, so each
// theme can be seen live wherever it shows. While the panel is open the app
// (the [data-theme-tool-stage] element, see app/globals.css) is lifted and
// scaled to fit above it, so nothing hides underneath.
//
// It opens on the screen the app is already on: after the first lesson's
// tutorial that is the lesson, from Manage Account the account page.

export type ThemeToolScreen = 'topics' | 'learning' | 'settings' | 'account'
export const THEME_TOOL_SCREENS: ThemeToolScreen[] = ['topics', 'learning', 'settings', 'account']

// Space between the app and the screen top, and between the app and the panel.
const GAP = 10
// The glass bottom sheet's margin from the screen edge (app/liquid-glass.css).
const SHEET_MARGIN = 8
// A page switch fades out and in; arrows wait for it.
const SWITCH_MS = 450

export function ThemeTool({
  open,
  screen,
  isPremium,
  onScreenAction,
  onPremiumAction,
  onDoneAction,
}: {
  open: boolean
  screen: ThemeToolScreen
  isPremium: boolean
  onScreenAction: (screen: ThemeToolScreen) => void
  onPremiumAction: (id: ThemeId) => void
  onDoneAction: () => void
}) {
  const { t } = useT()
  const [shown, setShown] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const lastStepRef = useRef(0)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
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
    hapticsLight()
    const n = THEME_TOOL_SCREENS.length
    onScreenAction(THEME_TOOL_SCREENS[(THEME_TOOL_SCREENS.indexOf(screen) + dir + n) % n])
  }

  const close = () => {
    hapticsLight()
    setShown(false)
    document.documentElement.classList.remove('theme-tool-open')
    window.setTimeout(onDoneAction, 300)
  }

  return createPortal(
    // Covers the screen so the app behind is looked at, not used.
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-label={t('theme.intro.title')}>
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-t-3xl shadow-2xl px-4 pt-4 space-y-3.5 transition-all duration-300 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
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
            aria-label={t('theme.tool.previous')}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
          >
            <Icon icon="solar:alt-arrow-right-linear" width="20" className="rotate-180" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-white text-sm font-semibold truncate" aria-live="polite">
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
            aria-label={t('theme.tool.next')}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
          >
            <Icon icon="solar:alt-arrow-right-linear" width="20" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
