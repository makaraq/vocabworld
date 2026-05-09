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
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 bg-black/50 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm border border-white/20 border-b-0 sm:border-b shadow-2xl overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="p-6 pb-4 bg-white/5 border-b border-white/10">
          <div className="text-center">
            <div className="w-14 h-14 bg-orange-400/20 border border-orange-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icon icon="solar:bell-bing-bold" width="28" className="text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Set your daily reminder</h2>
            <p className="text-white/55 text-sm leading-relaxed">
              Same-time practice builds lasting habits and keeps your streak alive.
            </p>
          </div>
        </div>

        {/* Time picker */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-6 py-3 backdrop-blur-sm">

              <Icon icon="solar:alarm-bold" width="19" className="text-orange-400 flex-shrink-0" />

              {/* Hour column */}
              <div className="flex flex-col items-center gap-0.5">
                <button onClick={() => cycleHour(1)} className="p-1 text-white/35 active:text-white/80 transition-colors">
                  <Icon icon="solar:alt-arrow-up-bold" width="11" />
                </button>
                <span className="text-white text-[1.125rem] font-bold tabular-nums w-7 text-center leading-none">
                  {hour12}
                </span>
                <button onClick={() => cycleHour(-1)} className="p-1 text-white/35 active:text-white/80 transition-colors">
                  <Icon icon="solar:alt-arrow-down-bold" width="11" />
                </button>
              </div>

              <span className="text-white/40 text-xl font-bold leading-none mb-px">:</span>

              {/* Minute column */}
              <div className="flex flex-col items-center gap-0.5">
                <button onClick={() => cycleMinute(1)} className="p-1 text-white/35 active:text-white/80 transition-colors">
                  <Icon icon="solar:alt-arrow-up-bold" width="11" />
                </button>
                <span className="text-white text-[1.125rem] font-bold tabular-nums w-8 text-center leading-none">
                  {minute.toString().padStart(2, '0')}
                </span>
                <button onClick={() => cycleMinute(-1)} className="p-1 text-white/35 active:text-white/80 transition-colors">
                  <Icon icon="solar:alt-arrow-down-bold" width="11" />
                </button>
              </div>

              <button
                onClick={toggleAmPm}
                className="ml-1 bg-blue-500/25 border border-blue-400/30 rounded-xl px-3.5 py-1.5 text-blue-300 text-sm font-semibold active:bg-blue-500/40 transition-all"
              >
                {ampm}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-8 sm:pb-6 space-y-2.5">
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
  )

  return createPortal(content, document.body)
}
