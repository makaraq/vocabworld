'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'

interface Props {
  open: boolean
  onEnable: (reminderTime: string) => Promise<void>
  onDismiss: () => void
  initialTime?: string
}

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return {
    hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
    minute: m,
    ampm: (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  }
}

function toTimeStr(h12: number, m: number, ap: 'AM' | 'PM'): string {
  let h = h12
  if (ap === 'AM' && h12 === 12) h = 0
  else if (ap === 'PM' && h12 !== 12) h = h12 + 12
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function nearestStep(m: number) {
  return MINUTE_STEPS.reduce((p, c) => (Math.abs(c - m) < Math.abs(p - m) ? c : p))
}

export function NotificationSetupScreen({
  open,
  onEnable,
  onDismiss,
  initialTime = '09:00',
}: Props) {
  const [time, setTime] = useState(initialTime)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (open) setTime(initialTime)
  }, [open, initialTime])

  if (!open || !mounted) return null

  const { hour12, minute, ampm } = parseTime(time)

  const cycleHour = (dir: 1 | -1) => {
    const h = ((hour12 - 1 + dir + 12) % 12) + 1
    setTime(toTimeStr(h, minute, ampm))
  }

  const cycleMinute = (dir: 1 | -1) => {
    const idx = MINUTE_STEPS.indexOf(nearestStep(minute))
    const m = MINUTE_STEPS[((idx + dir) + MINUTE_STEPS.length) % MINUTE_STEPS.length]
    setTime(toTimeStr(hour12, m, ampm))
  }

  const toggleAmPm = () =>
    setTime(toTimeStr(hour12, minute, ampm === 'AM' ? 'PM' : 'AM'))

  const handleEnable = async () => {
    setLoading(true)
    try {
      await onEnable(time)
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-[#18103a] via-[#12093a] to-[#0a0620] overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-64 h-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col flex-1 px-7 pt-16 pb-10 justify-between">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-white text-[1.75rem] font-bold leading-tight tracking-tight">
            Set reminder for<br />daily practice.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Studies have shown practicing at the same time each day builds lasting habits.
          </p>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="relative w-56 h-56">

            {/* Outer glow */}
            <div className="absolute inset-4 rounded-full bg-orange-500/15 blur-2xl" />

            {/* Clock ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/10 bg-white/5 backdrop-blur-sm" />

            {/* Hour/minute tick marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180)
              const r = 102
              const cx = 112 + r * Math.cos(angle)
              const cy = 112 + r * Math.sin(angle)
              return (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/20"
                  style={{ left: cx - 2, top: cy - 2 }}
                />
              )
            })}

            {/* Clock icon centred */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                icon="solar:clock-circle-bold-duotone"
                width="110"
                className="text-orange-400"
                style={{ opacity: 0.85 }}
              />
            </div>

            {/* Person badge — lower right */}
            <div className="absolute -bottom-1 -right-1 w-[56px] h-[56px] rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
              <Icon icon="solar:user-rounded-bold" width="30" className="text-white/70" />
            </div>

            {/* Accent dots */}
            <div className="absolute top-5 -left-1 w-3 h-3 rounded-full bg-orange-400/70 shadow-[0_0_8px_2px_rgba(251,146,60,0.5)]" />
            <div className="absolute -top-2 right-10 w-2 h-2 rounded-full bg-blue-400/60" />
            <div className="absolute bottom-10 -left-3 w-2 h-2 rounded-full bg-rose-400/50" />
            <div className="absolute top-1/3 -right-3 w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
          </div>
        </div>

        {/* Time picker + CTAs */}
        <div className="space-y-5">

          {/* Drum-roll time picker */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-6 py-3 backdrop-blur-sm">

              {/* Alarm icon */}
              <Icon icon="solar:alarm-bold" width="19" className="text-orange-400 flex-shrink-0" />

              {/* Hour column */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => cycleHour(1)}
                  className="p-1 text-white/35 active:text-white/80 transition-colors"
                >
                  <Icon icon="solar:alt-arrow-up-bold" width="11" />
                </button>
                <span className="text-white text-[1.125rem] font-bold tabular-nums w-7 text-center leading-none">
                  {hour12}
                </span>
                <button
                  onClick={() => cycleHour(-1)}
                  className="p-1 text-white/35 active:text-white/80 transition-colors"
                >
                  <Icon icon="solar:alt-arrow-down-bold" width="11" />
                </button>
              </div>

              {/* Colon separator */}
              <span className="text-white/40 text-xl font-bold leading-none mb-px">:</span>

              {/* Minute column */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => cycleMinute(1)}
                  className="p-1 text-white/35 active:text-white/80 transition-colors"
                >
                  <Icon icon="solar:alt-arrow-up-bold" width="11" />
                </button>
                <span className="text-white text-[1.125rem] font-bold tabular-nums w-8 text-center leading-none">
                  {minute.toString().padStart(2, '0')}
                </span>
                <button
                  onClick={() => cycleMinute(-1)}
                  className="p-1 text-white/35 active:text-white/80 transition-colors"
                >
                  <Icon icon="solar:alt-arrow-down-bold" width="11" />
                </button>
              </div>

              {/* AM / PM toggle */}
              <button
                onClick={toggleAmPm}
                className="ml-1 bg-blue-500/25 border border-blue-400/30 rounded-xl px-3.5 py-1.5 text-blue-300 text-sm font-semibold active:bg-blue-500/40 transition-all"
              >
                {ampm}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 disabled:opacity-70 text-white font-semibold rounded-2xl py-4 transition-all text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <Icon icon="solar:refresh-circle-bold" width="18" className="animate-spin" />
              ) : (
                <Icon icon="solar:bell-bing-bold" width="18" />
              )}
              Enable notification
            </button>
            <button
              onClick={onDismiss}
              className="w-full text-white/40 text-sm py-2.5 active:bg-white/5 rounded-2xl transition-all"
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
