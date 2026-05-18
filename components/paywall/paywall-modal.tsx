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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseAction()
      }}
    >
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onCloseAction}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight">
            Start your 7-day FREE<br />trial to continue.
          </h2>
        </div>

        {/* Timeline */}
        <div className="px-6 pb-2">
          <div className="relative">
            {/* Gradient connector bar */}
            <div className="absolute left-[19px] top-2 bottom-2 w-1 bg-gradient-to-b from-orange-400 via-orange-300 to-gray-300 rounded-full" />

            {/* Step 1: Today */}
            <div className="relative flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                <Icon icon="solar:lock-keyhole-unlocked-bold" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-bold text-gray-900 text-base">Today</p>
                <p className="text-gray-500 text-sm leading-snug">
                  Unlock all premium features: every topic, custom playlists, and word search.
                </p>
              </div>
            </div>

            {/* Step 2: In 6 Days - Reminder */}
            <div className="relative flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                <Icon icon="solar:bell-bold" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-bold text-gray-900 text-base">In 6 Days - Reminder</p>
                <p className="text-gray-500 text-sm leading-snug">
                  We&apos;ll send you a reminder that your trial is ending soon if you&apos;ve allowed us to notify you.
                </p>
              </div>
            </div>

            {/* Step 3: In 7 Days - Billing Starts */}
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                <Icon icon="solar:crown-bold" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-bold text-gray-900 text-base">In 7 Days - Billing Starts</p>
                <p className="text-gray-500 text-sm leading-snug">
                  You&apos;ll be charged on {billingDateLabel} unless you cancel anytime before.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pt-6 pb-2 grid grid-cols-2 gap-3">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              selectedPlan === 'monthly'
                ? 'border-gray-900 bg-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold text-sm">Monthly</p>
                <p className="text-gray-900 font-bold text-base mt-1">{monthlyPrice} <span className="font-normal text-gray-500 text-sm">/mo</span></p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlan === 'monthly' ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white'
                }`}
              >
                {selectedPlan === 'monthly' && (
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>

          {/* Yearly */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              selectedPlan === 'yearly'
                ? 'border-gray-900 bg-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full">
              7 DAYS FREE
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold text-sm">Yearly</p>
                <p className="text-gray-900 font-bold text-base mt-1">{yearlyPrice}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlan === 'yearly' ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white'
                }`}
              >
                {selectedPlan === 'yearly' && (
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* No Payment Due Now */}
        <div className="flex items-center justify-center gap-2 px-6 pt-5 pb-3">
          <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-gray-900" />
          <span className="text-gray-900 font-semibold text-sm">No Payment Due Now</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* CTA Button */}
        <div className="px-6 pb-3">
          <button
            onClick={handleSubscribe}
            disabled={loading || !user}
            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold text-base rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Start My 7-Day Free Trial</span>
            )}
          </button>

          {!user && (
            <p className="text-center text-gray-500 text-sm mt-3">
              Please sign in to subscribe
            </p>
          )}
        </div>

        {/* Already purchased */}
        <div className="px-6 pb-2 text-center">
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors disabled:opacity-50"
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
        <p className="text-center text-gray-500 text-xs px-8 pt-1 pb-4 leading-relaxed">
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
            className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
          >
            Terms
          </Link>
          <span className="text-gray-300 text-xs">·</span>
          <Link
            href="/privacy-policy"
            className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
          >
            Privacy
          </Link>
          <span className="text-gray-300 text-xs">·</span>
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-gray-400 hover:text-gray-600 text-xs transition-colors disabled:opacity-50"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
