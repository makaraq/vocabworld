'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import { PRICING, formatPrice } from '@/lib/pricing'
import { useAuth } from '@/contexts/auth-context'
import { useRevenueCat } from '@/hooks/use-revenuecat'

interface PaywallModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onSuccessAction?: () => void
  nativeLanguageCode?: string
  targetLanguageCode?: string
}

interface LivePrices {
  monthly: string
  yearly: string
}

export function PaywallModal({
  isOpen,
  onCloseAction,
  onSuccessAction,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [mounted, setMounted] = useState(false)
  const [livePrices, setLivePrices] = useState<LivePrices | null>(null)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const { user, refreshSubscription } = useAuth()
  const { purchasePackage, restorePurchases, getOfferings, loading, error, clearError } = useRevenueCat()
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    getOfferings().then(packages => {
      if (!packages.length) return
      const monthly = packages.find(p => p.identifier === PRICING.monthly.rcPackageId)
      const yearly = packages.find(p => p.identifier === PRICING.yearly.rcPackageId)
      if (monthly || yearly) {
        setLivePrices({
          monthly: monthly?.priceString ?? formatPrice(PRICING.monthly.price),
          yearly: yearly?.priceString ?? formatPrice(PRICING.yearly.price),
        })
      }
    }).catch(() => { /* fall back to hardcoded prices */ })
  }, [isOpen, getOfferings])

  useEffect(() => {
    if (error) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => {
        clearError()
      }, 4000)
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [error, clearError])

  if (!isOpen || !mounted) return null

  const handleSubscribe = async () => {
    if (!user) return
    clearError()

    const success = await purchasePackage(selectedPlan)

    if (success) {
      try {
        await fetch('/api/subscription/sync-rc', { method: 'POST' })
      } catch {
        // Non-fatal: webhook will eventually sync the DB
      }
      await refreshSubscription()
      onSuccessAction?.()
      onCloseAction()
    }
  }

  const handleRestore = async () => {
    setRestoreStatus('loading')
    const success = await restorePurchases()
    if (success) {
      await refreshSubscription()
      setRestoreStatus('done')
      setTimeout(() => { onSuccessAction?.(); onCloseAction() }, 800)
    } else {
      setRestoreStatus('error')
      setTimeout(() => setRestoreStatus('idle'), 3000)
    }
  }

  const monthlyPrice = livePrices?.monthly ?? formatPrice(PRICING.monthly.price)
  const yearlyPrice = livePrices?.yearly ?? formatPrice(PRICING.yearly.price)

  const billingDate = new Date()
  billingDate.setDate(billingDate.getDate() + 7)
  const billingDateLabel = billingDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseAction()
      }}
    >
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl max-w-md w-full border border-white/20 shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onCloseAction}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-2xl font-extrabold text-white text-center leading-tight drop-shadow-lg">
            {selectedPlan === 'yearly' ? (
              <>Start your 7-day FREE<br />trial to continue.</>
            ) : (
              <>Unlock Sprind Unlimited</>
            )}
          </h2>
        </div>

        {/* Trial Timeline (yearly) or Benefits list (monthly) */}
        {selectedPlan === 'yearly' ? (
          <div className="px-6 pb-2">
            <div className="relative">
              {/* Gradient connector bar */}
              <div className="absolute left-[19px] top-2 bottom-2 w-1 bg-gradient-to-b from-orange-400 via-orange-300 to-white/30 rounded-full" />

              {/* Step 1: Today */}
              <div className="relative flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:lock-keyhole-unlocked-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">Today</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    Unlock all premium features: every topic, custom playlists, and word search.
                  </p>
                </div>
              </div>

              {/* Step 2: In 5 Days - Reminder */}
              <div className="relative flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:bell-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">In 5 Days - Reminder</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    We&apos;ll send you a reminder that your trial is ending soon if you&apos;ve allowed us to notify you.
                  </p>
                </div>
              </div>

              {/* Step 3: In 7 Days - Billing Starts */}
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:crown-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">In 7 Days - Billing Starts</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    You&apos;ll be charged on {billingDateLabel} unless you cancel anytime before.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-2 space-y-4">
            <div className="flex items-start gap-3">
              <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-white flex-shrink-0 mt-0.5 drop-shadow" />
              <p className="font-semibold text-white text-base drop-shadow">Access to all topics</p>
            </div>
            <div className="flex items-start gap-3">
              <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-white flex-shrink-0 mt-0.5 drop-shadow" />
              <p className="font-semibold text-white text-base drop-shadow">Build playlists for the words you actually need</p>
            </div>
            <div className="flex items-start gap-3">
              <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-white flex-shrink-0 mt-0.5 drop-shadow" />
              <p className="font-semibold text-white text-base drop-shadow">Search a specific word and save it</p>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="px-6 pt-6 pb-2 grid grid-cols-2 gap-3">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all backdrop-blur-sm ${
              selectedPlan === 'monthly'
                ? 'border-white/70 bg-white/15'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm drop-shadow">Monthly</p>
                <p className="text-white font-bold text-base mt-1 drop-shadow">{monthlyPrice} <span className="font-normal text-white/60 text-sm">/mo</span></p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlan === 'monthly' ? 'border-white bg-white' : 'border-white/40 bg-white/10'
                }`}
              >
                {selectedPlan === 'monthly' && (
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-gray-900" />
                )}
              </div>
            </div>
          </button>

          {/* Yearly */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all backdrop-blur-sm ${
              selectedPlan === 'yearly'
                ? 'border-white/70 bg-white/15'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full shadow-lg border border-white/20">
              7 DAYS FREE
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm drop-shadow">Yearly</p>
                <p className="text-white font-bold text-base mt-1 drop-shadow">{yearlyPrice}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlan === 'yearly' ? 'border-white bg-white' : 'border-white/40 bg-white/10'
                }`}
              >
                {selectedPlan === 'yearly' && (
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-gray-900" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Plan reassurance line */}
        <div className="flex items-center justify-center gap-2 px-6 pt-5 pb-3">
          <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-white drop-shadow" />
          <span className="text-white font-semibold text-sm drop-shadow">
            {selectedPlan === 'yearly' ? 'No Payment Due Now' : 'No Commitment - Cancel Anytime'}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}

        {/* CTA Button */}
        <div className="px-6 pb-3">
          <button
            onClick={handleSubscribe}
            disabled={loading || !user}
            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold text-base rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/10"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{selectedPlan === 'yearly' ? 'Start My 7-Day Free Trial' : 'Start My Journey'}</span>
            )}
          </button>

          {!user && (
            <p className="text-center text-white/60 text-sm mt-3">
              Please sign in to subscribe
            </p>
          )}
        </div>

        {/* Already purchased */}
        <div className="px-6 pb-2 text-center">
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-white/60 hover:text-white/80 text-sm transition-colors disabled:opacity-50"
          >
            {restoreStatus === 'loading'
              ? 'Restoring…'
              : restoreStatus === 'done'
                ? 'Restored ✓'
                : restoreStatus === 'error'
                  ? 'Nothing to restore'
                  : 'Already purchased?'}
          </button>
        </div>

        {/* Disclosure */}
        <p className="text-center text-white/50 text-xs px-8 pt-1 pb-4 leading-relaxed">
          {selectedPlan === 'yearly' ? (
            <>7 days free, then {yearlyPrice} per year. Billed yearly.<br />Plan auto-renews unless you<br />cancel. Cancel in the App Store.</>
          ) : (
            <>{monthlyPrice} per month. Plan auto-renews<br />unless you cancel. Cancel in the App Store.</>
          )}
        </p>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-3 pb-6">
          <Link
            href="/terms-of-service"
            className="text-white/50 hover:text-white/70 text-xs transition-colors"
          >
            Terms
          </Link>
          <span className="text-white/30 text-xs">·</span>
          <Link
            href="/privacy-policy"
            className="text-white/50 hover:text-white/70 text-xs transition-colors"
          >
            Privacy
          </Link>
          <span className="text-white/30 text-xs">·</span>
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-white/50 hover:text-white/70 text-xs transition-colors disabled:opacity-50"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
