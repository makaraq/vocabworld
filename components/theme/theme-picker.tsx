'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useT } from '@/components/providers/translation-provider'
import { hapticsLight } from '@/lib/haptics'
import { THEMES, currentTheme, onThemeChange, setTheme, type ThemeId } from '@/lib/themes'

// A row of theme swatches. Tapping one changes the app at once. A premium
// theme (crowned) goes through `onPremiumAction` for anyone without Premium,
// which previews it and asks them to upgrade. `compact` puts all of them on
// one row, for the theme tool's small panel.

export function ThemePicker({
  isPremium,
  onPremiumAction,
  compact = false,
}: {
  isPremium: boolean
  onPremiumAction: (id: ThemeId) => void
  compact?: boolean
}) {
  const { t } = useT()
  const [active, setActive] = useState<ThemeId>('original')

  useEffect(() => {
    setActive(currentTheme())
    return onThemeChange((id) => setActive(id))
  }, [])

  const badge = compact ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className={`grid ${compact ? 'grid-cols-6 gap-1.5' : 'grid-cols-3 gap-2'}`} role="radiogroup" aria-label={t('theme.title')}>
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
              className={`relative w-full aspect-[3/4] ${compact ? 'rounded-lg' : 'rounded-xl'} overflow-hidden border-2 transition-all duration-200 ${
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
                    : theme.chrome
                      ? {
                          // black glass inside a silver rim with iridescent corners
                          borderColor: 'transparent',
                          background:
                            'linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 45%) padding-box, linear-gradient(#08090d, #08090d) padding-box, ' +
                            'linear-gradient(135deg, #fff 0%, #9ff0ff 8%, #6d86ff 16%, #b87bff 24%, rgba(255,255,255,0.45) 36%, rgba(255,255,255,0.12) 60%, #ffc27a 78%, #ff80d8 88%, #8ff3ff 100%) border-box',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                        }
                      : { background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.3)' }
                }
              >
                <span className="absolute left-[18%] right-[30%] top-[28%] h-[10%] rounded-full" style={{ background: theme.light ? '#2a1710' : '#fff' }} />
                <span className="absolute left-[18%] right-[48%] top-[54%] h-[8%] rounded-full" style={{ background: theme.light ? 'rgba(42,23,16,0.45)' : 'rgba(255,255,255,0.6)' }} />
              </span>
              {theme.premium && (
                <span className={`absolute top-1 right-1 ${badge} rounded-full bg-black/45 flex items-center justify-center`}>
                  <Icon icon="solar:crown-bold" width={compact ? 10 : 12} className="text-yellow-400" />
                </span>
              )}
              {on && (
                <span className={`absolute bottom-1 right-1 ${badge} rounded-full bg-white flex items-center justify-center`}>
                  <Icon icon="solar:check-read-linear" width={compact ? 11 : 13} className="text-black" />
                </span>
              )}
            </span>
            {/* Compact names stay regular weight when chosen: bold would push
                longer ones (Обсидиан) past their cell and split them. */}
            <span
              className={`${compact ? 'text-[10px] leading-[1.15] line-clamp-2 break-words' : 'text-[11px] leading-tight truncate'} text-center w-full ${
                on ? `text-white ${compact ? 'font-medium' : 'font-semibold'}` : 'text-white/60'
              }`}
            >
              {t(`theme.name.${theme.id}` as const)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
