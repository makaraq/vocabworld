/**
 * Haptics utility — thin wrapper around @capacitor/haptics.
 * All calls are no-ops on web and gracefully swallowed on unsupported devices.
 */

import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

async function getHaptics() {
  if (!isNative) return null
  const { Haptics } = await import('@capacitor/haptics')
  return Haptics
}

/** Subtle tap — navigation buttons, language/topic selection */
export async function hapticsLight() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/** Solid tap — play/stop, rewind trigger */
export async function hapticsMedium() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}

/** Strong tap — heavy confirmation */
export async function hapticsHeavy() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
}

/** Success pattern — topic completed, subscription activated */
export async function hapticsSuccess() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { NotificationType } = await import('@capacitor/haptics')
  Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

/** Warning pattern — paywall shown, locked content tapped */
export async function hapticsWarning() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { NotificationType } = await import('@capacitor/haptics')
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {})
}
