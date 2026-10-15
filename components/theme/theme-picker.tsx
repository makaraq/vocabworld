'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useT } from '@/components/providers/translation-provider'
import { hapticsLight } from '@/lib/haptics'
import { THEMES, currentTheme, onThemeChange, setTheme, type ThemeId } from '@/lib/themes'

// A row of theme swatches. Tapping one changes the app at once. A premium
// theme (crowned) goes through `onPremiumAction` for anyone without Premium,
// which previews it and asks them to upgrade.

export function ThemePicker({
  isPremium,
  onPremiumAction,
}: {
  isPremium: boolean
  onPremiumAction: (id: ThemeId) => void
}) {
  const { t } = useT()
  const [active, setActive] = useState<ThemeId>('original')

  useEffect(() => {
    setActive(currentTheme())
    return onThemeChange((id) => setActive(id))
  }, [])

  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t('theme.title')}>
      {THEMES.map((theme) => {
        const on = theme.id === active
        return (
          <button
            key={theme.id}
            role="radio"
            aria-checked={on}
            onClick={() => {
              hapticsLight()
              if (theme.premium && !isPremium) onPremiumAction(theme.id)
              else setTheme(theme.id)
            }}
            className="flex flex-col items-center gap-1.5 min-w-0"
          >
            <span
              className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                on ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)] scale-105' : 'border-white/25'
              }`}
              style={{ background: theme.swatch }}
            >
              {/* a pane of glass and two lines of "text", as the theme draws them */}
              <span
                className="absolute inset-x-[18%] top-[30%] bottom-[30%] rounded-md border"
                style={
                  theme.light
                    ? { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(42,23,16,0.12)' }
                    : { background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.3)' }
                }
              >
                <span className="absolute left-[18%] right-[30%] top-[28%] h-[10%] rounded-full" style={{ background: theme.light ? '#2a1710' : '#fff' }} />
                <span className="absolute left-[18%] right-[48%] top-[54%] h-[8%] rounded-full" style={{ background: theme.light ? 'rgba(42,23,16,0.45)' : 'rgba(255,255,255,0.6)' }} />
              </span>
              {theme.premium && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/45 flex items-center justify-center">
                  <Icon icon="solar:crown-bold" width="12" className="text-yellow-400" />
                </span>
              )}
              {on && (
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <Icon icon="solar:check-read-linear" width="13" className="text-black" />
                </span>
              )}
            </span>
            <span className={`text-[11px] leading-tight text-center truncate w-full ${on ? 'text-white font-semibold' : 'text-white/60'}`}>
              {t(`theme.name.${theme.id}` as const)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
