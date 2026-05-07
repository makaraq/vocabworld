'use client'

/**
 * components/settings/notification-settings.tsx
 *
 * Notification preferences section rendered inside the settings panel
 * in language-selector.tsx. Matches the existing glass toggle style.
 */

import React from 'react'
import { Icon } from '@iconify/react'
import type { NotificationPreferences } from '@/lib/notifications'
import type { PermissionState } from '@/hooks/use-notifications'

interface Props {
  prefs: NotificationPreferences
  permissionState: PermissionState
  onSetEnabled: (enabled: boolean) => Promise<void>
  onUpdatePref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>
}

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

export function NotificationSettings({ prefs, permissionState, onSetEnabled, onUpdatePref }: Props) {
  // Only meaningful on native — don't render on web
  if (permissionState === 'not-native') return null

  const isLoading = permissionState === 'loading'
  // Denied AND notifications currently off = user needs to go to OS Settings
  const needsOsSettings = permissionState === 'denied' && !prefs.enabled

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white/90">Notifications</h3>

      {/* OS-level denial banner */}
      {needsOsSettings && (
        <div className="bg-amber-500/10 border border-amber-400/25 rounded-xl p-3 text-amber-300 text-xs leading-relaxed">
          Notifications are blocked by iOS. Go to{' '}
          <strong>Settings → Notifications → Vocab World</strong> and allow
          notifications, then enable them here.
        </div>
      )}

      {/* Master toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon icon="solar:bell-bold" width="15" className="text-white/60 flex-shrink-0" />
            <p className="text-white text-sm font-medium">Enable notifications</p>
          </div>
          <p className="text-white/50 text-xs mt-0.5 pl-5">Reminders to study and protect your streak</p>
        </div>
        <Toggle
          value={prefs.enabled}
          onChange={onSetEnabled}
          disabled={isLoading || needsOsSettings}
        />
      </div>

      {/* Sub-settings — only when enabled */}
      {prefs.enabled && (
        <div className="space-y-4 pl-3 border-l border-white/10">

          {/* Daily reminder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:clock-circle-bold" width="15" className="text-white/60 flex-shrink-0" />
                  <p className="text-white text-sm">Daily reminder</p>
                </div>
                <p className="text-white/50 text-xs mt-0.5 pl-5">Fixed daily study prompt</p>
              </div>
              <Toggle
                value={prefs.dailyReminderEnabled}
                onChange={v => onUpdatePref('dailyReminderEnabled', v)}
              />
            </div>
            {prefs.dailyReminderEnabled && (
              <div className="flex items-center gap-2 pl-5">
                <p className="text-white/50 text-xs">Remind me at</p>
                <input
                  type="time"
                  value={prefs.dailyReminderTime}
                  onChange={e => onUpdatePref('dailyReminderTime', e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-blue-400/50 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {/* Streak protection */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon icon="solar:fire-bold" width="15" className="text-amber-400 flex-shrink-0" />
                <p className="text-white text-sm">Streak protection</p>
              </div>
              <p className="text-white/50 text-xs mt-0.5 pl-5">8 PM reminder if you haven't studied yet</p>
            </div>
            <Toggle
              value={prefs.streakProtectionEnabled}
              onChange={v => onUpdatePref('streakProtectionEnabled', v)}
            />
          </div>

          {/* Review reminder */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon icon="solar:refresh-circle-bold" width="15" className="text-emerald-400 flex-shrink-0" />
                <p className="text-white text-sm">Review reminder</p>
              </div>
              <p className="text-white/50 text-xs mt-0.5 pl-5">Reminder to review yesterday's topic</p>
            </div>
            <Toggle
              value={prefs.reviewReminderEnabled}
              onChange={v => onUpdatePref('reviewReminderEnabled', v)}
            />
          </div>

        </div>
      )}
    </div>
  )
}
