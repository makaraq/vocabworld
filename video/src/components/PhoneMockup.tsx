import React from 'react'
import { FONT, PHONE } from '../theme'

// A minimal iPhone 17 Pro Max: titanium band, black bezel, Dynamic Island,
// status bar and home indicator around a 440 × 956pt screen. Built at 1pt =
// 1px and scaled by the caller, so the app inside lays out at its real size.

const BEZEL = 13
const BAND = 4
const SCREEN_RADIUS = 62

export const PHONE_OUTER = {
  width: PHONE.width + 2 * (BEZEL + BAND),
  height: PHONE.height + 2 * (BEZEL + BAND),
}

const StatusBar: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 58,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 34px 0 56px',
      color: '#fff',
      fontFamily: FONT.system,
      fontWeight: 600,
      fontSize: 17,
      letterSpacing: -0.2,
      zIndex: 20,
      pointerEvents: 'none',
    }}
  >
    <span>9:41</span>
    <svg width="78" height="14" viewBox="0 0 78 14" aria-hidden>
      {/* signal */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width="3.2" height={4 + i * 3} rx="1" fill="#fff" />
      ))}
      {/* wifi */}
      <path
        d="M31.5 3.2c2.6 0 5 1 6.8 2.7l1.2-1.3A11.4 11.4 0 0 0 31.5 1.4 11.4 11.4 0 0 0 23.6 4.6l1.2 1.3c1.8-1.7 4.1-2.7 6.7-2.7zm0 3.6c1.6 0 3 .6 4.1 1.6l1.2-1.3a7.6 7.6 0 0 0-10.6 0l1.2 1.3c1.1-1 2.5-1.6 4.1-1.6zm0 3.6c.6 0 1.1.2 1.5.6l-1.5 1.6-1.5-1.6c.4-.4.9-.6 1.5-.6z"
        fill="#fff"
      />
      {/* battery */}
      <rect x="46.5" y="1.5" width="25" height="11" rx="3.4" fill="none" stroke="rgba(255,255,255,0.45)" />
      <rect x="48.5" y="3.5" width="21" height="7" rx="1.8" fill="#fff" />
      <path d="M73.4 5.2v3.6c.8-.3 1.3-1 1.3-1.8s-.5-1.5-1.3-1.8z" fill="rgba(255,255,255,0.45)" />
    </svg>
  </div>
)

export const PhoneMockup: React.FC<{
  children: React.ReactNode
  /** A band of light sliding across the glass and down the band, 0 → 1. */
  glare?: number
  style?: React.CSSProperties
}> = ({ children, glare, style }) => {
  const outerRadius = SCREEN_RADIUS + BEZEL + BAND
  return (
    <div
      style={{
        position: 'relative',
        width: PHONE_OUTER.width,
        height: PHONE_OUTER.height,
        borderRadius: outerRadius,
        // Titanium band: lit along its edges.
        background:
          'linear-gradient(145deg, #6b645d 0%, #2b2724 18%, #1a1715 50%, #2b2724 82%, #807870 100%)',
        boxShadow:
          '0 60px 120px rgba(0,0,0,0.55), 0 20px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {/* Side buttons */}
      {[
        { side: 'left', top: 190, h: 34 },
        { side: 'left', top: 250, h: 66 },
        { side: 'left', top: 330, h: 66 },
        { side: 'right', top: 280, h: 104 },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            [b.side]: -3,
            top: b.top,
            width: 4,
            height: b.h,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #3a3531, #6d655e, #3a3531)',
          }}
        />
      ))}

      {/* Bezel */}
      <div
        style={{
          position: 'absolute',
          inset: BAND,
          borderRadius: outerRadius - BAND,
          background: '#050505',
        }}
      />

      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          left: BEZEL + BAND,
          top: BEZEL + BAND,
          width: PHONE.width,
          height: PHONE.height,
          borderRadius: SCREEN_RADIUS,
          overflow: 'hidden',
          background: '#000',
          isolation: 'isolate',
        }}
      >
        {children}
        <StatusBar />
        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            width: 126,
            height: 37,
            marginLeft: -63,
            borderRadius: 19,
            background: '#000',
            zIndex: 21,
          }}
        />
        {/* Home indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 9,
            left: '50%',
            width: 146,
            height: 5,
            marginLeft: -73,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.85)',
            zIndex: 21,
          }}
        />
        {/* Glass glare */}
        {glare !== undefined && glare > 0 && glare < 1 && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-20%',
              zIndex: 22,
              pointerEvents: 'none',
              background: `linear-gradient(115deg, transparent ${glare * 140 - 30}%, rgba(255,255,255,0.10) ${
                glare * 140 - 18
              }%, rgba(255,255,255,0.02) ${glare * 140 - 8}%, transparent ${glare * 140}%)`,
            }}
          />
        )}
      </div>

      {/* Light catching the band as the glare passes */}
      {glare !== undefined && glare > 0 && glare < 1 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: outerRadius,
            padding: 2,
            background: `linear-gradient(115deg, transparent ${glare * 140 - 30}%, rgba(251,191,36,0.75) ${
              glare * 140 - 15
            }%, transparent ${glare * 140}%)`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
