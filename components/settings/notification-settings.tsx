'use client'

import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import type { NotificationPreferences } from '@/lib/notifications'

interface Props {
  prefs: NotificationPreferences
  onUpdatePref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTime(timeStr: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [h, m] = timeStr.split(':').map(Number)
  return {
    hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
    minute: m,
    ampm: h >= 12 ? 'PM' : 'AM',
  }
}

function toTimeStr(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h = hour12
  if (ampm === 'AM' && hour12 === 12) h = 0
  else if (ampm === 'PM' && hour12 !== 12) h = hour12 + 12
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function displayTime(timeStr: string): string {
  const { hour12, minute, ampm } = parseTime(timeStr)
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-pressed={value}
      className={`w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 relative ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : value
          ? 'bg-blue-500'
          : 'bg-black/30 border border-white/20'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
          value ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

// ── Inline Time Picker ────────────────────────────────────────────────────────

function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { hour12, minute, ampm } = parseTime(value)

  const setHour = (h: number) => onChange(toTimeStr(h, minute, ampm))
  const setMinute = (m: number) => onChange(toTimeStr(hour12, m, ampm))
  const setAmpm = (a: 'AM' | 'PM') => onChange(toTimeStr(hour12, minute, a))

  const prevHour = () => setHour(hour12 === 1 ? 12 : hour12 - 1)
  const nextHour = () => setHour(hour12 === 12 ? 1 : hour12 + 1)
  const cycleMinute = () => setMinute([0, 15, 30, 45][(([0, 15, 30, 45].indexOf(minute) + 1) % 4)])

  return (
    <div className="flex items-center gap-2 mt-2 ml-5">
      {/* Hour stepper */}
      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={prevHour}
          className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors"
        >
          <Icon icon="solar:alt-arrow-left-bold" width="14" />
        </button>
        <span className="w-7 text-center text-white text-sm font-semibold tabular-nums">
          {hour12}
        </span>
        <button
          onClick={nextHour}
          className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors"
        >
          <Icon icon="solar:alt-arrow-right-bold" width="14" />
        </button>
      </div>

      <span className="text-white/40 text-sm font-bold">:</span>

      {/* Minute cycle (00 → 15 → 30 → 45) */}
      <button
        onClick={cycleMinute}
        className="flex items-center gap-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 active:bg-white/10 transition-colors"
      >
        <span className="text-white text-sm font-semibold tabular-nums w-6 text-center">
          {minute.toString().padStart(2, '0')}
        </span>
        <Icon icon="solar:alt-arrow-down-bold" width="12" className="text-white/40" />
      </button>

      {/* AM / PM */}
      <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        {(['AM', 'PM'] as const).map(period => (
          <button
            key={period}
            onClick={() => setAmpm(period)}
            className={`px-3 py-2 text-xs font-semibold transition-all ${
              ampm === period
                ? 'bg-blue-500 text-white'
                : 'text-white/50 active:bg-white/10'
            }`}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NotificationSettings({ prefs, onUpdatePref }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false)

  return (
    <div className="space-y-3.5">

      {/* Daily reminder — toggle + tappable time badge */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon icon="solar:clock-circle-bold" width="15" className="text-blue-400 flex-shrink-0" />
            <p className="text-white text-sm">Daily reminder</p>
            {/* Time badge — only visible when enabled */}
            {prefs.dailyReminderEnabled && (
              <button
                onClick={() => setShowTimePicker(v => !v)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  showTimePicker
                    ? 'bg-blue-500/30 border border-blue-400/40 text-blue-300'
                    : 'bg-white/10 border border-white/15 text-white/70 active:bg-white/20'
                }`}
              >
                {displayTime(prefs.dailyReminderTime)}
                <Icon
                  icon="solar:settings-bold"
                  width="11"
                  className={`transition-transform duration-300 ${showTimePicker ? 'rotate-90' : ''}`}
                />
              </button>
            )}
          </div>
          <Toggle
            value={prefs.dailyReminderEnabled}
            onChange={v => {
              onUpdatePref('dailyReminderEnabled', v)
              if (!v) setShowTimePicker(false)
            }}
          />
        </div>

        {/* Inline time picker — slides in below */}
        {prefs.dailyReminderEnabled && showTimePicker && (
          <TimePicker
            value={prefs.dailyReminderTime}
            onChange={v => onUpdatePref('dailyReminderTime', v)}
          />
        )}
      </div>

      {/* Streak protection */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:fire-bold" width="15" className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-white text-sm">Streak protection</p>
            <p className="text-white/45 text-xs">8 PM nudge if you haven't studied</p>
          </div>
        </div>
        <Toggle
          value={prefs.streakProtectionEnabled}
          onChange={v => onUpdatePref('streakProtectionEnabled', v)}
        />
      </div>

      {/* Review reminder */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:refresh-circle-bold" width="15" className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-white text-sm">Review reminder</p>
            <p className="text-white/45 text-xs">Revisit yesterday's topic after 24 h</p>
          </div>
        </div>
        <Toggle
          value={prefs.reviewReminderEnabled}
          onChange={v => onUpdatePref('reviewReminderEnabled', v)}
        />
      </div>

    </div>
  )
}
