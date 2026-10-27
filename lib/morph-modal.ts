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
// A pop-up opening out of its button, or a topic's tile into its lesson: a
// critically damped spring as well, setting off at the same pace (the press
// carries on into it), but with the move spread more evenly. iOS web views
// render at 60 fps whatever the
// screen does, and the spring above, most of its way in its first quarter,
// jumps up to a tenth of it from one frame to the next, which reads as
// choppy on a 120 Hz phone; this one about a twentieth.
export const PANEL_SPRING = 'linear(0 0%, 0.0632 4%, 0.1457 8%, 0.2363 12%, 0.3278 16%, 0.4156 20%, 0.4973 24%, 0.5714 28%, 0.6374 32%, 0.6954 36%, 0.7458 40%, 0.7893 44%, 0.8264 48%, 0.858 52%, 0.8846 56%, 0.907 60%, 0.9258 64%, 0.9414 68%, 0.9545 72%, 0.9652 76%, 0.9742 80%, 0.9815 84%, 0.9876 88%, 0.9926 92%, 0.9967 96%, 1 100%)'
export const panelSpring = () =>
  CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? PANEL_SPRING : 'cubic-bezier(0.25, 0.7, 0.25, 1)'

const OPEN_MS = 680
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
  // Slides the panel away down the screen, carrying on from a drag at
  // `velocity` (px/ms, downwards), while the source forms again where it
  // is; `done` runs once it's gone.
  slide: (done: () => void, velocity?: number) => void
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

// The layer just above an element's modal and every one it's in, and above
// 70 at least (the badges sheet sits at 60): one opened from inside another
// (a picker out of the example sentences, at 9999) rides above both.
const layerAbove = (...els: HTMLElement[]) => {
  let top = 69
  for (const el of els) {
    for (let up: HTMLElement | null = el; up; up = up.parentElement) {
      const z = parseInt(getComputedStyle(up).zIndex, 10)
      if (!Number.isNaN(z)) top = Math.max(top, z)
    }
  }
  return top + 1
}

// A glass surface's look, which the panel carries from the source's to its
// own as it grows, so it's one container changing, not a second one laid
// over the first: fill, edge, shadow and frost blend; a sheen
// (background-image) can't, so it rides on a layer of its own that fades
// (sheenLayer).
type Look = { backgroundColor: string; borderColor: string; borderWidth: string; boxShadow: string; frost: string; backgroundImage: string }
const lookOf = (el: HTMLElement): Look => {
  const style = getComputedStyle(el)
  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderTopColor,
    borderWidth: `${style.borderTopWidth} ${style.borderRightWidth} ${style.borderBottomWidth} ${style.borderLeftWidth}`,
    boxShadow: style.boxShadow,
    frost: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || 'none',
    backgroundImage: style.backgroundImage,
  }
}
// Glass inside other glass (a button on the menu's panel) frosts only what
// that glass paints itself (a backdrop root), not what's behind it: its own
// fill and sheen once more, and whatever's painted between them, a light
// haze over what already shows through. The panel, over everything, would
// frost all of it instead, a different tone the moment it took over. So it
// starts out frosting nothing, with that haze on a layer (hazeOf).
const cutsBackdrop = (style: CSSStyleDeclaration) => {
  const frost = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter')
  return (!!frost && frost !== 'none') || style.filter !== 'none' || parseFloat(style.opacity) < 1
}
// A list of backgrounds, split at its top-level commas.
const layersIn = (value: string) => {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    else if (value[i] === ')') depth--
    else if (value[i] === ',' && depth === 0) {
      out.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(value.slice(start).trim())
  return out
}
// The haze: every fill and sheen between the button and the glass it's in,
// that glass's included, each painted where it is on screen (attachment
// fixed), wherever the panel is meanwhile. Null when it isn't in glass.
type Haze = { image: string; position: string; size: string }
const hazeOf = (el: HTMLElement): Haze | null => {
  const images: string[] = []
  const positions: string[] = []
  const sizes: string[] = []
  for (let up = el.parentElement; up; up = up.parentElement) {
    const style = getComputedStyle(up)
    const box = up.getBoundingClientRect()
    const fill = /rgba\(.*,\s*0\)$|transparent/.test(style.backgroundColor) ? [] : [`linear-gradient(${style.backgroundColor}, ${style.backgroundColor})`]
    for (const image of [...(style.backgroundImage === 'none' ? [] : layersIn(style.backgroundImage)), ...fill]) {
      images.push(image)
      positions.push(`${box.left}px ${box.top}px`)
      sizes.push(`${box.width}px ${box.height}px`)
    }
    if (cutsBackdrop(style)) return images.length ? { image: images.join(', '), position: positions.join(', '), size: sizes.join(', ') } : null
  }
  return null
}
const hazeLayer = (panel: HTMLElement, haze: Haze) => {
  const layer = sheenLayer(panel, haze.image)
  Object.assign(layer.style, { backgroundPosition: haze.position, backgroundSize: haze.size, backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' })
  return layer
}
// A button's, with the skin's lit body (liquid-glass.css, its ::after) as
// part of its sheen: the panel carries that too, so the copy left over the
// button holds only what's on it. In glass, it frosts nothing (hazeOf).
const buttonLookOf = (el: HTMLElement, inGlass: boolean): Look => {
  const look = lookOf(el)
  const after = getComputedStyle(el, '::after')
  const body = after.content !== 'none' && after.position === 'absolute' ? after.backgroundImage : 'none'
  const layers = [body, look.backgroundImage].filter((image) => image !== 'none')
  return { ...look, frost: inGlass ? 'none' : look.frost, backgroundImage: layers.length ? layers.join(', ') : 'none' }
}
// Two shadow lists of the same length and the same kind at each place, so
// they blend instead of swapping halfway: each side's own shadows, then the
// other side's, see-through.
const shadowsIn = (value: string) => (!value || value === 'none' ? [] : value.split(/,(?![^(]*\))/).map((s) => s.trim()))
const seeThrough = (shadow: string) => shadow.replace(/(?:rgba?|oklab|oklch|lab|lch|hsla?|color)\([^)]*\)|#[0-9a-f]{3,8}\b|transparent/i, 'rgba(0, 0, 0, 0)')
const matchShadows = (a: string, b: string): [string, string] => {
  const ours = shadowsIn(a)
  const theirs = shadowsIn(b)
  if (!ours.length && !theirs.length) return ['none', 'none']
  return [[...ours, ...theirs.map(seeThrough)].join(', '), [...ours.map(seeThrough), ...theirs].join(', ')]
}
const lookFrame = (look: Look, shadow: string): Keyframe =>
  ({
    backgroundColor: look.backgroundColor,
    borderColor: look.borderColor,
    borderWidth: look.borderWidth,
    borderStyle: 'solid',
    boxShadow: shadow,
    backdropFilter: look.frost,
    webkitBackdropFilter: look.frost,
  }) as Keyframe
// A sheen on a layer of its own at the back of the panel, to fade.
const sheenLayer = (panel: HTMLElement, image: string) => {
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, { position: 'absolute', inset: '0', borderRadius: 'inherit', pointerEvents: 'none', backgroundImage: image })
  panel.prepend(layer)
  return layer
}

// The contents' fade, in and out, with no glass under a fading parent: in
// Chrome a parent whose opacity animates cuts what's inside it off from
// what's behind (a backdrop root), so glass in there frosts nothing until
// the fade lets go, and changes tone as it does. So glass fades itself,
// with what it holds; anything with no glass in it fades whole; and a
// parent of glass fades only its own look (fill, edge, shadow, its own
// text), leaving its children to fade on their own. A part's `look` is
// that look cleared; none means it fades whole.
export type FadePart = { el: Element; look: Keyframe | null }
const isGlass = (el: Element) => {
  const style = getComputedStyle(el)
  const frost = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter')
  return !!frost && frost !== 'none'
}
export function fadeParts(roots: Element[]): FadePart[] {
  const parts: FadePart[] = []
  for (const root of roots) {
    const glass = [...root.querySelectorAll('*')].filter(isGlass)
    const visit = (el: Element) => {
      if (isGlass(el) || !glass.some((g) => g !== el && el.contains(g))) {
        parts.push({ el, look: null })
        return
      }
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
      parts.push({
        el,
        look: {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderColor: 'rgba(0, 0, 0, 0)',
          boxShadow: shadowsIn(getComputedStyle(el).boxShadow).map(seeThrough).join(', ') || 'none',
          ...(ownText ? { color: 'rgba(0, 0, 0, 0)' } : {}),
        },
      })
      for (const child of el.children) visit(child)
    }
    visit(root)
  }
  return parts
}
// In, rising a little, to however each part is at rest, which takes over
// once it's done (fill backwards), so nothing stays under an animation.
export const fadeIn = (parts: FadePart[], timing: KeyframeAnimationOptions) =>
  parts.map(({ el, look }) => el.animate([{ ...(look ?? { opacity: 0, transform: 'translateY(8px)' }), offset: 0 }], { ...timing, fill: 'backwards' }))
// Out, from wherever each part is now (still coming in, maybe): read now,
// before what moves them is cancelled, and started with the timing.
export function fadeOutFromNow(parts: FadePart[]) {
  const now = parts.map(({ el, look }): Keyframe => {
    const style = getComputedStyle(el)
    if (!look) return { opacity: style.opacity }
    return { backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, boxShadow: style.boxShadow, ...('color' in look ? { color: style.color } : {}) }
  })
  return (timing: KeyframeAnimationOptions) =>
    parts.map(({ el, look }, i) => el.animate([now[i], look ?? { opacity: 0 }], { ...timing, fill: 'forwards' }))
}

// The button's rim (the skin's, its ::before: a masked ring) on a layer of
// the panel's, to fade like its sheen; the ring's mask is data-morph-rim's
// (globals.css).
const rimOf = (el: HTMLElement) => {
  const rim = getComputedStyle(el, '::before')
  const masked = [rim.getPropertyValue('mask-image'), rim.getPropertyValue('-webkit-mask-image')].some((mask) => mask && mask !== 'none')
  return rim.content !== 'none' && rim.position === 'absolute' && masked ? { image: rim.backgroundImage, width: rim.paddingTop } : null
}
const rimLayer = (panel: HTMLElement, rim: { image: string; width: string }) => {
  const layer = sheenLayer(panel, rim.image)
  layer.setAttribute('data-morph-rim', '')
  layer.style.padding = rim.width
  return layer
}

// The look half of a morph, for morphPanelOpen and for one that moves its
// panel its own way (the settings panel's): the panel's fill, edge,
// shadow, frost, sheen and rim carried from the button's to its own while
// it grows, and back while it draws in. Make it at rest, before
// data-morphing lets go of the skin's important look (liquid-glass.css),
// since it ends on exactly that. Whoever pins the panel takes its own
// sheen off meanwhile (background-image: none), and the layers standing in
// for it go with `drop`.
export function lookMorph(source: HTMLElement, panel: HTMLElement) {
  const haze = hazeOf(source)
  const sourceLook = buttonLookOf(source, !!haze)
  const restLook = lookOf(panel)
  const rim = rimOf(source)
  type Layers = { rim: HTMLElement | null; ours: HTMLElement | null; haze: HTMLElement | null; theirs: HTMLElement | null }
  let layers: Layers = { rim: null, ours: null, haze: null, theirs: null }
  // Theirs at the back, then the haze, the button's light and its rim.
  const lay = () => {
    if (!layers.rim && rim) layers.rim = rimLayer(panel, rim)
    if (!layers.ours && sourceLook.backgroundImage !== 'none') layers.ours = sheenLayer(panel, sourceLook.backgroundImage)
    if (!layers.haze && haze) layers.haze = hazeLayer(panel, haze)
    if (!layers.theirs && restLook.backgroundImage !== 'none') layers.theirs = sheenLayer(panel, restLook.backgroundImage)
  }
  const opacityOf = (layer: HTMLElement | null, otherwise: string) => (layer ? getComputedStyle(layer).opacity : otherwise)
  return {
    // From the button's look to the panel's, done a little before halfway.
    open: (duration: number): Animation[] => {
      lay()
      const [asSource, asPanel] = matchShadows(sourceLook.boxShadow, restLook.boxShadow)
      const timing = { duration, fill: 'both' as const }
      const going = (layer: HTMLElement | null) => (layer ? [layer.animate([{ opacity: 1, easing: 'ease-out' }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], timing)] : [])
      return [
        panel.animate([{ ...lookFrame(sourceLook, asSource), easing: 'ease-out' }, { ...lookFrame(restLook, asPanel), offset: 0.4 }, lookFrame(restLook, asPanel)], timing),
        ...going(layers.rim),
        ...going(layers.ours),
        ...going(layers.haze),
        ...(layers.theirs ? [layers.theirs.animate([{ opacity: 0, easing: 'ease-out' }, { opacity: 1, offset: 0.4 }, { opacity: 1 }], timing)] : []),
      ]
    },
    // Back into the button's look from wherever it is now (on its way out,
    // or at rest with its own sheen), done a little after halfway, as it
    // lands. Read now, before what moves it is cancelled; started with the
    // duration.
    backFromNow: () => {
      const now = lookOf(panel)
      const was = { rim: opacityOf(layers.rim, '0'), ours: opacityOf(layers.ours, '0'), haze: opacityOf(layers.haze, '0'), theirs: opacityOf(layers.theirs, '1') }
      return (duration: number): Animation[] => {
        lay()
        const [asNow, asSource] = matchShadows(now.boxShadow, sourceLook.boxShadow)
        const timing = { duration, fill: 'forwards' as const }
        const coming = (layer: HTMLElement | null, from: string) =>
          layer ? [layer.animate([{ opacity: from, easing: 'ease-in-out' }, { opacity: 1, offset: 0.6 }, { opacity: 1 }], timing)] : []
        return [
          panel.animate([{ ...lookFrame(now, asNow), easing: 'ease-in-out' }, { ...lookFrame(sourceLook, asSource), offset: 0.6 }, lookFrame(sourceLook, asSource)], timing),
          ...coming(layers.rim, was.rim),
          ...coming(layers.ours, was.ours),
          ...coming(layers.haze, was.haze),
          ...(layers.theirs ? [layers.theirs.animate([{ opacity: was.theirs, easing: 'ease-in-out' }, { opacity: 0, offset: 0.6 }, { opacity: 0 }], timing)] : []),
        ]
      }
    },
    drop: () => {
      layers.rim?.remove()
      layers.ours?.remove()
      layers.haze?.remove()
      layers.theirs?.remove()
      layers = { rim: null, ours: null, haze: null, theirs: null }
    },
  }
}

// Whatever the panel's own entrance would do (slide, fade, swell), it
// doesn't while it morphs.
const HELD = ['translate', 'scale', 'transform', 'opacity', 'transition'] as const
const hold = (el: HTMLElement) => Object.assign(el.style, { translate: 'none', scale: 'none', transform: 'none', opacity: '1', transition: 'none' })
const PINNED = ['position', 'margin', 'overflow', 'padding', 'background-image'] as const
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
  // Where the source's copy and its flying icon ride.
  const above = layerAbove(source, panel)
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
  // At rest, before data-morphing lets go of its look (lookMorph).
  const look = lookMorph(source, panel)
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
      zIndex: String(above + 1),
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
    // Its sheen goes on a layer meanwhile (lookMorph).
    Object.assign(panel.style, { position: 'fixed', margin: '0', overflow: 'hidden', padding: '0', backgroundImage: 'none' })
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

  // The source's contents above every modal (layerAbove): a copy of it with
  // none of its glass, since the panel is its glass now,
  // only what's on it (data-morph-ghost takes off the skin's rim and light,
  // globals.css); without its icon when that flies on its own. Whole, glass
  // and all, for a sheet sliding away: the button forms again on its own.
  const makeGhost = (box: Box, whole = false) => {
    const copy = copyOf(source, box, above)
    if (whole) return copy
    copy.setAttribute('data-morph-ghost', '')
    for (const [prop, value] of [
      ['background-color', 'transparent'],
      ['background-image', 'none'],
      ['border-color', 'transparent'],
      ['box-shadow', 'none'],
      ['backdrop-filter', 'none'],
      ['-webkit-backdrop-filter', 'none'],
    ]) copy.style.setProperty(prop, value, 'important')
    if (flight) copy.querySelector<SVGElement>('svg')?.style.setProperty('visibility', 'hidden')
    return copy
  }

  pin()
  ghost = makeGhost(from)
  hideNow(source)
  flyer = makeFlyer()
  if (flyer) handoff?.to.setAttribute('data-handoff', '')
  // Its contents as they are before the look's layers go in.
  const coming = fadeParts(contents)
  animations = [
    ...(flyer && flight
      ? [flyer.animate([{ transform: 'none', color: flight.colour.from }, { transform: flight.landed, color: flight.colour.to }], { duration: OPEN_MS, easing: panelSpring(), fill: 'forwards' })]
      : []),
    panel.animate([frame(from, fromCorners), bubble(from, rest), frame(rest, restCorners)], { duration: OPEN_MS, easing: panelSpring(), fill: 'both' }),
    ...look.open(OPEN_MS),
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'both' }),
    // Once it's most of the way out (85%).
    ...fadeIn(coming, { duration: 300, delay: 330, easing: SETTLE }),
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
    look.drop()
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
    look.drop()
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
    const fadeContentsOut = fadeOutFromNow(fadeParts(contents))
    const ghostOpacity = ghost ? getComputedStyle(ghost).opacity : '0'
    const backdropOpacity = backdrop ? getComputedStyle(backdrop).opacity : '1'
    // The flying icon from where it is: still on its way, or on the close
    // button (a new one, standing in for that icon).
    const flown = flyer ? { transform: getComputedStyle(flyer).transform, color: getComputedStyle(flyer).color } : null
    // Its look, back into the source's while it draws in (lookMorph).
    const lookBack = look.backFromNow()
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
      ...lookBack(CLOSE_MS),
      ...(flyer && flight
        ? [flyer.animate([flown ?? { transform: flight.landed, color: flight.colour.to }, { transform: 'none', color: flight.colour.from }], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' })]
        : []),
      panel.animate([frame(now, nowCorners), bubble(now, to), frame(to, cornersOf(source, to))], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' }),
      ...fadeContentsOut({ duration: 140, easing: 'ease-out' }),
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
      look.drop()
      done()
    }, CLOSE_MS)
  }

  // A sheet dragged down goes on down: from where the drag left it (its own
  // transform) until it's below the screen, at the drag's pace or a little
  // quicker, easing out, the backdrop clearing as it goes. The source forms
  // again in place meanwhile, rather than popping back once it's gone.
  const slide = (done: () => void, velocity = 0) => {
    if (disposed || timer) return
    // Still opening out of the source: back into it instead.
    if (pinned) return close(done)
    const now = panel.getBoundingClientRect()
    const dragged = new DOMMatrixReadOnly(getComputedStyle(panel).transform).m42
    const travel = Math.max(0, window.innerHeight - now.top) + 24
    const duration = Math.max(220, Math.min(420, travel / Math.max(velocity, 1.6)))
    const backdropOpacity = backdrop ? getComputedStyle(backdrop).opacity : '1'
    animations.forEach((a) => a.cancel())
    panel.style.transition = 'none'
    if (!ghost && source.isConnected) {
      ghost = makeGhost(source.getBoundingClientRect(), true)
      ghost.style.opacity = '0'
    }
    animations = [
      panel.animate([{ transform: `translateY(${dragged}px)` }, { transform: `translateY(${dragged + travel}px)` }], {
        duration,
        easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        fill: 'forwards',
      }),
      ...(ghost ? [ghost.animate([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }], { duration, easing: 'ease-out', fill: 'forwards' })] : []),
      ...(backdrop ? [backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' })] : []),
    ]
    timer = setTimeout(() => {
      timer = null
      // The source shows in the same frame its copy and the panel go.
      panel.style.visibility = 'hidden'
      if (backdrop) backdrop.style.visibility = 'hidden'
      showNow(source)
      ghost?.remove()
      ghost = null
      done()
    }, duration)
  }

  return { close, slide, dispose }
}
