'use client'

import { useState, useCallback } from 'react'
import { RC_ENTITLEMENT, RC_MONTHLY_PKG, RC_YEARLY_PKG } from '@/lib/revenuecat-client'

/**
 * React hook that wraps RevenueCat purchase flows for both Capacitor and web.
 *
 * Usage:
 *   const { purchasePackage, restorePurchases, loading, error } = useRevenueCat()
 */

interface RCPackageInfo {
  identifier: string
  priceString: string
  description: string
}

export interface UseRevenueCatReturn {
  purchasePackage: (plan: 'monthly' | 'yearly') => Promise<boolean>
  restorePurchases: () => Promise<boolean>
  getOfferings: () => Promise<RCPackageInfo[]>
  loading: boolean
  error: string | null
  clearError: () => void
}

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any)?.Capacitor?.isNativePlatform?.()
}

export function useRevenueCat(): UseRevenueCatReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const purchasePackage = useCallback(async (plan: 'monthly' | 'yearly'): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const packageId = plan === 'yearly' ? RC_YEARLY_PKG : RC_MONTHLY_PKG

    try {
      if (isNative()) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')

        const offerings = await Purchases.getOfferings()
        const offering = offerings.current
        if (!offering) throw new Error('No offering available')

        const pkg = offering.availablePackages.find(p => p.identifier === packageId)
          ?? offering.availablePackages[0]

        if (!pkg) throw new Error('Package not found')

        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
        const hasPremium = RC_ENTITLEMENT in customerInfo.entitlements.active
        if (!hasPremium) throw new Error('Purchase completed but entitlement not granted yet')
        return true
      } else {
        const { Purchases } = await import('@revenuecat/purchases-js')
        const instance = Purchases.getSharedInstance()

        const offerings = await instance.getOfferings()
        const offering = offerings.current
        if (!offering) throw new Error('No offering available')

        const pkg = offering.availablePackages.find(p => p.identifier === packageId)
          ?? offering.availablePackages[0]

        if (!pkg) throw new Error('Package not found')

        const { customerInfo } = await instance.purchase({ rcPackage: pkg })
        const hasPremium = RC_ENTITLEMENT in customerInfo.entitlements.active
        if (!hasPremium) throw new Error('Purchase completed but entitlement not granted yet')
        return true
      }
    } catch (err: any) {
      // USER_CANCELLED is not an error — don't show error UI
      const isCancelled =
        err?.code === 'PURCHASE_CANCELLED' ||
        err?.userCancelled === true ||
        err?.message?.toLowerCase().includes('cancel')

      if (!isCancelled) {
        console.error('[RC] purchasePackage error:', err)
        setError(err?.message ?? 'Purchase failed. Please try again.')
      }
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      if (isNative()) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const { customerInfo } = await Purchases.restorePurchases()
        return RC_ENTITLEMENT in customerInfo.entitlements.active
      } else {
        const { Purchases } = await import('@revenuecat/purchases-js')
        // Web SDK: restore is handled by logging in with the same appUserId
        const info = await Purchases.getSharedInstance().getCustomerInfo()
        return RC_ENTITLEMENT in info.entitlements.active
      }
    } catch (err: any) {
      console.error('[RC] restorePurchases error:', err)
      setError(err?.message ?? 'Restore failed. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getOfferings = useCallback(async (): Promise<RCPackageInfo[]> => {
    try {
      if (isNative()) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const offerings = await Purchases.getOfferings()
        return (offerings.current?.availablePackages ?? []).map(p => ({
          identifier: p.identifier,
          priceString: p.product.priceString,
          description: p.product.description,
        }))
      } else {
        const { Purchases } = await import('@revenuecat/purchases-js')
        const offerings = await Purchases.getSharedInstance().getOfferings()
        return (offerings.current?.availablePackages ?? []).map(p => ({
          identifier: p.identifier,
          priceString: p.rcBillingProduct?.currentPrice?.formattedPrice ?? '',
          description: p.rcBillingProduct?.title ?? '',
        }))
      }
    } catch (err) {
      console.error('[RC] getOfferings error:', err)
      return []
    }
  }, [])

  return { purchasePackage, restorePurchases, getOfferings, loading, error, clearError }
}
