"use client"

import React, { useState, useRef, useEffect } from "react"
import { Icon } from "@iconify/react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import { useRevenueCat } from "@/hooks/use-revenuecat"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { openAppSettings } from "@/lib/notifications"
import type { NotificationPreferences } from "@/lib/notifications"
import type { PermissionState } from "@/hooks/use-notifications"

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
  onNotifUpdatePref?: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => Promise<void>
  /** When true the notifications section auto-expands on open */
  openNotifications?: boolean
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
  onNotifUpdatePref,
  openNotifications = false,
}: ManageAccountModalProps) {
  const { restorePurchases, loading: rcLoading } = useRevenueCat()
  const router = useRouter()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [notifExpanded, setNotifExpanded] = useState(false)
  const notifSectionRef = useRef<HTMLDivElement>(null)

  // Auto-expand and scroll to notifications when openNotifications=true
  useEffect(() => {
    if (open && openNotifications) {
      setNotifExpanded(true)
      setTimeout(() => {
        notifSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [open, openNotifications])

  // Reset expanded state when modal closes
  useEffect(() => {
    if (!open) {
      setNotifExpanded(false)
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

  const handleRestorePurchases = async () => {
    setRestoreStatus('loading')
    try {
      await restorePurchases()
      setRestoreStatus('done')
      setTimeout(() => setRestoreStatus('idle'), 3000)
    } catch {
      setRestoreStatus('error')
      setTimeout(() => setRestoreStatus('idle'), 3000)
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
      onSignOutAction?.()
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

          {/* Notifications section */}
          {notifPermission && notifPermission !== 'not-native' && notifPermission !== 'loading' && (
            <div ref={notifSectionRef} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 overflow-hidden">
              {/* Header row — tap to expand/collapse */}
              <button
                onClick={() => setNotifExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon icon="solar:bell-bold" width="18" className={notifPermission === 'granted' ? 'text-blue-400' : 'text-white/50'} />
                  <span className="text-white font-medium text-sm">Notifications</span>
                  {notifPermission === 'granted' ? (
                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/20 px-2 py-0.5 rounded-full">On</span>
                  ) : (
                    <span className="text-xs bg-white/10 text-white/40 border border-white/10 px-2 py-0.5 rounded-full">Off</span>
                  )}
                </div>
                <Icon
                  icon="solar:alt-arrow-down-bold"
                  width="16"
                  className={`text-white/40 transition-transform duration-200 ${notifExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded content */}
              {notifExpanded && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3">
                  {notifPermission === 'granted' && notifPrefs && onNotifUpdatePref ? (
                    <NotificationSettings
                      prefs={notifPrefs}
                      onUpdatePref={onNotifUpdatePref}
                    />
                  ) : (
                    /* Permission denied or prompt — direct user to iOS Settings */
                    <div className="space-y-3">
                      <p className="text-white/50 text-xs leading-relaxed text-center">
                        Notifications are turned off. Enable them in your device settings to get streak reminders, daily study nudges, and review alerts.
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
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Manage Subscription */}
          {isPremium && (
            <button
              onClick={handleManageSubscription}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
            >
              <Icon icon="solar:settings-bold" width="18" height="18" />
              <span>Manage Subscription</span>
            </button>
          )}

          {/* Restore Purchases — always visible per Apple guideline */}
          <button
            onClick={handleRestorePurchases}
            disabled={restoreStatus === 'loading'}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            aria-label="Restore previous purchases"
          >
            <Icon icon="solar:refresh-bold" width="18" height="18" />
            <span>
              {restoreStatus === 'loading' ? 'Restoring…' : restoreStatus === 'done' ? 'Restored ✓' : restoreStatus === 'error' ? 'Nothing to restore' : 'Restore Purchases'}
            </span>
          </button>

          {/* Privacy Policy */}
          <button
            onClick={() => { onCloseAction(); router.push('/privacy-policy') }}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
            aria-label="View privacy policy and data settings"
          >
            <Icon icon="solar:shield-check-bold" width="18" height="18" />
            <span>Privacy Policy</span>
          </button>

          {/* Delete Account */}
          <button
            onClick={() => setDeleteStep('confirm')}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
          >
            <Icon icon="solar:trash-bin-trash-bold" width="18" height="18" />
            <span>Delete Account</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={() => { onSignOutAction?.(); onCloseAction() }}
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
