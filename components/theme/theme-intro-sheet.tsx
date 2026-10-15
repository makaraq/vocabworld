'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/providers/translation-provider'
import { hapticsLight } from '@/lib/haptics'
import type { ThemeId } from '@/lib/themes'
import { ThemePicker } from './theme-picker'

// Shown once, right after the first tutorial: the theme swatches over a
// light scrim, so each tap visibly restyles the app behind the sheet.

export function ThemeIntroSheet({
  open,
  isPremium,
  onPremiumAction,
  onDoneAction,
}: {
  open: boolean
  isPremium: boolean
  onPremiumAction: (id: ThemeId) => void
  onDoneAction: () => void
}) {
  const { t } = useT()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const close = () => {
    hapticsLight()
    setShown(false)
    window.setTimeout(onDoneAction, 300)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('theme.intro.title')}>
      <div className={`absolute inset-0 bg-black/15 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
      <div
        className={`relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-t-3xl shadow-2xl px-5 pt-5 space-y-4 transition-all duration-300 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="space-y-1 text-center">
          <h2 className="text-white font-bold text-lg">{t('theme.intro.title')}</h2>
          <p className="text-white/60 text-sm">{t('theme.intro.body')}</p>
        </div>
        <ThemePicker isPremium={isPremium} onPremiumAction={onPremiumAction} />
        <button
          onClick={close}
          className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-white/15 transition-all"
        >
          {t('theme.intro.done')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
