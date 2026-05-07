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

export function PaywallModal({
  isOpen,
  onCloseAction,
  onSuccessAction,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [mounted, setMounted] = useState(false)
  const { user, refreshSubscription } = useAuth()
  const { purchasePackage, restorePurchases, loading, error, clearError } = useRevenueCat()
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Auto-dismiss error after 4 seconds
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseAction()
      }}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl max-w-md w-full overflow-hidden border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-white/5 border-b border-white/10">
          <button
            onClick={onCloseAction}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/90 to-orange-500/90 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/20">
              <Icon icon="solar:star-bold" className="w-9 h-9 text-white drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Unlock Vocab World Unlimited</h2>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pt-5 pb-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
            <p className="text-white/80 text-sm font-medium mb-3 drop-shadow">Premium includes:</p>
            <div className="flex flex-col gap-3 text-sm">
              {['All topics unlocked', 'Create custom playlists', 'Word Search'].map(label => (
                <div key={label} className="flex items-center gap-2 text-white/70">
                  <Icon icon="solar:star-bold" className="w-4 h-4 text-green-400 flex-shrink-0 drop-shadow" />
                  <span className="drop-shadow">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pt-3 pb-2 space-y-3">
          {/* Yearly Plan */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative backdrop-blur-sm ${
              selectedPlan === 'yearly'
                ? 'border-green-400/60 bg-green-500/20'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            <span className="absolute -top-2.5 right-3 px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg border border-white/20">
              7-DAY FREE TRIAL
            </span>
            {PRICING.yearly.savings && (
              <span className="absolute -top-2.5 left-3 px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg border border-white/20">
                SAVE {PRICING.yearly.savings}
              </span>
            )}
            <div className="flex items-center justify-between pl-8">
              <div>
                <p className="text-white font-semibold drop-shadow">Yearly</p>
                <p className="text-white/60 text-sm drop-shadow">Billed annually after trial</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl drop-shadow-lg">{formatPrice(PRICING.yearly.price)}</p>
                <p className="text-white/60 text-xs drop-shadow">{formatPrice(PRICING.yearly.price / 12)}/mo</p>
              </div>
            </div>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPlan === 'yearly' ? 'border-green-400 bg-green-500 shadow-lg shadow-green-500/30' : 'border-white/40 bg-white/10'
            }`}>
              {selectedPlan === 'yearly' && (
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-white" />
              )}
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative backdrop-blur-sm ${
              selectedPlan === 'monthly'
                ? 'border-blue-400/60 bg-blue-500/20'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between pl-8">
              <div>
                <p className="text-white font-semibold drop-shadow">Monthly</p>
                <p className="text-white/60 text-sm drop-shadow">Billed monthly</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl drop-shadow-lg">{formatPrice(PRICING.monthly.price)}</p>
                <p className="text-white/60 text-xs drop-shadow">per month</p>
              </div>
            </div>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPlan === 'monthly' ? 'border-blue-400 bg-blue-500 shadow-lg shadow-blue-500/30' : 'border-white/40 bg-white/10'
            }`}>
              {selectedPlan === 'monthly' && (
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Subscribe Button */}
        <div className="p-6 pt-3">
          <button
            onClick={handleSubscribe}
            disabled={loading || !user}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Unlock Now</span>
            )}
          </button>

          {!user && (
            <p className="text-center text-white/60 text-sm mt-3">
              Please sign in to subscribe
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mt-3">
            <Link
              href="/terms-of-service"
              className="text-white/50 hover:text-white/70 text-xs transition-colors underline underline-offset-2"
            >
              Terms of Service
            </Link>
            <span className="text-white/30 text-xs">•</span>
            <Link
              href="/privacy-policy"
              className="text-white/50 hover:text-white/70 text-xs transition-colors underline underline-offset-2"
            >
              Privacy Policy
            </Link>
          </div>

          <p className="text-center text-white/50 text-xs mt-2">
            Cancel anytime • Secure payment
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
