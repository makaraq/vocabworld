'use client'

/**
 * RevenueCat client-side SDK initialization.
 *
 * Strategy:
 *  - Capacitor native (iOS / Android) → @revenuecat/purchases-capacitor
 *  - Browser → @revenuecat/purchases-js
 *
 * Call `initRevenueCat(userId)` once per session, right after the user signs in.
 * Call `logOutRevenueCat()` on sign-out.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

export const RC_ENTITLEMENT = 'Vocab World Unlimited'

export const RC_OFFERING_ID  = 'default'
export const RC_MONTHLY_PKG  = '$rc_monthly'   // RevenueCat default monthly identifier
export const RC_YEARLY_PKG   = '$rc_annual'    // RevenueCat default annual identifier

// ─── Platform detection ──────────────────────────────────────────────────────

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  // Capacitor sets window.Capacitor when running inside a native shell
  return !!(window as any)?.Capacitor?.isNativePlatform?.()
}

// ─── Initialisation ──────────────────────────────────────────────────────────

let _rcInitialised = false

/**
 * Initialise RevenueCat and log in the given Supabase user ID.
 * Safe to call multiple times; subsequent calls update the logged-in user.
 */
export async function initRevenueCat(supabaseUserId: string): Promise<void> {
  if (typeof window === 'undefined') return // SSR guard

  try {
    if (isNative()) {
      const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor')
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || 
                     process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY || ''

      if (!_rcInitialised) {
        // LOG_LEVEL.DEBUG useful in development — set to ERROR for production builds
        await Purchases.setLogLevel({ level: process.env.NODE_ENV === 'development' ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR })
        await Purchases.configure({ apiKey })
        _rcInitialised = true
      }

      await Purchases.logIn({ appUserID: supabaseUserId })
    } else {
      const { Purchases } = await import('@revenuecat/purchases-js')
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || ''

      // purchases-js configure() also handles logIn — appUserId is the 2nd param
      Purchases.configure(apiKey, supabaseUserId)
      _rcInitialised = true
    }
  } catch (err) {
    console.error('[RC] Failed to initialise RevenueCat:', err)
  }
}

/**
 * Log the current user out of RevenueCat (call on Supabase sign-out).
 */
export async function logOutRevenueCat(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!_rcInitialised) return

  try {
    if (isNative()) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.logOut()
    } else {
      const { Purchases } = await import('@revenuecat/purchases-js')
      // Web SDK has no logOut(); switch to an anonymous user ID to clear identity
      await Purchases.getSharedInstance().changeUser(
        Purchases.generateRevenueCatAnonymousAppUserId()
      )
    }
    _rcInitialised = false
  } catch (err) {
    console.error('[RC] Failed to log out:', err)
  }
}

/**
 * Fetch the current customer info from RevenueCat.
 * Returns null if RC is not yet initialised or an error occurs.
 */
export async function getRCCustomerInfo(): Promise<{
  activeEntitlements: string[]
  isPremium: boolean
  managementURL: string | null
} | null> {
  if (typeof window === 'undefined' || !_rcInitialised) return null

  try {
    if (isNative()) {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { customerInfo } = await Purchases.getCustomerInfo()
      const activeEntitlements = Object.keys(customerInfo.entitlements.active)
      return {
        activeEntitlements,
        isPremium: RC_ENTITLEMENT in customerInfo.entitlements.active,
        managementURL: (customerInfo as any).managementURL ?? null,
      }
    } else {
      const { Purchases } = await import('@revenuecat/purchases-js')
      const info = await Purchases.getSharedInstance().getCustomerInfo()
      const activeEntitlements = Object.keys(info.entitlements.active)
      return {
        activeEntitlements,
        isPremium: RC_ENTITLEMENT in info.entitlements.active,
        managementURL: (info as any).managementURL ?? null,
      }
    }
  } catch (err) {
    console.error('[RC] getCustomerInfo failed:', err)
    return null
  }
}
