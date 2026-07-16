'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import celebrationAnim from '@/lib/animations/celebration.json'
import { PRICING, formatPrice } from '@/lib/pricing'
import { useAuth } from '@/contexts/auth-context'
import { useRevenueCat } from '@/hooks/use-revenuecat'
import { syncTrialReminder } from '@/lib/revenuecat-client'
import { hapticsLight, hapticsMedium, hapticsSuccess } from '@/lib/haptics'
import { useT } from '@/components/providers/translation-provider'

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
  const { t } = useT()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [mounted, setMounted] = useState(false)
  const [livePrices, setLivePrices] = useState<LivePrices | null>(null)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [trialEligible, setTrialEligible] = useState(true)
  const { user, refreshSubscription, setOptimisticPremium } = useAuth()
  const { purchasePackage, restorePurchases, getOfferings, checkTrialEligibility, loading, error, clearError } = useRevenueCat()
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  const handleLottieComplete = useCallback(() => {
    // After full play, loop just the last 2 seconds (frames 90-150 at 30fps)
    lottieRef.current?.playSegments([90, 150], true)
  }, [])

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
    checkTrialEligibility().then(eligible => {
      setTrialEligible(eligible)
      if (!eligible) setSelectedPlan('monthly')
    }).catch(() => {})
  }, [isOpen, getOfferings, checkTrialEligibility])

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

  const isNative = typeof window !== 'undefined' && !!(window as any)?.Capacitor?.isNativePlatform?.()
  const isIOS = isNative && (window as any)?.Capacitor?.getPlatform?.() === 'ios'
  const storeName = isIOS ? t('paywall.store.ios') : isNative ? t('paywall.store.android') : t('paywall.store.web')
  const showTrial = trialEligible && selectedPlan === 'yearly'

  const handleSubscribe = async () => {
    if (!user) return
    hapticsLight()
    clearError()

    const success = await purchasePackage(selectedPlan)

    if (success) {
      hapticsSuccess()
      setOptimisticPremium(selectedPlan)
      setPurchaseSuccess(true)
      fetch('/api/subscription/sync-rc', { method: 'POST' }).catch(() => {})
      // Schedule the "trial ends in 2 days" reminder (no-op unless this was a trial).
      syncTrialReminder().catch(() => {})
    }
  }

  const handleCelebrationDismiss = () => {
    hapticsLight()
    onSuccessAction?.()
    onCloseAction()
    setPurchaseSuccess(false)
  }

  const handleRestore = async () => {
    hapticsLight()
    setRestoreStatus('loading')
    const success = await restorePurchases()
    if (success) {
      setOptimisticPremium(selectedPlan)
      setRestoreStatus('done')
      setTimeout(() => setPurchaseSuccess(true), 400)
      fetch('/api/subscription/sync-rc', { method: 'POST' }).catch(() => {})
      // Re-sync the trial reminder in case the restored entitlement is a trial.
      syncTrialReminder().catch(() => {})
    } else {
      setRestoreStatus('error')
      setTimeout(() => setRestoreStatus('idle'), 3000)
    }
  }

  const monthlyPrice = livePrices?.monthly ?? formatPrice(PRICING.monthly.price)
  const yearlyPrice = livePrices?.yearly ?? formatPrice(PRICING.yearly.price)


  if (purchaseSuccess) {
    const celebrationContent = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl max-w-md w-full border border-white/20 shadow-2xl flex flex-col items-center p-8">
          {/* Lottie animation */}
          <div className="w-56 h-56 -mb-2">
            <Lottie
              lottieRef={lottieRef}
              animationData={celebrationAnim}
              loop={false}
              autoplay
              onComplete={handleLottieComplete}
            />
          </div>

          {/* Title */}
          <h2
            className="text-3xl font-extrabold text-white text-center mb-2"
            style={{ animation: 'celebration-fade-up 0.5s ease-out 0.3s both' }}
          >
            {t('paywall.celebration.title')}
          </h2>

          {/* Subtitle */}
          <p
            className="text-white/70 text-center text-lg mb-8"
            style={{ animation: 'celebration-fade-up 0.5s ease-out 0.5s both' }}
          >
            {t('paywall.celebration.subtitle')}
          </p>

          {/* CTA */}
          <button
            onClick={handleCelebrationDismiss}
            className="w-full max-w-xs py-4 bg-gray-900 hover:bg-black text-white font-bold text-base rounded-2xl shadow-lg active:scale-95 transition-all border border-white/10"
            style={{ animation: 'celebration-fade-up 0.5s ease-out 0.7s both' }}
          >
            {t('paywall.celebration.cta')}
          </button>
        </div>
      </div>
    )
    return createPortal(celebrationContent, document.body)
  }

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
          aria-label={t('common.close')}
        >
          <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-2xl font-extrabold text-white text-center leading-tight drop-shadow-lg whitespace-pre-line">
            {showTrial ? t('paywall.title.trial') : t('paywall.title.noTrial')}
          </h2>
        </div>

        {/* Trial Timeline (yearly) + Benefits list (monthly) — both rendered in the same
            grid cell so the container always sizes to the taller (yearly) layout.
            The inactive one is `invisible` (still takes space, just hidden) to keep
            the modal height identical between plans. */}
        <div className="px-6 pb-2 grid">
          {/* Yearly timeline — only when trial eligible */}
          <div
            aria-hidden={!showTrial}
            className={`col-start-1 row-start-1 ${showTrial ? '' : 'invisible pointer-events-none'}`}
          >
            <div className="relative">
              {/* Gradient connector bar */}
              <div className="absolute left-[19px] top-2 bottom-2 w-1 bg-gradient-to-b from-orange-400 via-orange-300 to-white/30 rounded-full" />

              {/* Step 1: Today */}
              <div className="relative flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:lock-keyhole-unlocked-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.timeline.today.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.timeline.today.desc')}
                  </p>
                </div>
              </div>

              {/* Step 2: In 5 Days - Reminder */}
              <div className="relative flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:bell-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.timeline.reminder.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.timeline.reminder.desc')}
                  </p>
                </div>
              </div>

              {/* Step 3: In 7 Days - Billing Starts */}
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  <Icon icon="solar:crown-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.timeline.billing.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.timeline.billing.desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly benefits — vertically centered within the cell so the
              shorter content sits in the same area as the yearly timeline. */}
          <div
            aria-hidden={showTrial}
            className={`col-start-1 row-start-1 self-center ${!showTrial ? '' : 'invisible pointer-events-none'}`}
          >
            <div className="space-y-7">
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.benefit.topics.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.benefit.topics.desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.benefit.playlists.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.benefit.playlists.desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-white text-base drop-shadow">{t('paywall.benefit.search.title')}</p>
                  <p className="text-white/70 text-sm leading-snug drop-shadow">
                    {t('paywall.benefit.search.desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pt-6 pb-2 grid grid-cols-2 gap-3">
          {/* Monthly */}
          <button
            onClick={() => { hapticsMedium(); setSelectedPlan('monthly') }}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all backdrop-blur-sm ${
              selectedPlan === 'monthly'
                ? 'border-white/70 bg-white/15'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm drop-shadow">{t('paywall.plan.monthly')}</p>
                <p className="text-white font-bold text-base mt-1 drop-shadow">{monthlyPrice} <span className="font-normal text-white/60 text-sm">{t('paywall.plan.perMonth')}</span></p>
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
            onClick={() => { hapticsMedium(); setSelectedPlan('yearly') }}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all backdrop-blur-sm ${
              selectedPlan === 'yearly'
                ? 'border-white/70 bg-white/15'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            {trialEligible && (
              <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full shadow-lg border border-white/20">
                {t('paywall.plan.trialBadge')}
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm drop-shadow">{t('paywall.plan.yearly')}</p>
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
            {showTrial ? t('paywall.reassure.noPayment') : t('paywall.reassure.noCommitment')}
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
                <span>{t('paywall.cta.processing')}</span>
              </>
            ) : (
              <span>{showTrial ? t('paywall.cta.startTrial') : t('paywall.cta.startJourney')}</span>
            )}
          </button>

          {!user && (
            <p className="text-center text-white/60 text-sm mt-3">
              {t('paywall.signInFirst')}
            </p>
          )}
        </div>

        {/* Already purchased */}
        <div className="px-6 pb-2 text-center">
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-white/85 hover:text-white text-sm font-medium drop-shadow transition-colors disabled:opacity-50"
          >
            {restoreStatus === 'loading'
              ? t('paywall.restore.loading')
              : restoreStatus === 'done'
                ? t('paywall.restore.done')
                : restoreStatus === 'error'
                  ? t('paywall.restore.nothing')
                  : t('paywall.restore.prompt')}
          </button>
        </div>

        {/* Disclosure — App Store 3.1.2 requires clear, conspicuous subscription terms. */}
        <div className="grid px-8 pt-1 pb-4">
          {trialEligible ? (
            <p
              aria-hidden={!showTrial}
              className={`col-start-1 row-start-1 text-center text-white/90 text-xs leading-relaxed drop-shadow font-medium whitespace-pre-line ${showTrial ? '' : 'invisible pointer-events-none'}`}
            >
              {t('paywall.legal.trial', { price: yearlyPrice, storeName })}
            </p>
          ) : (
            <p
              aria-hidden={selectedPlan !== 'yearly'}
              className={`col-start-1 row-start-1 text-center text-white/90 text-xs leading-relaxed drop-shadow font-medium whitespace-pre-line ${selectedPlan === 'yearly' ? '' : 'invisible pointer-events-none'}`}
            >
              {t('paywall.legal.yearly', { price: yearlyPrice, storeName })}
            </p>
          )}
          <p
            aria-hidden={selectedPlan !== 'monthly'}
            className={`col-start-1 row-start-1 self-center text-center text-white/90 text-xs leading-relaxed drop-shadow font-medium whitespace-pre-line ${selectedPlan === 'monthly' ? '' : 'invisible pointer-events-none'}`}
          >
            {t('paywall.legal.monthly', { price: monthlyPrice, storeName })}
          </p>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-3 pb-6">
          <Link
            href="/terms-of-service"
            className="text-white/85 hover:text-white text-xs font-medium drop-shadow transition-colors"
          >
            {t('paywall.terms')}
          </Link>
          <span className="text-white/60 text-xs drop-shadow">·</span>
          <Link
            href="/privacy-policy"
            className="text-white/85 hover:text-white text-xs font-medium drop-shadow transition-colors"
          >
            {t('paywall.privacy')}
          </Link>
          <span className="text-white/60 text-xs drop-shadow">·</span>
          <button
            onClick={handleRestore}
            disabled={loading || restoreStatus === 'loading'}
            className="text-white/85 hover:text-white text-xs font-medium drop-shadow transition-colors disabled:opacity-50"
          >
            {t('paywall.restore.link')}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
