'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useAuth } from '@/contexts/auth-context'

/**
 * Test Simulator Component
 * 
 * Allows testing the subscription flow without real payments.
 * Only shows in development mode or for admin users.
 * 
 * Features:
 * - Simulate successful payment
 * - Simulate language preservation
 * - Clear all auth/payment state
 * - View current state
 */
interface TestSimulatorProps {
  nativeLanguageCode?: string
  targetLanguageCode?: string
  onClose: () => void
}

export function TestSimulator({ nativeLanguageCode, targetLanguageCode, onClose }: TestSimulatorProps) {
  const { user, isPremium, refreshSubscription } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  // Check current localStorage state
  const getStorageState = () => {
    if (typeof window === 'undefined') return {}
    return {
      nativeLanguageCode: localStorage.getItem('nativeLanguageCode'),
      targetLanguageCode: localStorage.getItem('targetLanguageCode'),
      paymentLanguageNative: localStorage.getItem('paymentLanguageNative'),
      paymentLanguageTarget: localStorage.getItem('paymentLanguageTarget'),
      paymentInProgress: localStorage.getItem('paymentInProgress'),
      subscriptionJustActivated: localStorage.getItem('subscriptionJustActivated'),
      restoreLanguages: localStorage.getItem('restoreLanguages'),
      welcomeSkipped: localStorage.getItem('welcome-skipped'),
    }
  }
  
  const [storageState, setStorageState] = useState(getStorageState())
  
  const refreshState = () => {
    setStorageState(getStorageState())
  }
  
  // Simulate starting payment (saves languages)
  const simulateStartPayment = () => {
    if (nativeLanguageCode) {
      localStorage.setItem('paymentLanguageNative', nativeLanguageCode)
    }
    if (targetLanguageCode) {
      localStorage.setItem('paymentLanguageTarget', targetLanguageCode)
    }
    localStorage.setItem('paymentInProgress', 'true')
    setMessage('✅ Simulated payment start - languages saved')
    refreshState()
  }
  
  // Simulate successful payment return
  const simulatePaymentSuccess = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // Call test API to set premium status
      const response = await fetch('/api/subscription/test-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to activate premium')
      }
      
      // Simulate success page behavior
      const savedNative = localStorage.getItem('paymentLanguageNative')
      const savedTarget = localStorage.getItem('paymentLanguageTarget')
      
      if (savedNative) {
        localStorage.setItem('nativeLanguageCode', savedNative)
      }
      if (savedTarget) {
        localStorage.setItem('targetLanguageCode', savedTarget)
      }
      
      localStorage.removeItem('paymentLanguageNative')
      localStorage.removeItem('paymentLanguageTarget')
      localStorage.removeItem('paymentInProgress')
      localStorage.setItem('subscriptionJustActivated', 'true')
      
      if (savedNative && savedTarget) {
        localStorage.setItem('restoreLanguages', 'true')
      }
      
      // Refresh subscription status
      await refreshSubscription()
      
      setMessage('✅ Payment simulated! Premium activated. Refresh to see changes.')
      refreshState()
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  // Clear premium status
  const clearPremium = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/subscription/test-deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to deactivate')
      }
      
      await refreshSubscription()
      setMessage('✅ Premium deactivated')
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  // Clear all localStorage
  const clearAllStorage = () => {
    localStorage.removeItem('nativeLanguageCode')
    localStorage.removeItem('targetLanguageCode')
    localStorage.removeItem('paymentLanguageNative')
    localStorage.removeItem('paymentLanguageTarget')
    localStorage.removeItem('paymentInProgress')
    localStorage.removeItem('subscriptionJustActivated')
    localStorage.removeItem('restoreLanguages')
    localStorage.removeItem('welcome-skipped')
    setMessage('✅ All localStorage cleared')
    refreshState()
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="solar:test-tube-bold" className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Test Simulator</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 hover:bg-gray-600 hover:text-white"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        </div>
        
        {/* Current State */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Current State</h3>
          <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">User:</span>
              <span className="text-green-400">{user?.email || 'Not signed in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Premium:</span>
              <span className={isPremium ? 'text-green-400' : 'text-red-400'}>
                {isPremium ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Native Lang:</span>
              <span className="text-blue-400">{nativeLanguageCode || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Target Lang:</span>
              <span className="text-blue-400">{targetLanguageCode || 'None'}</span>
            </div>
          </div>
        </div>
        
        {/* LocalStorage State */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-400">LocalStorage</h3>
            <button
              onClick={refreshState}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Refresh
            </button>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-xs font-mono max-h-40 overflow-y-auto">
            {Object.entries(storageState).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-gray-500 truncate">{key}:</span>
                <span className={value ? 'text-green-400' : 'text-gray-600'}>
                  {value || 'null'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Actions</h3>
          
          {/* Step 1: Start Payment */}
          <button
            onClick={simulateStartPayment}
            disabled={!user}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <Icon icon="solar:play-bold" className="w-4 h-4" />
            1. Start Payment (Save Languages)
          </button>
          
          {/* Step 2: Complete Payment */}
          <button
            onClick={simulatePaymentSuccess}
            disabled={!user || loading}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
            )}
            2. Complete Payment (Activate Premium)
          </button>
          
          {/* Clear Premium */}
          <button
            onClick={clearPremium}
            disabled={!user || loading}
            className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <Icon icon="solar:restart-bold" className="w-4 h-4" />
            Reset to Free User
          </button>
          
          {/* Clear Storage */}
          <button
            onClick={clearAllStorage}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <Icon icon="solar:trash-bin-2-bold" className="w-4 h-4" />
            Clear All LocalStorage
          </button>
        </div>
        
        {/* Message */}
        {message && (
          <div className={`mx-4 mb-4 p-3 rounded-lg text-sm ${
            message.startsWith('✅') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message}
          </div>
        )}
        
        {/* Help */}
        <div className="p-4 bg-gray-800 text-xs text-gray-500">
          <p className="mb-2"><strong>Flow Test Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select native/target languages in the app</li>
            <li>Click "Start Payment" above</li>
            <li>Click "Complete Payment" above</li>
            <li>Refresh the page to see restored languages</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
