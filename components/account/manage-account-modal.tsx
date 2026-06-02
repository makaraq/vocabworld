"use client"

import React, { useState, useRef, useEffect } from "react"
import { Icon } from "@iconify/react"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import { openAppSettings } from "@/lib/notifications"
import type { NotificationPreferences } from "@/lib/notifications"
import { logOutRevenueCat } from "@/lib/revenuecat-client"
import { createClient } from "@/lib/supabase/browser-client"
import type { PermissionState } from "@/hooks/use-notifications"
import { hapticsLight, hapticsMedium, hapticsWarning } from "@/lib/haptics"

interface ManageAccountModalProps {
  open: boolean
  onCloseAction: () => void
  name?: string
  email?: string
  avatarUrl?: string
  isPremium?: boolean
  planType?: 'monthly' | 'yearly' | null
  renewalDate?: string
  onSignOutAction?: () => void
  onUpgradeAction?: () => void
  // Notification props
  notifPrefs?: NotificationPreferences
  notifPermission?: PermissionState
  onNotifSetEnabled?: (enabled: boolean) => Promise<void>
  onNotifUpdatePref?: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => Promise<void>
  /** When true the notifications section auto-expands on open */
  openNotifications?: boolean
  // Leaderboard opt-in
  showOnLeaderboard?: boolean
  onLeaderboardToggle?: (enabled: boolean) => Promise<void>
}

// ── Time helpers ──────────────────────────────────────────────────────────────

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

function DailyTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { hour12, minute, ampm } = parseTime(value)

  const setHour = (h: number) => onChange(toTimeStr(h, minute, ampm))
  const setMinute = (m: number) => onChange(toTimeStr(hour12, m, ampm))
  const setAmpm = (a: 'AM' | 'PM') => onChange(toTimeStr(hour12, minute, a))

  const prevHour = () => setHour(hour12 === 1 ? 12 : hour12 - 1)
  const nextHour = () => setHour(hour12 === 12 ? 1 : hour12 + 1)
  const prevMinute = () => setMinute(minute === 0 ? 59 : minute - 1)
  const nextMinute = () => setMinute(minute === 59 ? 0 : minute + 1)

  return (
    <div className="flex items-center gap-2 ml-[30px]">
      {/* Hour stepper */}
      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        <button onClick={() => { hapticsLight(); prevHour() }} className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors">
          <Icon icon="solar:alt-arrow-left-bold" width="14" />
        </button>
        <span className="w-7 text-center text-white text-sm font-semibold tabular-nums">{hour12}</span>
        <button onClick={() => { hapticsLight(); nextHour() }} className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors">
          <Icon icon="solar:alt-arrow-right-bold" width="14" />
        </button>
      </div>

      <span className="text-white/40 text-sm font-bold">:</span>

      {/* Minute stepper */}
      <div className="flex items-center bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        <button onClick={() => { hapticsLight(); prevMinute() }} className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors">
          <Icon icon="solar:alt-arrow-left-bold" width="14" />
        </button>
        <span className="w-7 text-center text-white text-sm font-semibold tabular-nums">{minute.toString().padStart(2, '0')}</span>
        <button onClick={() => { hapticsLight(); nextMinute() }} className="px-2.5 py-2 text-white/60 active:bg-white/10 transition-colors">
          <Icon icon="solar:alt-arrow-right-bold" width="14" />
        </button>
      </div>

      {/* AM / PM */}
      <div className="flex bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        {(['AM', 'PM'] as const).map(period => (
          <button
            key={period}
            onClick={() => { hapticsLight(); setAmpm(period) }}
            className={`px-3 py-2 text-xs font-semibold transition-all ${
              ampm === period ? 'bg-blue-500 text-white' : 'text-white/50 active:bg-white/10'
            }`}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ManageAccountModal({
  open,
  onCloseAction,
  name = "User",
  email = "user@example.com",
  avatarUrl,
  isPremium = false,
  planType = null,
  renewalDate,
  onSignOutAction,
  onUpgradeAction,
  notifPrefs,
  notifPermission,
  onNotifSetEnabled,
  onNotifUpdatePref,
  openNotifications = false,
  showOnLeaderboard = false,
  onLeaderboardToggle,
}: ManageAccountModalProps) {
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const notifSectionRef = useRef<HTMLDivElement>(null)

  // Auto-expand and scroll to notifications when openNotifications=true
  useEffect(() => {
    if (open && openNotifications) {
      setShowTimePicker(true)
      setTimeout(() => {
        notifSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [open, openNotifications])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShowTimePicker(false)
    }
  }, [open])

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleManageSubscription = async () => {
    try {
      const cap = (window as any)?.Capacitor
      const platform: string = cap?.getPlatform?.() ?? 'web'

      if (platform === 'ios' || platform === 'android') {
        // Check if this is an RC Billing (web) subscription — those have a managementURL.
        // App Store / Play Store IAP subscriptions return null and must go to the
        // platform's native subscription management screen instead.
        const { getRCCustomerInfo } = await import('@/lib/revenuecat-client')
        const info = await getRCCustomerInfo()
        const mgmtUrl = info?.managementURL

        if (mgmtUrl) {
          // RC Billing web subscription — open the customer portal in-app
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: mgmtUrl, presentationStyle: 'popover' })
        } else if (platform === 'ios') {
          // App Store IAP — send user to iOS Settings → Subscriptions.
          // itms-apps:// is a native URL scheme; the WebView passes it to the OS.
          window.open('itms-apps://apps.apple.com/account/subscriptions', '_self')
        } else {
          // Play Store IAP — open Play Store subscriptions page in-app browser
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: 'https://play.google.com/store/account/subscriptions' })
        }
      } else {
        // Web: use RC managementURL from customerInfo if available
        const { getRCCustomerInfo } = await import('@/lib/revenuecat-client')
        const info = await getRCCustomerInfo()
        const mgmtUrl = info?.managementURL
        if (mgmtUrl) {
          window.open(mgmtUrl, '_blank', 'noopener,noreferrer')
        } else {
          // RC Billing customer portal (web billing subscribers)
          window.open('https://billing.revenuecat.com/portal', '_blank', 'noopener,noreferrer')
        }
      }
    } catch (err) {
      console.error('[RC] handleManageSubscription failed:', err)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteStep('deleting')
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }
      if (onSignOutAction) {
        await onSignOutAction()
      } else {
        await logOutRevenueCat()
        await createClient().auth.signOut()
      }
      onCloseAction()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.')
      setDeleteStep('error')
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) { setDeleteStep('idle'); setDeleteError(null); setDeleteConfirmText(''); onCloseAction() } }}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="border-0 p-0 rounded-t-3xl overflow-hidden bg-white/10 backdrop-blur-2xl"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <SheetTitle className="text-white font-bold text-lg tracking-wide">Account</SheetTitle>
          <SheetClose asChild>
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all">
              <Icon icon="solar:close-circle-bold" width="20" height="20" />
            </button>
          </SheetClose>
        </div>

        {deleteStep !== 'idle' ? (
          /* ── Delete confirmation view ── */
          <div className="px-5 pb-8 space-y-4">
            <h2 className="text-white font-bold text-lg text-center">Delete Account?</h2>

            {isPremium && (
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-3">
                <p className="text-yellow-300 text-xs leading-relaxed text-center">
                  You have an active subscription. Deleting your account will <strong>not</strong> cancel it — you will continue to be charged.
                  Cancel it first via <strong>Apple ID → Subscriptions</strong> (iOS) or <strong>Google Play → Subscriptions</strong> (Android).
                </p>
              </div>
            )}

            <p className="text-white/60 text-xs leading-relaxed text-center">
              This will permanently delete your account and all your data. This action cannot be undone.
            </p>

            <div className="space-y-1.5">
              <p className="text-white/50 text-xs text-center">Type <strong className="text-white/80">delete</strong> to confirm</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={deleteStep === 'deleting'}
                style={{ fontSize: '16px' }}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none focus:border-red-400/60 transition-colors disabled:opacity-40 text-center"
              />
            </div>

            {deleteStep === 'error' && deleteError && (
              <p className="text-red-400 text-xs text-center">{deleteError}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => { setDeleteStep('idle'); setDeleteError(null); setDeleteConfirmText('') }}
                disabled={deleteStep === 'deleting'}
                className="flex-1 border border-white/20 bg-white/10 text-white/70 py-3 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteStep === 'deleting' || deleteConfirmText.toLowerCase() !== 'delete'}
                className="flex-1 bg-red-500/80 text-white py-3 rounded-2xl font-medium text-sm hover:bg-red-500 transition-all disabled:opacity-40"
              >
                {deleteStep === 'deleting' ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Normal account view ── */
          <div className="px-5 pb-8 space-y-3 overflow-y-auto max-h-[75vh]">
          {/* Avatar + Name card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white/20"
              style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-white font-bold text-lg">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-base truncate">{name}</p>
              <p className="text-white/55 text-sm truncate">{email}</p>
            </div>
          </div>

          {/* Subscription card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon icon="solar:crown-bold" width="20" height="20" className="text-yellow-400" />
                <span className="text-white font-semibold text-sm">Subscription</span>
              </div>
              {isPremium ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                  Premium
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/60 border border-white/20">
                  Free
                </span>
              )}
            </div>

            {isPremium && (
              <div className="space-y-1">
                {planType && (
                  <div className="text-white/60 text-xs">
                    {planType === 'yearly' ? 'Yearly plan' : 'Monthly plan'}
                  </div>
                )}
                {renewalDate && (
                  <div className="text-white/60 text-xs">
                    Renews on {renewalDate}
                  </div>
                )}
              </div>
            )}


          </div>

          {/* Daily Reminder */}
          {notifPermission && notifPermission !== 'not-native' && notifPermission !== 'loading' && (
            <div ref={notifSectionRef} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 overflow-hidden">
              {notifPermission === 'granted' && notifPrefs && onNotifSetEnabled && onNotifUpdatePref ? (
                <div className="px-4 py-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon icon="solar:bell-bold" width="18" className={notifPrefs.enabled ? 'text-blue-400' : 'text-white/50'} />
                      <span className="text-white font-medium text-sm">Daily Reminder</span>
                    </div>
                    <button
                      onClick={() => {
                        hapticsMedium()
                        const next = !notifPrefs.enabled
                        onNotifSetEnabled(next)
                        if (!next) setShowTimePicker(false)
                      }}
                      aria-pressed={notifPrefs.enabled}
                      className={`w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 relative ${
                        notifPrefs.enabled ? 'bg-blue-500' : 'bg-black/30 border border-white/20'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                        notifPrefs.enabled ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {notifPrefs.enabled && (
                    <>
                      <button
                        onClick={() => setShowTimePicker(v => !v)}
                        className="ml-[30px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-white/10 border border-white/15 text-white/70 active:bg-white/20"
                      >
                        <Icon icon="solar:clock-circle-bold" width="13" className="text-blue-400" />
                        {displayTime(notifPrefs.dailyReminderTime)}
                        <Icon icon="solar:pen-bold" width="11" className="text-white/40" />
                      </button>

                      {showTimePicker && (
                        <DailyTimePicker
                          value={notifPrefs.dailyReminderTime}
                          onChange={v => onNotifUpdatePref('dailyReminderTime', v)}
                        />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3.5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Icon icon="solar:bell-bold" width="18" className="text-white/50" />
                    <span className="text-white font-medium text-sm">Daily Reminder</span>
                    <span className="text-xs bg-white/10 text-white/40 border border-white/10 px-2 py-0.5 rounded-full">Off</span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Enable notifications in your device settings to get daily study reminders.
                  </p>
                  <button
                    onClick={() => openAppSettings()}
                    className="w-full bg-blue-500/20 border border-blue-400/30 text-blue-300 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon icon="solar:settings-bold" width="16" />
                    Open Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard opt-in */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 overflow-hidden">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon icon="solar:users-group-rounded-bold" width="18" className={showOnLeaderboard ? 'text-yellow-400' : 'text-white/50'} />
                  <div>
                    <span className="text-white font-medium text-sm">Show on Leaderboard</span>
                    <p className="text-white/40 text-[11px] leading-tight mt-0.5">Display your first name and photo</p>
                  </div>
                </div>
                <button
                  onClick={() => { hapticsMedium(); onLeaderboardToggle?.(!showOnLeaderboard) }}
                  aria-pressed={showOnLeaderboard}
                  className={`w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 relative ${
                    showOnLeaderboard ? 'bg-blue-500' : 'bg-black/30 border border-white/20'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                    showOnLeaderboard ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Manage Subscription */}
          <button
            onClick={() => { hapticsLight(); handleManageSubscription() }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
          >
            <Icon icon="solar:settings-bold" width="18" height="18" />
            <span>Manage Subscription</span>
          </button>

          {/* Delete Account */}
          <button
            onClick={() => { hapticsWarning(); setDeleteStep('confirm') }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
          >
            <Icon icon="solar:trash-bin-trash-bold" width="18" height="18" />
            <span>Delete Account</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={() => { hapticsLight(); onSignOutAction?.(); onCloseAction() }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
          >
            <Icon icon="solar:logout-3-bold" width="18" height="18" />
            <span>Sign Out</span>
          </button>
        </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  )
}
