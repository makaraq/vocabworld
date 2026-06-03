/**
 * Haptics utility — thin wrapper around @capacitor/haptics.
 * All calls are no-ops on web and gracefully swallowed on unsupported devices.
 */

async function getHaptics() {
  if (typeof window === 'undefined') return null
  const cap = (window as any).Capacitor
  if (!cap?.isNativePlatform?.()) {
    console.log('[Haptics] not native platform, cap =', cap)
    return null
  }
  try {
    const { Haptics } = await import('@capacitor/haptics')
    console.log('[Haptics] plugin loaded:', Haptics)
    return Haptics
  } catch (e) {
    console.error('[Haptics] import failed:', e)
    return null
  }
}

/** Subtle tap — navigation buttons, language/topic selection */
export async function hapticsLight() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Light }).catch((e: any) => console.error('[Haptics] light failed:', e))
}

/** Solid tap — play/stop, rewind trigger */
export async function hapticsMedium() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Medium }).catch((e: any) => console.error('[Haptics] medium failed:', e))
}

/** Strong tap — heavy confirmation */
export async function hapticsHeavy() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Heavy }).catch((e: any) => console.error('[Haptics] heavy failed:', e))
}

/** Success pattern — topic completed, subscription activated */
export async function hapticsSuccess() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { NotificationType } = await import('@capacitor/haptics')
  Haptics.notification({ type: NotificationType.Success }).catch((e: any) => console.error('[Haptics] success failed:', e))
}

/** Warning pattern — paywall shown, locked content tapped */
export async function hapticsWarning() {
  const Haptics = await getHaptics()
  if (!Haptics) return
  const { NotificationType } = await import('@capacitor/haptics')
  Haptics.notification({ type: NotificationType.Warning }).catch((e: any) => console.error('[Haptics] warning failed:', e))
}
