// Opening the App Store from inside Meta's in-app browsers.
//
// Instagram / Threads / Facebook / Messenger render links in their own
// webview, and that webview silently swallows navigations to
// `https://apps.apple.com/...` — the user taps the badge and nothing happens.
// The fix is to break out to the system browser first and let *it* hand the
// link to the App Store app.
//
// Everywhere else (Safari, Chrome, desktop) we do nothing at all: the badge
// stays a plain `<a href>` so middle-click, long-press and "open in new tab"
// keep working, and the App Store opens directly.

export const APP_STORE_URL =
  'https://apps.apple.com/us/app/sprind-learn-languages-fast/id6775668237'

export type InAppBrowser = 'instagram' | 'facebook' | null

function ua(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent || (navigator as unknown as { vendor?: string }).vendor || ''
}

export function isIOS(): boolean {
  const u = ua()
  if (/iPad|iPhone|iPod/.test(u)) return true
  // iPadOS 13+ reports as a Mac; the touch point check separates it.
  return /Macintosh/.test(u) && typeof document !== 'undefined' && 'ontouchend' in document
}

export function isAndroid(): boolean {
  return /Android/i.test(ua())
}

/**
 * Which Meta webview we are inside, if any.
 * - Instagram and Threads (`Barcelona` is Threads' internal UA token).
 * - Facebook: FBAN / FBAV / FB_IAB / FBIOS, plus Messenger.
 */
export function getInAppBrowser(): InAppBrowser {
  const u = ua()
  if (/Instagram/i.test(u) || /Barcelona/i.test(u)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(u)) return 'facebook'
  return null
}

export function isInAppBrowser(): boolean {
  return getInAppBrowser() !== null
}

/**
 * Try to hand `url` to the system browser. Returns false when there is
 * nothing useful to try (i.e. we are not in a Meta webview).
 *
 * iOS/Instagram is the one that needs the special scheme: `x-safari-<url>`
 * assigned to `location.href` is blocked by Instagram's webview, but
 * `instagram://extbrowser?url=` is intercepted by the Instagram *app*, which
 * then opens Safari itself.
 */
export function escapeInAppBrowser(url: string = APP_STORE_URL): boolean {
  const browser = getInAppBrowser()
  if (!browser) return false

  if (isAndroid()) {
    // Android webviews honour intent:// — Chrome (the default handler for
    // https) picks it up and then forwards to the Play Store / web.
    window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`
    return true
  }

  if (isIOS()) {
    if (browser === 'instagram') {
      window.location.href = `instagram://extbrowser?url=${encodeURIComponent(url)}`
      return true
    }
    // Facebook / Messenger: window.open with the x-safari- prefix survives.
    window.open(`x-safari-${url}`, '_blank')
    return true
  }

  window.open(url, '_blank')
  return true
}

/**
 * Fire the escape and report whether it worked.
 *
 * There is no callback for "the OS took over", so we watch for the page being
 * backgrounded (visibilitychange / pagehide / blur). If none of those fire
 * within `timeout`, we are still sitting in the webview and the caller should
 * show the manual fallback.
 */
export function openAppStore(
  options: { url?: string; timeout?: number; onStuck?: () => void } = {},
): void {
  const { url = APP_STORE_URL, timeout = 1500, onStuck } = options

  if (!isInAppBrowser()) {
    window.location.href = url
    return
  }

  let settled = false
  const succeeded = () => {
    if (settled) return
    settled = true
    cleanup()
  }
  const cleanup = () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', succeeded)
    window.removeEventListener('blur', succeeded)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') succeeded()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', succeeded)
  window.addEventListener('blur', succeeded)

  escapeInAppBrowser(url)

  window.setTimeout(() => {
    if (settled) return
    settled = true
    cleanup()
    onStuck?.()
  }, timeout)
}

/** Manual steps to show when the automatic break-out is blocked. */
export function manualOpenSteps(): string {
  const browser = getInAppBrowser()
  if (browser === 'instagram') {
    return isIOS()
      ? 'Tap ••• at the top right, then “Open in external browser”.'
      : 'Tap ⋮ at the top right, then “Open in browser”.'
  }
  if (browser === 'facebook') {
    return isIOS()
      ? 'Tap ••• at the bottom right, then “Open in Safari”.'
      : 'Tap ⋮ at the top right, then “Open in Chrome”.'
  }
  return 'Open this page in Safari or Chrome.'
}

export async function copyAppStoreLink(url: string = APP_STORE_URL): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
  } catch {
    // fall through to the execCommand path below
  }
  try {
    const input = document.createElement('textarea')
    input.value = url
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    input.setSelectionRange(0, url.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    return ok
  } catch {
    return false
  }
}
