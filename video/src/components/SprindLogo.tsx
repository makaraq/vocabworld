import React from 'react'
import { Img, staticFile } from 'remotion'
import { COLOR, FONT } from '../theme'

// The Sprind mark: the app's own icon (the glossy "S", dark variant from
// ios/App/App/Assets.xcassets) over the wordmark. Either part can be shown
// on its own or faded in separately.

export const SprindLogo: React.FC<{
  iconSize?: number
  wordmarkSize?: number
  gap?: number
  iconOpacity?: number
  wordmarkOpacity?: number
  /** Extra letter spacing on the wordmark, in em; eases to 0 as it settles. */
  tracking?: number
  /** 0 → 1: the amber glow round the icon. */
  glow?: number
  showIcon?: boolean
  style?: React.CSSProperties
}> = ({
  iconSize = 220,
  wordmarkSize = 120,
  gap = 36,
  iconOpacity = 1,
  wordmarkOpacity = 1,
  tracking = 0,
  glow = 1,
  showIcon = true,
  style,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap, ...style }}>
    {showIcon && (
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize * 0.2237,
          overflow: 'hidden',
          opacity: iconOpacity,
          boxShadow: `0 0 ${80 * glow}px ${10 * glow}px rgba(245,158,11,${0.28 * glow}), 0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)`,
        }}
      >
        <Img src={staticFile('app/app-icon-dark.png')} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    )}
    <div
      style={{
        fontFamily: FONT.serif,
        fontSize: wordmarkSize,
        lineHeight: 1,
        letterSpacing: `${-0.01 + tracking}em`,
        color: COLOR.text,
        opacity: wordmarkOpacity,
      }}
    >
      sprind
    </div>
  </div>
)
