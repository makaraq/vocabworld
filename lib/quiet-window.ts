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

// Resolves once no animation is asking for quiet (at once, usually).
export function whenQuiet(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const left = quietUntil - now()
      if (left <= 0) resolve()
      else setTimeout(check, left)
    }
    check()
  })
}
