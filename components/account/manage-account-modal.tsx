"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import { useRevenueCat } from "@/hooks/use-revenuecat"

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
}: ManageAccountModalProps) {
  const { restorePurchases, loading: rcLoading } = useRevenueCat()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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
    await restorePurchases()
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

            {!isPremium && (
              <button
                onClick={() => { onUpgradeAction?.(); onCloseAction() }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2"
              >
                <Icon icon="solar:crown-bold" width="16" height="16" />
                <span>Upgrade to Premium</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Manage / Restore */}
          {isPremium ? (
            <button
              onClick={handleManageSubscription}
              className="w-full border border-orange-400/30 bg-orange-500/10 text-orange-300 py-3 px-4 rounded-2xl font-medium text-sm hover:bg-orange-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Icon icon="solar:settings-bold" width="18" height="18" />
              <span>Manage Subscription</span>
            </button>
          ) : (
            <button
              onClick={handleRestorePurchases}
              disabled={rcLoading}
              className="w-full border border-white/20 bg-white/10 text-white/70 py-3 px-4 rounded-2xl font-medium text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              <Icon icon="solar:refresh-bold" width="18" height="18" />
              <span>{rcLoading ? 'Restoring...' : 'Restore Purchases'}</span>
            </button>
          )}

          {/* Delete Account */}
          <button
            onClick={() => setDeleteStep('confirm')}
            className="w-full border border-red-500/30 bg-red-500/10 text-red-400 py-3 px-4 rounded-2xl font-medium text-sm hover:bg-red-500/20 transition-all flex items-center justify-center space-x-2"
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
      </SheetContent>
    </Sheet>

    {/* Delete confirmation overlay — portalled to body so it sits above Sheet's backdrop */}
    {deleteStep !== 'idle' && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => { if (deleteStep !== 'deleting') { setDeleteStep('idle'); setDeleteError(null); setDeleteConfirmText('') } }}
        />

        {/* Card */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-7 mx-6 max-w-sm w-full shadow-2xl space-y-4">
          <h2 className="text-white font-bold text-lg text-center">Delete Account?</h2>

          {isPremium && (
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-3">
              <p className="text-yellow-300 text-xs leading-relaxed text-center">
                You have an active subscription. Deleting your account will <strong>not</strong> cancel it — you will continue to be charged. Cancel it first via <strong>Settings → Apple ID → Subscriptions</strong>.
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
              autoFocus
              disabled={deleteStep === 'deleting'}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-red-400/60 transition-colors disabled:opacity-40 text-center"
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
      </div>
    , document.body)}
    </>
  )
}
