// Opens a web pop-up out of its button, and closes it back, with the motion
// drawn natively on iPhone (ios/App/App/PanelMorphPlugin.swift) at the
// screen's full refresh rate; the web view stops at 60 fps. The pop-up itself
// stays the web one: the screen is frozen under a picture of itself and the
// native layer grows the account sheet's own glass out of the button at once
// (as the native account sheet opens); the pop-up, put at rest underneath and
// pictured, comes in over it once it's most of the way out. Then it steps
// aside onto the identical live pop-up. Closing runs it the other way. Stands
// in for morphPanelOpen (same PanelMorph), which hands over to it for pop-ups
// that ask ({ native: true }).

import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PanelMorph } from '@/lib/morph-modal'

type Rect = { x: number; y: number; width: number; height: number }

/** A backdrop's CSS: its backdrop-filter's blur (px), and its background colour (0–1). */
type Backdrop = { blur: number; red: number; green: number; blue: number; alpha: number }

interface PanelMorphPlugin {
  /** Covers the screen with a picture of it, as it is now. Opening, it also
   *  works out from it the page under the pop-up's `backdrop`. */
  freeze(options?: { backdrop?: Backdrop }): Promise<void>
  /** Out of `from` (the button) into `to` (the pop-up), over the frozen
   *  picture: the account sheet's glass sets out at once (resolves). */
  open(options: { from: Rect; fromRadius: number; to: Rect; toRadius: number }): Promise<void>
  /** The pop-up pictured, now it shows underneath: it comes in over the
   *  glass. Resolves once it has all settled. */
  contents(): Promise<void>
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


// The backdrop's blur and colour, for the native layer to draw it under the
// pop-up too, where the pictures can't show it. The colour is read off a
// pixel: Tailwind's come as color-mix() and oklab.
const backdropOf = (el: HTMLElement | null): Backdrop | undefined => {
  if (!el) return undefined
  const style = getComputedStyle(el)
  const filter = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter')
  const blur = parseFloat(/blur\(([\d.]+)px\)/.exec(filter)?.[1] ?? '') || 0
  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!pixel) return { blur, red: 0, green: 0, blue: 0, alpha: 0 }
  pixel.fillStyle = style.backgroundColor
  pixel.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = pixel.getImageData(0, 0, 1, 1).data
  return { blur, red: red / 255, green: green / 255, blue: blue / 255, alpha: alpha / 255 }
}

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
      await NativeMorph.freeze({ backdrop: backdropOf(backdrop) })
      if (phase !== 'opening') return
      // At rest, still hidden: where it will be is known at once, and the
      // native glass sets out there straight away, as the account sheet's does.
      for (const el of parts) {
        el.style.setProperty('transition', 'none', 'important')
        el.style.setProperty('opacity', '1', 'important')
      }
      panel.style.setProperty('transform', 'none', 'important')
      await NativeMorph.open({ from: button, fromRadius: buttonRadius, to: rectOf(panel), toRadius: radiusOf(panel) })
      // Then the pop-up itself, under the cover, pictured to come in over the glass.
      for (const el of parts) el.style.removeProperty('visibility')
      await twoFrames()
      await NativeMorph.contents()
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
