import React from 'react'

// Interaction states the app gets from :active, touch handlers and CSS
// animations, expressed as values so a frame can be rendered on its own.

/**
 * A Liquid Glass control under a finger (app/liquid-glass.css :active): it
 * swells on a spring, brightens what's behind it and glows where it's
 * touched. `p` 0 → at rest, 1 → fully pressed. The material reads these
 * custom properties, so they are set rather than the !important declarations.
 */
export function glassPress(p: number, base = { fill: 0.1, active: 0.2 }): React.CSSProperties {
  if (p <= 0) return {}
  const fill = base.fill + (base.active - base.fill) * p
  return {
    scale: `${1 + 0.08 * p}`,
    ['--lg-fill' as string]: `rgba(255, 255, 255, ${fill})`,
    ['--lg-touch' as string]: `rgba(255, 255, 255, ${0.4 * p})`,
    ['--lg-lift' as string]: `0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 22px rgba(0, 0, 0, 0.16), 0 0 22px rgba(255, 255, 255, ${0.28 * p})`,
    ['--lg-vibrancy' as string]: `blur(8px) saturate(${180 + 20 * p}%) brightness(${1.08 + 0.12 * p})`,
  } as React.CSSProperties
}

/** Tailwind's animate-pulse: opacity 1 → 0.5 → 1 every 2s. */
export function pulseOpacity(frame: number, fps: number): number {
  const t = (frame / fps) % 2
  const x = t < 1 ? t : 2 - t
  const eased = x * x * (3 - 2 * x)
  return 1 - 0.5 * eased
}

/**
 * A fingertip on the glass, for the moments the film taps the app: a soft
 * disc that lands, holds and lifts. Drawn inside the touched element so it
 * sits wherever the app's layout put it. `t` runs 0 → 1 over the tap.
 */
export const Touch: React.FC<{ t: number; size?: number }> = ({ t, size = 46 }) => {
  if (t <= 0 || t >= 1) return null
  const land = Math.min(1, t / 0.25)
  const lift = t > 0.7 ? (t - 0.7) / 0.3 : 0
  const opacity = land * (1 - lift)
  const scale = 0.7 + 0.3 * land + 0.25 * lift
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 72%)',
        boxShadow: '0 0 0 1.5px rgba(255,255,255,0.45)',
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}

/**
 * A ring round an app element the film wants the viewer to look at. It is
 * the app's own highlight, the coach-mark tutorial's ring (border-2
 * border-white/80 with a white glow, coach-mark-overlay.tsx), with the
 * film's amber as a halo outside it.
 */
export const FocusRing: React.FC<{ p: number; radius?: number | string; inset?: number }> = ({
  p,
  radius = 16,
  inset = -4,
}) => {
  if (p <= 0) return null
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset,
        borderRadius: typeof radius === 'number' ? radius - inset : radius,
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: `0 0 ${24 * p}px ${4 * p}px rgba(255, 255, 255, ${0.35 * p}), 0 0 ${44 * p}px ${10 * p}px rgba(245, 158, 11, ${0.4 * p})`,
        opacity: p,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}
