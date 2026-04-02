"use client"

import React from "react"
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
          // App Store IAP — send user to iOS Settings → Subscriptions
          const { App } = await import('@capacitor/app')
          await App.openUrl({ url: 'itms-apps://apps.apple.com/account/subscriptions' })
        } else {
          // Play Store IAP — open Play Store subscriptions page
          const { App } = await import('@capacitor/app')
          await App.openUrl({ url: 'https://play.google.com/store/account/subscriptions' })
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

  return (
      <Sheet open={open} onOpenChange={(v) => !v && onCloseAction()}>
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
            onClick={() => {}}
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
  )
}
