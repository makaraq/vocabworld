type SoundName = "correct" | "wrong"

const SOUND_SRC: Record<SoundName, string> = {
  correct: "/sounds/correct.wav",
  wrong: "/sounds/wrong.wav",
}

const VOLUME = 0.7

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {}

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!cache[name]) {
    try {
      const el = new Audio(SOUND_SRC[name])
      el.preload = "auto"
      el.volume = VOLUME
      cache[name] = el
    } catch {
      return null
    }
  }
  return cache[name] ?? null
}

/** Warm the elements so the first answer doesn't wait on a fetch/decode. */
export function preloadSoundEffects() {
  for (const name of Object.keys(SOUND_SRC) as SoundName[]) {
    try { getAudio(name)?.load() } catch {}
  }
}

export function playSoundEffect(name: SoundName) {
  const el = getAudio(name)
  if (!el) return
  try {
    el.currentTime = 0
    el.play()?.catch(() => {})
  } catch {}
}

export const playCorrectSound = () => playSoundEffect("correct")
export const playWrongSound = () => playSoundEffect("wrong")
