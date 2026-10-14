import React from 'react'

// The app's Liquid Glass material (app/liquid-glass.css) for the film's own
// elements outside the phone: a frosted, brightened view of what's behind,
// a lit body (specular bloom across the top, light gathering at the bottom
// inner edge) and a 1.5px rim that catches light top-left and bottom-right.

const RIM = `linear-gradient(135deg,
  rgba(255, 255, 255, 0.95) 0%,
  rgba(255, 255, 255, 0.5) 16%,
  rgba(255, 255, 255, 0.1) 38%,
  rgba(255, 255, 255, 0.06) 62%,
  rgba(255, 255, 255, 0.35) 84%,
  rgba(255, 255, 255, 0.8) 100%)`

const BODY = `radial-gradient(130% 90% at 50% -12%,
    rgba(255, 255, 255, 0.34) 0%,
    rgba(255, 255, 255, 0.1) 38%,
    rgba(255, 255, 255, 0) 58%),
  radial-gradient(110% 70% at 50% 125%,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0) 58%)`

export const LiquidGlass: React.FC<{
  children?: React.ReactNode
  radius?: number | string
  /** White fill strength; the app uses 0.1 at rest. */
  fill?: number
  /** 0 → 1: how much light the rim and body catch. */
  sheen?: number
  /** Extra tint laid over the fill, e.g. an amber wash for an active state. */
  tint?: string
  style?: React.CSSProperties
}> = ({ children, radius = 9999, fill = 0.1, sheen = 1, tint, style }) => (
  <div
    style={{
      position: 'relative',
      isolation: 'isolate',
      borderRadius: radius,
      background: tint ? `linear-gradient(${tint}, ${tint}), rgba(255,255,255,${fill})` : `rgba(255,255,255,${fill})`,
      backdropFilter: 'blur(14px) saturate(180%) brightness(1.08)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%) brightness(1.08)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12), 0 12px 30px rgba(0, 0, 0, 0.28)',
      ...style,
    }}
  >
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: 'inherit', background: BODY, opacity: 0.55 * sheen }}
    />
    {children}
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: 1.5,
        background: RIM,
        opacity: 0.7 * sheen,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
    />
  </div>
)
