'use client'

// The one download CTA. A real <a href> to the App Store everywhere, with an
// in-app-browser break-out layered on top — see lib/app-store-link.ts.

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import {
  APP_STORE_URL,
  copyAppStoreLink,
  isInAppBrowser,
  manualOpenSteps,
  openAppStore,
} from '@/lib/app-store-link'

export function AppStoreButton({ className = '' }: { className?: string }) {
  const [stuck, setStuck] = useState(false)
  const [steps, setSteps] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Outside Meta's webviews the plain link already works — don't touch it.
    if (!isInAppBrowser()) return
    e.preventDefault()
    openAppStore({
      onStuck: () => {
        setSteps(manualOpenSteps())
        setStuck(true)
      },
    })
  }, [])

  const retry = useCallback(() => {
    openAppStore({ onStuck: () => setSteps(manualOpenSteps()) })
  }, [])

  const copy = useCallback(async () => {
    setCopied(await copyAppStoreLink())
  }, [])

  return (
    <>
      <a
        href={APP_STORE_URL}
        onClick={handleClick}
        aria-label="Download Sprind on the App Store"
        className={`inline-block transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app-store-badge.png"
          alt="Download on the App Store"
          width={540}
          height={160}
          className="h-[60px] w-auto sm:h-[68px]"
        />
      </a>

      {stuck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Open in your browser"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0D0B0A]/40 backdrop-blur-sm p-4"
          onClick={() => setStuck(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white border border-[#0D0B0A]/10 shadow-2xl p-6 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FF5B1A]/10 flex items-center justify-center">
              <Icon icon="solar:square-top-down-bold" width="24" className="text-[#FF5B1A]" />
            </div>
            <h2 className="mt-4 text-[#0D0B0A] font-bold text-lg">Open in your browser</h2>
            <p className="mt-2 text-[#0D0B0A]/60 text-sm leading-relaxed">
              Instagram and Facebook block App Store links inside their own browser.
            </p>

            <button
              onClick={retry}
              className="mt-5 w-full rounded-2xl bg-[#0D0B0A] text-white font-semibold text-sm py-3.5 active:scale-[0.98] transition-transform"
            >
              Open in my browser
            </button>

            <p className="mt-4 text-[#0D0B0A]/50 text-xs leading-relaxed">
              Still nothing? {steps}
            </p>

            <button
              onClick={copy}
              className="mt-4 inline-flex items-center gap-2 text-[#0D0B0A]/60 text-xs font-medium hover:text-[#0D0B0A]"
            >
              <Icon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} width="15" />
              {copied ? 'Link copied' : 'Copy the link instead'}
            </button>

            <button
              onClick={() => setStuck(false)}
              className="mt-5 block mx-auto text-[#0D0B0A]/35 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
