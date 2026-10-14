import React from 'react'
import { staticFile } from 'remotion'
import { PHONE } from '../theme'

// The app's page and main panel, as app/page.tsx and LanguageSelector lay
// them out. Responsive classes are resolved for the 440pt iPhone width: `xs:`
// (≥420px) applies there, `sm:` and up never do. `min-h-screen` and
// `max-h-[95vh]` become the phone's own 956pt height.
//
// The root carries the classes the iOS app sets on <html>: `cap-native`
// (layout.tsx) and `liquid-glass` (lib/liquid-glass.ts), so app/globals.css
// and app/liquid-glass.css restyle this markup exactly as they do on a phone.

export const AppScreen: React.FC<{
  children: React.ReactNode
  /** isTransitioning: the panel brightens while its content dips. */
  transitioning?: boolean
}> = ({ children, transitioning = false }) => {
  return (
    <div
      className="app-ui liquid-glass cap-native ios-device"
      style={{ width: PHONE.width, height: PHONE.height, position: 'relative', overflow: 'hidden' }}
    >
      <div
        className="flex flex-col items-center justify-center p-4 pt-16 pb-8"
        style={{
          minHeight: PHONE.height,
          backgroundImage: `url('${staticFile('app/bg.jpeg')}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="w-full max-w-2xl mx-auto px-2 h-full flex items-center"
          style={{ maxHeight: PHONE.height * 0.95 }}
        >
          <div
            className={`bg-white/5 backdrop-blur-3xl border border-white/15 rounded-2xl px-3 py-4 shadow-2xl w-full max-h-full overflow-hidden ${
              transitioning ? 'bg-white/10' : 'bg-white/5'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The app's page dip (`opacity-30 scale-95` while isTransitioning, back to
 * full over 200ms). `dip` 0 → resting, 1 → fully dipped.
 */
export const dipStyle = (dip: number): React.CSSProperties => ({
  opacity: 1 - 0.7 * dip,
  transform: `scale(${1 - 0.05 * dip})`,
})
