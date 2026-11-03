// A short quiet spell for the main thread while a big animation plays (a
// topic opening into its lesson, or back). On iPhone every fetch's reply comes
// back through the native bridge (CapacitorHttp) and is unpacked on the same
// thread that draws those animations, so a download landing mid-way makes
// them stutter. Work that can wait a moment asks whenQuiet() first.

let quietUntil = 0

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// Hold background work back for the next `ms` (extends a spell already on).
export function keepQuiet(ms: number): void {
  quietUntil = Math.max(quietUntil, now() + ms)
}

// Resolves once no animation is asking for quiet (a tick later, usually).
// It looks a tick later, not at once: a pop-up's own effects can run just
// before the one that starts its morph and asks for quiet.
export function whenQuiet(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const left = quietUntil - now()
      if (left <= 0) resolve()
      else setTimeout(check, left)
    }
    setTimeout(check, 0)
  })
}
