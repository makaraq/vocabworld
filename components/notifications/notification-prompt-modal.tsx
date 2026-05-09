'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'

interface Props {
  open: boolean
  onOpenSettings: () => void
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
    icon: 'solar:clock-circle-bold',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    title: 'Daily practice habit',
    desc: 'A nudge at your chosen time keeps the momentum going every day',
  },
  {
    icon: 'solar:refresh-circle-bold',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    title: 'Review sessions',
    desc: "Revisit yesterday's words 24 h later to lock them into long-term memory",
  },
]

export function NotificationPromptModal({ open, onOpenSettings, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!open || !mounted) return null

  const handleOpenSettings = () => {
    onOpenSettings()
    onDismiss()
  }

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
              onClick={handleOpenSettings}
              className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white font-semibold rounded-2xl py-3.5 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Icon icon="solar:settings-bold" width="16" />
              Enable in Settings
            </button>
            <button
              onClick={onDismiss}
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
