'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { hapticsLight } from '@/lib/haptics'

type Variant = 'enable' | 'settings'

interface Props {
  open: boolean
  /**
   * 'enable'   → button "Enable notifications" → triggers OS permission dialog
   *              (use when the user dismissed the setup screen but the OS
   *              permission dialog has not been shown yet)
   * 'settings' → button "Enable in Settings"   → opens iOS Settings
   *              (use after the OS dialog was denied; the only path forward
   *              is the system settings app)
   */
  variant?: Variant
  onPrimary: () => void
  onDismiss: () => void
}

const BENEFITS = [
  {
    icon: 'solar:fire-bold',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    title: 'Your streak is at risk',
    desc: 'Without a reminder you could forget and lose your streak overnight',
  },
  {
    icon: 'solar:bell-bing-bold',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    title: 'Gentle nudges',
    desc: "A timely reminder so a busy day doesn't cost you your progress",
  },
  {
    icon: 'solar:refresh-circle-bold',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    title: 'Review sessions',
    desc: "Revisit yesterday's words 24 h later to lock them into long-term memory",
  },
]

export function NotificationPromptModal({
  open,
  variant = 'settings',
  onPrimary,
  onDismiss,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!open || !mounted) return null

  const isEnable = variant === 'enable'
  const primaryLabel = isEnable ? 'Enable notifications' : 'Enable in Settings'
  const primaryIcon = isEnable ? 'solar:bell-bing-bold' : 'solar:settings-bold'

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md">

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm mx-auto bg-white/10 backdrop-blur-2xl border border-white/20 border-b-0 sm:border-b rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        <div className="p-6 space-y-5 pb-8 sm:pb-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Icon icon="solar:fire-bold" width="28" className="text-amber-400" />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center space-y-1.5">
            <h2 className="text-white text-xl font-bold">Don't lose your streak</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Notifications help you stay consistent — without them your streak, daily habit, and review sessions are all at risk.
            </p>
          </div>

          {/* Benefit rows */}
          <div className="space-y-2.5">
            {BENEFITS.map(b => (
              <div key={b.title} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${b.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon icon={b.icon} width="18" className={b.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{b.title}</p>
                  <p className="text-white/50 text-xs">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => { hapticsLight(); onPrimary() }}
              className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white font-semibold rounded-2xl py-3.5 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Icon icon={primaryIcon} width="16" />
              {primaryLabel}
            </button>
            <button
              onClick={() => { hapticsLight(); onDismiss() }}
              className="w-full text-white/40 text-sm py-2.5 rounded-2xl active:bg-white/5 transition-all"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
