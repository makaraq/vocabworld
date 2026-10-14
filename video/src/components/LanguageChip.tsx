import React from 'react'
import { COLOR, FONT, amber } from '../theme'
import { AppIcon } from '../app-ui/icons'
import { flagIcon } from '../app-ui/app-data'
import { LiquidGlass } from './LiquidGlass'

// A language pill in the app's Liquid Glass, with the app's flag for that
// language. Active, it takes the film's amber: a hairline, a soft glow and
// warmer type.

export const LanguageChip: React.FC<{
  label: string
  /** Language code in the app, for its flag; omit for no flag. */
  code?: string
  /** 0 → 1 */
  active?: number
  fontSize?: number
  style?: React.CSSProperties
}> = ({ label, code, active = 0, fontSize = 30, style }) => (
  <LiquidGlass
    fill={0.08 + 0.04 * active}
    tint={active > 0 ? amber(0.1 * active) : undefined}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: fontSize * 0.4,
      padding: `${fontSize * 0.42}px ${fontSize * 0.8}px ${fontSize * 0.42}px ${code ? fontSize * 0.5 : fontSize * 0.8}px`,
      boxShadow: `0 1px 2px rgba(0,0,0,0.12), 0 12px 30px rgba(0,0,0,0.28), 0 0 0 ${1.5 * active}px ${amber(
        0.9 * active,
      )}, 0 0 ${28 * active}px ${amber(0.35 * active)}`,
      ...style,
    }}
  >
    {code && (
      <span
        style={{
          width: fontSize * 1.1,
          height: fontSize * 1.1,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'inline-flex',
          flexShrink: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
        }}
      >
        <AppIcon icon={flagIcon(code)} width={fontSize * 1.1} height={fontSize * 1.1} />
      </span>
    )}
    <span
      style={{
        fontFamily: FONT.ui,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        color: active > 0.5 ? COLOR.amberSoft : COLOR.text,
      }}
    >
      {label}
    </span>
  </LiquidGlass>
)
