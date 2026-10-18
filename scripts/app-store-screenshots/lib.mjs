import { chromium } from 'playwright-core'
export const DEVICES = {
  iphone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  ipad: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
}
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'alex@example.com', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Alex Martin', name: 'Alex Martin' }, created_at: '2026-01-01T00:00:00Z' }
const b64u = (s) => Buffer.from(s).toString('base64url')
const jwt = [b64u('{"alg":"HS256","typ":"JWT"}'), b64u(JSON.stringify({ sub: user.id, exp: 4102444800, role: 'authenticated', aud: 'authenticated' })), 'sig'].join('.')
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }

export async function open(device = 'iphone', extraStorage = {}) {
  const d = DEVICES[device]
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' })
  const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, userAgent: d.ua, hasTouch: true, isMobile: device === 'iphone' })
  await ctx.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + b64u(JSON.stringify(session)), domain: 'localhost', path: '/' }])
  await ctx.addInitScript((extra) => {
    const set = { 'sprind:liquid-glass': 'on', nativeLanguageCode: 'en', targetLanguageCode: 'es', vw_tutorial_shown: 'true', vw_learning_tutorial_shown: 'true', vw_theme_intro_shown: 'true', vw_notif_prompted: 'true', ...extra }
    for (const [k, v] of Object.entries(set)) localStorage.setItem(k, v)
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style')
      s.textContent = 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }'
      document.head.appendChild(s)
      document.documentElement.classList.add('cap-native')
    })
  }, extraStorage)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERR', e.message.slice(0, 160)))
  await page.goto('http://localhost:3123/?app=1', { waitUntil: 'networkidle', timeout: 180000 }).catch((e) => console.log('goto', e.message))
  await page.waitForTimeout(2500)
  return { browser, page }
}
