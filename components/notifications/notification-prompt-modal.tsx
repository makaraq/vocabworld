'use client'

/**
 * NotificationPromptModal
 *
 * Shown ONLY when the iOS native permission dialog has been denied.
 * Explains the benefits of notifications and directs the user to iOS Settings.
 */

import React from 'react'
import { Icon } from '@iconify/react'

interface Props {
  open: boolean
  onOpenSettings: () => void   // opens iOS Settings → app notification page
  onDismiss: () => void        // close + mark as prompted in localStorage
}

const BENEFITS = [
  {
    icon: 'solar:fire-bold',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    title: 'Streak protection',
    desc: 'Get a nudge at 8 PM so you never accidentally break your streak',
  },
  {
    icon: 'solar:clock-circle-bold',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    title: 'Daily reminder',
    desc: 'A gentle push at your chosen time to keep the habit going',
  },
  {
    icon: 'solar:refresh-circle-bold',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    title: 'Review reminder',
    desc: "Revisit yesterday's words 24 hours later to lock them in your memory",
  },
]

export function NotificationPromptModal({ open, onOpenSettings, onDismiss }: Props) {
  if (!open) return null

  const handleOpenSettings = () => {
    onOpenSettings()
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm mx-auto bg-white/10 backdrop-blur-2xl border border-white/20 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center sm:hidden -mt-2 mb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Icon icon="solar:bell-bing-bold" width="32" className="text-blue-400" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-1.5">
          <h2 className="text-white text-xl font-bold">Stay on track</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Turn on notifications to protect your streak, keep your daily habit, and review what you've learned.
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
            className="w-full text-white/50 text-sm py-2.5 rounded-2xl active:bg-white/5 transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
