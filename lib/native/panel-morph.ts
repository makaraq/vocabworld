// Opens a web pop-up out of its button, and closes it back, with the motion
// drawn natively on iPhone (ios/App/App/PanelMorphPlugin.swift) at the
// screen's full refresh rate; the web view stops at 60 fps. The pop-up itself
// stays the web one: the screen is frozen under a picture of itself, the
// pop-up is put at rest underneath, a second picture is taken, and the native
// layer grows the pop-up's glass out of the button between the two, then
// steps aside onto the identical live pop-up. Closing runs it the other way.
// Stands in for lib/morph-modal.ts's morphPanelOpen (same PanelMorph), which
// hands over to it for pop-ups that ask ({ native: true }).

import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PanelMorph } from '@/lib/morph-modal'

type Rect = { x: number; y: number; width: number; height: number }

interface PanelMorphPlugin {
  /** Covers the screen with a picture of it, as it is now. */
  freeze(): Promise<void>
  /** Out of `from` (the button) into `to` (the pop-up), over the frozen picture. */
  open(options: { from: Rect; fromRadius: number; to: Rect; toRadius: number }): Promise<void>
  /** Back from `from` (the pop-up) into `to` (the button). */
  close(options: { from: Rect; fromRadius: number; to: Rect; toRadius: number }): Promise<void>
  /** Away down the screen from `from`, carrying on at `velocity` (pt/ms). */
  slide(options: { from: Rect; fromRadius: number; velocity: number }): Promise<void>
  /** Takes away whatever it has on screen. */
  clear(): Promise<void>
}

const NativeMorph = registerPlugin<PanelMorphPlugin>('PanelMorph')

export function hasNativeMorph(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('PanelMorph')
}

const rectOf = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

// The top-left corner as drawn; a capsule's "huge" radius is half its height.
const radiusOf = (el: HTMLElement): number => {
  const r = el.getBoundingClientRect()
  const value = getComputedStyle(el).borderTopLeftRadius.split(' ')[0]
  const px = value.endsWith('%') ? (parseFloat(value) / 100) * r.width : parseFloat(value) || 0
  return Math.min(px, Math.min(r.width, r.height) / 2)
}

const twoFrames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

// Inline styles the morph sets while the native layer stands in for the
// pop-up, and takes off once it's done: at rest at once, no CSS transitions.
const HELD = ['visibility', 'transition', 'transform', 'opacity'] as const

export function nativeMorphOpen(source: HTMLElement, panel: HTMLElement, backdrop: HTMLElement | null): PanelMorph {
  const parts = [panel, backdrop].filter((el): el is HTMLElement => !!el)
  const button = rectOf(source)
  const buttonRadius = radiusOf(source)
  let phase: 'opening' | 'open' | 'closing' | 'gone' = 'opening'

  const release = () => {
    for (const el of parts) for (const prop of HELD) el.style.removeProperty(prop)
  }
  // Hidden until the screen is frozen under its picture (it may already be
  // laid out at full size: some pop-ups call this before their first paint).
  for (const el of parts) el.style.setProperty('visibility', 'hidden', 'important')

  const opened = (async () => {
    try {
      await NativeMorph.freeze()
      if (phase !== 'opening') return
      for (const el of parts) {
        el.style.setProperty('transition', 'none', 'important')
        el.style.setProperty('opacity', '1', 'important')
        el.style.removeProperty('visibility')
      }
      panel.style.setProperty('transform', 'none', 'important')
      await twoFrames()
      if (phase !== 'opening') return
      await NativeMorph.open({ from: button, fromRadius: buttonRadius, to: rectOf(panel), toRadius: radiusOf(panel) })
    } catch {
      // Without the native layer it just shows, at rest.
      await NativeMorph.clear().catch(() => {})
    } finally {
      if (phase === 'opening') {
        phase = 'open'
        release()
      }
    }
  })()

  // Freezes the screen with the pop-up on it, lets the caller take it away
  // underneath (`done`), then animates its picture away.
  const leave = (done: () => void, animate: (from: Rect, fromRadius: number) => Promise<void>) => {
    if (phase === 'closing' || phase === 'gone') return
    phase = 'closing'
    void (async () => {
      await opened
      const from = rectOf(panel)
      const fromRadius = radiusOf(panel)
      try {
        await NativeMorph.freeze()
        done()
        await twoFrames()
        await animate(from, fromRadius)
      } catch {
        done()
        await NativeMorph.clear().catch(() => {})
      } finally {
        phase = 'gone'
      }
    })()
  }

  return {
    close: (done) =>
      leave(done, (from, fromRadius) =>
        NativeMorph.close({
          from,
          fromRadius,
          to: source.isConnected && rectOf(source).width > 0 ? rectOf(source) : button,
          toRadius: buttonRadius,
        })),
    slide: (done, velocity = 0) =>
      leave(done, (from, fromRadius) => NativeMorph.slide({ from, fromRadius, velocity })),
    dispose: () => {
      // A close in progress finishes on its own.
      if (phase === 'closing' || phase === 'gone') return
      phase = 'gone'
      release()
      void NativeMorph.clear().catch(() => {})
    },
  }
}
