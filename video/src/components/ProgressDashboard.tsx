import React from 'react'
import { COLOR, FONT, amber } from '../theme'
import { LiquidGlass } from './LiquidGlass'

// A week of learning at a glance, set beside the app's own ACCOUNT page:
// seven days that light up in turn, a bar per day, and the streak. Calm on
// purpose: no scores, no trophies. The values are props, so real activity
// can replace the sample week.

export interface WeekActivity {
  /** Words practised per day, Monday first. */
  words: number[]
  streakDays: number
  minutesListened: number
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const ProgressDashboard: React.FC<{
  week: WeekActivity
  /** 0 → 7: how many days have lit up so far (fractional mid-way). */
  lit: number
  /** 0 → 1: bars rising. */
  bars: number
  /** 0 → 1: the streak line appearing. */
  streak: number
  width?: number
  style?: React.CSSProperties
}> = ({ week, lit, bars, streak, width = 860, style }) => {
  const max = Math.max(...week.words)
  const barArea = 120
  return (
    <LiquidGlass radius={44} fill={0.06} style={{ width, padding: '34px 44px 36px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 26 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.14em', color: COLOR.text2 }}>THIS WEEK</span>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 22,
            letterSpacing: '0.08em',
            color: COLOR.amberSoft,
            opacity: streak,
            transform: `translateY(${(1 - streak) * 8}px)`,
          }}
        >
          {week.streakDays}-day streak · {week.minutesListened} min listened
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {DAYS.map((day, i) => {
          const on = Math.max(0, Math.min(1, lit - i))
          const h = Math.max(6, (week.words[i] / max) * barArea * bars)
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ height: barArea, display: 'flex', alignItems: 'flex-end' }}>
                <div
                  style={{
                    width: 14,
                    height: h,
                    borderRadius: 7,
                    background: on > 0 ? `linear-gradient(${COLOR.amberSoft}, ${COLOR.amber})` : 'rgba(250,250,249,0.14)',
                    opacity: 0.35 + 0.65 * on,
                  }}
                />
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT.ui,
                  fontWeight: 600,
                  fontSize: 24,
                  color: on > 0.5 ? COLOR.bg : COLOR.text2,
                  background: on > 0 ? `rgba(245,158,11,${0.15 + 0.85 * on})` : 'transparent',
                  border: `2px solid ${on > 0 ? amber(0.4 + 0.6 * on) : 'rgba(250,250,249,0.16)'}`,
                  boxShadow: on > 0 ? `0 0 ${24 * on}px ${amber(0.45 * on)}` : 'none',
                  transform: `scale(${1 + 0.08 * Math.sin(Math.PI * on)})`,
                }}
              >
                {day}
              </div>
            </div>
          )
        })}
      </div>
    </LiquidGlass>
  )
}
