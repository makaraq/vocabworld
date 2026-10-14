import React from 'react'
import { X } from 'lucide-react'
import { AppIcon } from './icons'
import { Touch, glassPress } from './motion'
import { vh } from './AppScreen'

// The learning page's settings modal (language-selector.tsx), at the 440pt
// width. Speeds are the app's: Slow, Normal, Fast (playback 0.9×, 1×, 1.1×).

export type Speed = 'Slow' | 'Normal' | 'Fast'

export interface SettingsState {
  autoPlay: boolean
  playTargetOnly: boolean
  showPhonetics: boolean
  showPlayCount: boolean
  rewindEnabled: boolean
  pronunciationSpeed: Speed
  pauseBetweenTranslations: number
  pauseForNextWord: number
  repeatTargetLanguage: number
  repeatMainLanguage: number
}

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <button className={`w-11 h-6 rounded-full flex-shrink-0 ${on ? 'bg-blue-500' : 'bg-black/30 border border-white/20'}`}>
    <div className={`w-5 h-5 bg-white rounded-full ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
)

const ToggleRow: React.FC<{ icon: string; label: string; desc: string; on: boolean }> = ({ icon, label, desc, on }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <AppIcon icon={icon} width="20" height="20" className="text-white/60 flex-shrink-0" />
        <p className="text-white text-base">{label}</p>
      </div>
      <p className="text-white/50 text-sm mt-0.5">{desc}</p>
    </div>
    <Toggle on={on} />
  </div>
)

const Slider: React.FC<{
  icon: string
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (v: number) => string
}> = ({ icon, label, min, max, step, value, format }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <AppIcon icon={icon} width="20" height="20" className="text-white/60 flex-shrink-0" />
      <p className="text-white text-base">{label}</p>
    </div>
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        readOnly
        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-white/60 text-sm mt-2">
        <span>{format(min)}</span>
        <span className="text-white font-medium">{format(value)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  </div>
)

export const SettingsModal: React.FC<{
  settings: SettingsState
  /** Pixels the panel has scrolled. */
  scroll?: number
  /** A finger on one of the speed buttons, or on Done. */
  touch?: { target: Speed | 'done'; t: number; press: number }
}> = ({ settings, scroll = 0, touch }) => {
  const seconds = (n: number) => `${Math.round(n * 10) / 10}s`
  const times = (n: number) => `${n}x`
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 z-50">
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 w-full max-w-md overflow-y-auto shadow-2xl ios-glass-override"
        style={{ maxHeight: vh(85) }}
      >
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <div className="flex items-center justify-end mb-4">
            <button className="w-10 h-10 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Settings</h3>
              <div className="space-y-4">
                <ToggleRow icon="solar:play-circle-bold" label="Auto-play" desc="Automatically play audio when words change" on={settings.autoPlay} />
                <ToggleRow icon="solar:volume-loud-bold" label="Play target language only" desc="Skip native language translation" on={settings.playTargetOnly} />
                <ToggleRow icon="solar:text-bold" label="Show phonetic pronunciation" desc="Display IPA pronunciation guide" on={settings.showPhonetics} />
                <ToggleRow icon="solar:history-bold" label="Show play count" desc="Briefly show how many times a word has been played" on={settings.showPlayCount} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <AppIcon icon="solar:rewind-back-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                    <p className="text-white text-base font-medium">Rewind</p>
                  </div>
                  <p className="text-white/50 text-sm mt-0.5">Replay a set of words on a loop</p>
                </div>
                <Toggle on={settings.rewindEnabled} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">Pace</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AppIcon icon="solar:soundwave-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                    <p className="text-white text-base">Pronunciation speed</p>
                  </div>
                  <div className="flex gap-2">
                    {(['Slow', 'Normal', 'Fast'] as const).map((speed) => {
                      const mine = touch?.target === speed
                      return (
                        <button
                          key={speed}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                            settings.pronunciationSpeed === speed
                              ? 'bg-white/20 border border-white/30 text-white'
                              : 'bg-black/20 border border-white/10 text-white/70'
                          }`}
                          style={{ position: 'relative', ...(mine ? glassPress(touch!.press) : {}) }}
                        >
                          {speed}
                          {mine && <Touch t={touch!.t} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Slider icon="solar:pause-circle-bold" label="Pause between translations" min={0.2} max={10} step={0.1} value={settings.pauseBetweenTranslations} format={seconds} />
                <Slider icon="solar:skip-next-bold" label="Pause before next word" min={0.2} max={10} step={0.1} value={settings.pauseForNextWord} format={seconds} />
                <Slider icon="solar:repeat-bold" label="Repeat target language" min={1} max={5} step={1} value={settings.repeatTargetLanguage} format={times} />
                <Slider icon="solar:repeat-one-bold" label="Repeat main language" min={1} max={5} step={1} value={settings.repeatMainLanguage} format={times} />
              </div>
            </div>
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 outline-none shadow-xs px-4 py-2 w-full mt-6 bg-black/20 backdrop-blur-sm border border-white/10 text-white rounded-xl h-11"
            style={touch?.target === 'done' ? glassPress(touch.press) : undefined}
          >
            Done
            {touch?.target === 'done' && <Touch t={touch.t} />}
          </button>
        </div>
      </div>
    </div>
  )
}
