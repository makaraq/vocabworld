// Opens a modal's panel out of the element that opened it and closes it back
// into it: a container transform, as a topic tile opens into its lesson and
// the gear into settings (language-selector.tsx), for any tile or button.
//
// The panel's own box moves (left, top, width, height), never a scale, so
// its glass keeps its blur, rim, shadow and corners true at every size. On
// the way its corners round up into a bubble halfway and settle to the
// panel's own as it arrives. Its contents keep the width they have at rest,
// so nothing reflows, and hang from the point nearest the source, so they
// barely move while the glass opens over them; they come in as it settles
// and clear first when it closes. A copy of the source, above everything,
// melts into the glass as it grows out of it and forms again as the glass
// lands on it; the source itself hides while its panel is up. The modal's
// backdrop fades in and out alongside.
//
// A timer, not animation events, finishes a close: a frame-starved webview
// can stall an animation, and a panel must never stay stuck on screen.

// Topic open/back morph: a critically damped spring (no bounce), sampled
// for CSS linear(). ~70% of the move in the first quarter, then a long soft
// settle.
export const MORPH_SPRING = 'linear(0 0%, 0.0661 4%, 0.2033 8%, 0.3555 13%, 0.4966 17%, 0.6164 21%, 0.7131 25%, 0.7884 29%, 0.8458 33%, 0.8887 38%, 0.9204 42%, 0.9434 46%, 0.9601 50%, 0.972 54%, 0.9805 58%, 0.9865 63%, 0.9907 67%, 0.9937 71%, 0.9958 75%, 0.9972 79%, 0.9983 83%, 0.999 88%, 0.9994 92%, 0.9998 96%, 1 100%)'
// The spring where linear() is supported, else the closest cubic.
export const morphSpring = () =>
  CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? MORPH_SPRING : 'cubic-bezier(0.32, 0.72, 0, 1)'
// The back morph's calm ease-out: no long tail to settle as a tremor.
export const MORPH_CALM = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

const OPEN_MS = 620
const CLOSE_MS = 460
const SETTLE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

export type Box = { left: number; top: number; width: number; height: number }
// Top-left, top-right, bottom-right, bottom-left; horizontal and vertical.
export type Corners = { h: number[]; v: number[] }

export type MorphOptions = {
  // The panel's close button. The source's icon flies to it, turning `turn`
  // degrees on the way (a plus turned 45° is a ✕), and stands in for its
  // icon until it lands; closing, it flies back. The source's copy then
  // melts and forms without its icon, and the close button's own glass
  // comes in with the rest of the contents, after.
  handoff?: { to: HTMLElement; turn: number }
}

export type PanelMorph = {
  // Takes the panel back into its source; `done` runs once it is there, to
  // unmount the modal.
  close: (done: () => void) => void
  // Stops everything and puts the panel and the source back as they were.
  // Safe to call any number of times.
  dispose: () => void
}

// Whether a panel can open out of this element: on screen, with animations
// to do it. The theme tool swaps screens in place under a scaled app.
export function canMorphFrom(source: HTMLElement | null | undefined): source is HTMLElement {
  if (!source || typeof Element.prototype.animate !== 'function') return false
  if (document.documentElement.classList.contains('theme-tool-open')) return false
  const r = source.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth
}

// The corners as drawn: a capsule's "huge" radius comes back as half its
// shorter side.
export const cornersOf = (el: HTMLElement, box: Box): Corners => {
  const style = getComputedStyle(el)
  const most = Math.min(box.width, box.height) / 2
  const px = (value: string, size: number) =>
    Math.min(most, value.endsWith('%') ? (parseFloat(value) / 100) * size : parseFloat(value) || 0)
  const corners: Corners = { h: [], v: [] }
  for (const value of [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]) {
    const [h, v = h] = value.split(' ')
    corners.h.push(px(h, box.width))
    corners.v.push(px(v, box.height))
  }
  return corners
}
export const frame = (box: Box, corners: Corners): Keyframe => ({
  left: `${box.left}px`,
  top: `${box.top}px`,
  width: `${box.width}px`,
  height: `${box.height}px`,
  borderRadius: `${corners.h.map((r) => `${r}px`).join(' ')} / ${corners.v.map((r) => `${r}px`).join(' ')}`,
})
// Halfway (in eased progress) between two boxes, as a bubble: every corner
// half the shorter side.
export const bubble = (a: Box, b: Box): Keyframe => {
  const half = (x: number, y: number) => x + (y - x) / 2
  const box = { left: half(a.left, b.left), top: half(a.top, b.top), width: half(a.width, b.width), height: half(a.height, b.height) }
  const r = Math.min(box.width, box.height) / 2
  return { ...frame(box, { h: [r, r, r, r], v: [r, r, r, r] }), offset: 0.5 }
}

// Hides an element and shows it again, both at once. Its own transitions
// are off meanwhile: with transition-all, visibility would stay visible for
// the whole transition while hiding (showing the source through the glass).
export const hideNow = (el: HTMLElement) => {
  el.style.transition = 'none'
  el.style.visibility = 'hidden'
}
export const showNow = (el: HTMLElement) => {
  el.style.removeProperty('visibility')
  void el.offsetWidth
  el.style.removeProperty('transition')
}

// A copy of an element above the page, looking just as it does this moment,
// pressed or not: a press swells a button and lights it up (Liquid Glass's
// :active), and the copy keeps that swell and glow, so the press carries on
// into the glass growing out of it instead of snapping back first. Its box
// is the element's own, unscaled, about the same centre as `box` (where it
// shows now). Overrides go in as important: the skin's are.
export function copyOf(source: HTMLElement, box: Box, zIndex: number): HTMLElement {
  const look = getComputedStyle(source)
  const copy = source.cloneNode(true) as HTMLElement
  for (const el of [copy, ...copy.querySelectorAll<HTMLElement>('[id],[data-tour]')]) {
    el.removeAttribute('id')
    el.removeAttribute('data-tour')
  }
  copy.setAttribute('aria-hidden', 'true')
  copy.inert = true
  const width = source.offsetWidth
  const height = source.offsetHeight
  const set = (prop: string, value: string) => copy.style.setProperty(prop, value, 'important')
  set('position', 'fixed')
  set('left', `${box.left + box.width / 2 - width / 2}px`)
  set('top', `${box.top + box.height / 2 - height / 2}px`)
  set('width', `${width}px`)
  set('height', `${height}px`)
  set('margin', '0')
  set('z-index', String(zIndex))
  set('pointer-events', 'none')
  set('transition', 'none')
  set('visibility', 'visible')
  set('translate', 'none')
  set('transform', 'none')
  for (const prop of ['scale', 'background-color', 'box-shadow', 'backdrop-filter', '-webkit-backdrop-filter', '--lg-touch']) {
    const value = look.getPropertyValue(prop)
    if (value) set(prop, value)
  }
  document.body.appendChild(copy)
  return copy
}

// Whatever the panel's own entrance would do (slide, fade, swell), it
// doesn't while it morphs.
const HELD = ['translate', 'scale', 'transform', 'opacity', 'transition'] as const
const hold = (el: HTMLElement) => Object.assign(el.style, { translate: 'none', scale: 'none', transform: 'none', opacity: '1', transition: 'none' })
const PINNED = ['position', 'margin', 'overflow', 'padding'] as const
const PINNED_CHILD = ['width', 'position', 'left', 'top'] as const

// Starts the panel on the source's box and opens it out to where it lays out
// at rest. Call once the panel is in the DOM and laid out, before it paints
// if it would otherwise show.
export function morphPanelOpen(
  source: HTMLElement,
  panel: HTMLElement,
  backdrop?: HTMLElement | null,
  options: MorphOptions = {},
): PanelMorph {
  let animations: Animation[] = []
  let ghost: HTMLElement | null = null
  let flyer: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let pinned = false
  let disposed = false

  const from = source.getBoundingClientRect()
  const fromCorners = cornersOf(source, from)
  // What comes in and goes out. Layers positioned over the whole panel (a
  // frosted backdrop inside a full-screen view) are part of the glass: they
  // size with it and are there from the start.
  const listContents = () =>
    [...panel.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !['absolute', 'fixed'].includes(getComputedStyle(el).position),
    )
  let contents = listContents()
  hold(panel)
  const rest = panel.getBoundingClientRect()
  const restCorners = cornersOf(panel, rest)
  // Where across the panel the contents hang from: the source's centre.
  const anchor = Math.min(1, Math.max(0, (from.left + from.width / 2 - rest.left) / rest.width))

  // The icon's flight (options.handoff): from the source's icon to the close
  // button's, measured at rest, moving its centre, sizing and turning. The
  // close button's icon may not be drawn yet (an icon component renders a
  // beat after mounting): then it lands on the button's centre at its own
  // size, and the button's icon, whenever it shows up, waits under
  // data-handoff (globals.css) until it has landed.
  const handoff = options.handoff
  const ourIcon = handoff ? source.querySelector<SVGElement>('svg') : null
  const flight =
    ourIcon && handoff
      ? (() => {
          const a = ourIcon.getBoundingClientRect()
          const theirIcon = handoff.to.querySelector<SVGElement>('svg')
          const button = handoff.to.getBoundingClientRect()
          const b = theirIcon?.getBoundingClientRect() ?? {
            left: button.left + button.width / 2 - a.width / 2,
            top: button.top + button.height / 2 - a.height / 2,
            width: a.width,
            height: a.height,
          }
          const colour = getComputedStyle(ourIcon).color
          return {
            home: a,
            colour: { from: colour, to: theirIcon ? getComputedStyle(theirIcon).color : colour },
            landed: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${b.width / a.width}) rotate(${handoff.turn}deg)`,
          }
        })()
      : null
  const makeFlyer = () => {
    if (!flight || !ourIcon) return null
    const holder = document.createElement('div')
    holder.setAttribute('aria-hidden', 'true')
    Object.assign(holder.style, {
      position: 'fixed',
      left: `${flight.home.left}px`,
      top: `${flight.home.top}px`,
      width: `${flight.home.width}px`,
      height: `${flight.home.height}px`,
      zIndex: '71',
      pointerEvents: 'none',
      color: flight.colour.from,
    })
    const icon = ourIcon.cloneNode(true) as SVGElement
    Object.assign(icon.style, { display: 'block', width: '100%', height: '100%' })
    holder.appendChild(icon)
    document.body.appendChild(holder)
    return holder
  }
  const landIcon = () => {
    flyer?.remove()
    flyer = null
    handoff?.to.removeAttribute('data-handoff')
  }

  // Lifts the panel onto the coordinates its animation gives it, contents
  // held at their width at rest. Its padding comes off meanwhile, or a
  // padded panel couldn't start as small as a small button; the contents
  // are moved in by as much, so they're where they rest once it arrives.
  // data-morphing lets go of Liquid Glass's important geometry
  // (liquid-glass.css) so the animation's can apply.
  const pin = () => {
    if (pinned) return
    pinned = true
    const style = getComputedStyle(panel)
    const padLeft = parseFloat(style.paddingLeft) || 0
    const padRight = parseFloat(style.paddingRight) || 0
    const padTop = parseFloat(style.paddingTop) || 0
    for (const el of contents) {
      const width = el.offsetWidth
      // The percentage follows the panel's width frame by frame.
      Object.assign(el.style, {
        width: `${width}px`,
        position: 'relative',
        left: `calc(${padLeft}px + (100% - ${padLeft + padRight + width}px) * ${anchor})`,
        top: `${padTop}px`,
      })
    }
    panel.setAttribute('data-morphing', '')
    Object.assign(panel.style, { position: 'fixed', margin: '0', overflow: 'hidden', padding: '0' })
  }
  const unpin = () => {
    if (!pinned) return
    pinned = false
    for (const el of contents) for (const prop of PINNED_CHILD) el.style.removeProperty(prop)
    panel.removeAttribute('data-morphing')
    for (const prop of PINNED) panel.style.removeProperty(prop)
  }
  const release = () => {
    for (const prop of HELD) if (prop !== 'transition') panel.style.removeProperty(prop)
    // Its styles settle now, with its own transitions still off, or they'd
    // animate the hand-back (a sheet's margin easing in from 0). They come
    // back a moment later; a timer, not a frame, since frames stop in a
    // backgrounded webview.
    void panel.offsetWidth
    setTimeout(() => panel.style.removeProperty('transition'), 50)
  }

  // The copy of the source, on its box, above every modal (the badges
  // sheet sits at 60); without its icon when that flies on its own.
  const makeGhost = (box: Box) => {
    const copy = copyOf(source, box, 70)
    if (flight) copy.querySelector<SVGElement>('svg')?.style.setProperty('visibility', 'hidden')
    return copy
  }

  pin()
  ghost = makeGhost(from)
  hideNow(source)
  flyer = makeFlyer()
  if (flyer) handoff?.to.setAttribute('data-handoff', '')
  animations = [
    ...(flyer && flight
      ? [flyer.animate([{ transform: 'none', color: flight.colour.from }, { transform: flight.landed, color: flight.colour.to }], { duration: OPEN_MS, easing: morphSpring(), fill: 'forwards' })]
      : []),
    panel.animate([frame(from, fromCorners), bubble(from, rest), frame(rest, restCorners)], { duration: OPEN_MS, easing: morphSpring(), fill: 'both' }),
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'both' }),
    ...contents.map((child) =>
      child.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 250, easing: SETTLE, fill: 'both' }),
    ),
    ...(backdrop ? [backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'both' })] : []),
  ]
  // Arrived: the panel goes back to its own layout and styles. Timers still
  // run where frames don't (the app sent to the background mid-way), so one
  // makes sure it arrives even if the animations never finish.
  const opening = animations
  const arrive = () => {
    if (disposed || animations !== opening) return
    animations.forEach((a) => a.cancel())
    animations = []
    ghost?.remove()
    ghost = null
    landIcon()
    unpin()
    release()
  }
  Promise.all(opening.map((a) => a.finished)).then(arrive, () => {})
  setTimeout(arrive, OPEN_MS + 900)

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (timer) clearTimeout(timer)
    animations.forEach((a) => a.cancel())
    ghost?.remove()
    landIcon()
    if (panel.isConnected) {
      unpin()
      release()
    }
    showNow(source)
  }

  const close = (done: () => void) => {
    if (disposed || timer) return
    // From wherever it is now (mid-opening, or dragged), so it turns around.
    const now = panel.getBoundingClientRect()
    const nowCorners = cornersOf(panel, now)
    // What it holds now, which may not be what it opened with.
    if (!pinned) contents = listContents()
    const shown = contents.map((child) => getComputedStyle(child).opacity)
    const ghostOpacity = ghost ? getComputedStyle(ghost).opacity : '0'
    const backdropOpacity = backdrop ? getComputedStyle(backdrop).opacity : '1'
    // The flying icon from where it is: still on its way, or on the close
    // button (a new one, standing in for that icon).
    const flown = flyer ? { transform: getComputedStyle(flyer).transform, color: getComputedStyle(flyer).color } : null
    animations.forEach((a) => a.cancel())
    hold(panel)
    pin()
    const to = source.getBoundingClientRect()
    if (!ghost) {
      ghost = makeGhost(to)
      ghost.style.opacity = '0'
    }
    if (!flyer) flyer = makeFlyer()
    if (flyer) handoff?.to.setAttribute('data-handoff', '')
    animations = [
      ...(flyer && flight
        ? [flyer.animate([flown ?? { transform: flight.landed, color: flight.colour.to }, { transform: 'none', color: flight.colour.from }], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' })]
        : []),
      panel.animate([frame(now, nowCorners), bubble(now, to), frame(to, cornersOf(source, to))], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' }),
      ...contents.map((child, i) =>
        child.animate([{ opacity: shown[i] }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' }),
      ),
      ghost.animate([{ opacity: ghostOpacity, easing: 'ease-in' }, { opacity: 0, offset: 0.55, easing: 'ease-out' }, { opacity: 1 }], { duration: CLOSE_MS, fill: 'forwards' }),
      ...(backdrop ? [backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], { duration: 340, easing: 'ease-in', fill: 'forwards' })] : []),
    ]
    timer = setTimeout(() => {
      timer = null
      // The source shows in the same frame its copy and the panel go.
      panel.style.visibility = 'hidden'
      if (backdrop) backdrop.style.visibility = 'hidden'
      showNow(source)
      ghost?.remove()
      ghost = null
      flyer?.remove()
      flyer = null
      done()
    }, CLOSE_MS)
  }

  return { close, dispose }
}
