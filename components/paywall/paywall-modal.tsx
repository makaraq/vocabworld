'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { PRICING, formatPrice } from '@/lib/pricing'
import { useAuth } from '@/contexts/auth-context'

interface PaywallModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onSuccessAction?: () => void
}

export function PaywallModal({ isOpen, onCloseAction, onSuccessAction }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { user, signInWithGoogle, loading: authLoading } = useAuth()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const handleSubscribe = async () => {
    // Check if user is authenticated
    if (!user) {
      setError('Please sign in first to subscribe')
      return
    }
    
    console.log('🔐 User authenticated, proceeding with subscription:', user.email)
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ priceType: selectedPlan }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          data
        })
        throw new Error(data.error || `Failed to create checkout (${response.status})`)
      }
      
      if (data.url) {
        // Store that we're about to go to payment
        localStorage.setItem('paymentInProgress', 'true')
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('❌ Subscription error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔑 Starting Google sign-in flow...')
      await signInWithGoogle()
      console.log('✅ Sign-in completed')
    } catch (err: any) {
      console.error('❌ Sign in error:', err)
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
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
              <Icon icon="solar:crown-bold" className="w-9 h-9 text-white drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">Unlock Premium</h2>
            <p className="text-white/70 drop-shadow">Get access to all 47 vocabulary topics</p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}
          
          {/* Yearly Plan */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative backdrop-blur-sm ${
              selectedPlan === 'yearly'
                ? 'border-green-400/60 bg-green-500/20'
                : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
            }`}
          >
            {PRICING.yearly.savings && (
              <span className="absolute -top-2.5 right-3 px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg border border-white/20">
                SAVE {PRICING.yearly.savings}
              </span>
            )}
            <div className="flex items-center justify-between pl-8">
              <div>
                <p className="text-white font-semibold drop-shadow">Yearly</p>
                <p className="text-white/60 text-sm drop-shadow">Billed annually</p>
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

        {/* Features */}
        <div className="px-6 pb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
            <p className="text-white/80 text-sm font-medium mb-3 drop-shadow">Premium includes:</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-400 flex-shrink-0 drop-shadow" />
                <span className="drop-shadow">47 topics</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-400 flex-shrink-0 drop-shadow" />
                <span className="drop-shadow">50 languages</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-400 flex-shrink-0 drop-shadow" />
                <span className="drop-shadow">Custom playlists</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-400 flex-shrink-0 drop-shadow" />
                <span className="drop-shadow">Word search</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscribe Button */}
        <div className="p-6 pt-2 bg-white/5 border-t border-white/10">
          {!user ? (
            // Show sign in button if not authenticated
            <button
              onClick={handleSignIn}
              disabled={loading || authLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/20 border border-white/20 flex items-center justify-center gap-2"
            >
              {loading || authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="drop-shadow">Signing in...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:user-plus-bold" className="w-5 h-5 drop-shadow" />
                  <span className="drop-shadow">Sign In to Subscribe</span>
                </>
              )}
            </button>
          ) : (
            // Show subscribe button if authenticated
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:shadow-green-500/20 border border-white/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="drop-shadow">Processing...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:shield-check-bold" className="w-5 h-5 drop-shadow" />
                  <span className="drop-shadow">Subscribe Now</span>
                </>
              )}
            </button>
          )}
          
          <p className="text-center text-white/50 text-xs mt-3 drop-shadow">
            {!user ? 'Sign in with Google to continue' : 'Cancel anytime • Secure payment via Stripe'}
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
