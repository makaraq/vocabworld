// Opens a modal's panel out of the element that opened it and closes it back
// into it: a container transform, as a topic tile opens into its lesson and
// the gear into settings (language-selector.tsx), for any tile or button.
//
// The panel's own box moves (left, top, width, height), never a scale, so
// its glass keeps its blur, rim, shadow and corners true at every size. On
// the way its corners round up into a bubble halfway and settle to the
// panel's own as it arrives. Its contents keep the size they have at rest,
// so nothing reflows, and stay where they rest on screen, so they don't
// move at all while the glass opens over them; they come in as it settles
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
const halfway = (a: Box, b: Box): Box => {
  const half = (x: number, y: number) => x + (y - x) / 2
  return { left: half(a.left, b.left), top: half(a.top, b.top), width: half(a.width, b.width), height: half(a.height, b.height) }
}
// Halfway (in eased progress) between two boxes, as a bubble: every corner
// half the shorter side.
export const bubble = (a: Box, b: Box): Keyframe => {
  const box = halfway(a, b)
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
// A colour with nothing to show.
const isClear = (colour: string) => /^rgba\(.*,\s*0\)$|\/\s*0\)$|^transparent$/.test(colour)
// The haze: every fill and sheen between the button and the glass it's in,
// that glass's included, each painted where it is on screen, wherever the
// panel is meanwhile. Null when it isn't in glass.
type Haze = { image: string; box: Box }[]
const hazeOf = (el: HTMLElement): Haze | null => {
  const haze: Haze = []
  for (let up = el.parentElement; up; up = up.parentElement) {
    const style = getComputedStyle(up)
    const { left, top, width, height } = up.getBoundingClientRect()
    const fill = isClear(style.backgroundColor) ? [] : [`linear-gradient(${style.backgroundColor}, ${style.backgroundColor})`]
    for (const image of [...(style.backgroundImage === 'none' ? [] : layersIn(style.backgroundImage)), ...fill]) haze.push({ image, box: { left, top, width, height } })
    if (cutsBackdrop(style)) return haze.length ? haze : null
  }
  return null
}
// Its backgrounds where they are on screen, seen from `origin`: the box the
// layer has on screen, or the screen itself (attachment fixed).
const placeHaze = (layer: HTMLElement, haze: Haze, origin: { left: number; top: number }) =>
  Object.assign(layer.style, {
    backgroundPosition: haze.map(({ box }) => `${box.left - origin.left}px ${box.top - origin.top}px`).join(', '),
    backgroundSize: haze.map(({ box }) => `${box.width}px ${box.height}px`).join(', '),
    backgroundRepeat: 'no-repeat',
  })
const hazeLayer = (panel: HTMLElement, haze: Haze) => {
  const layer = sheenLayer(panel, haze.map(({ image }) => image).join(', '))
  placeHaze(layer, haze, { left: 0, top: 0 })
  layer.style.backgroundAttachment = 'fixed'
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
// that look cleared; none means it fades whole. A parent with none of that
// to show isn't a part at all: animating its look for nothing would still
// have it redrawn every frame, and in an iPhone's web view a list that
// scrolls redraws everything in it.
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
      const style = getComputedStyle(el)
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
      const edged = (['Top', 'Right', 'Bottom', 'Left'] as const).some(
        (side) => parseFloat(style[`border${side}Width`]) > 0 && !['none', 'hidden'].includes(style[`border${side}Style`]) && !isClear(style[`border${side}Color`]),
      )
      const look: Keyframe = {
        ...(isClear(style.backgroundColor) ? {} : { backgroundColor: 'rgba(0, 0, 0, 0)' }),
        ...(edged ? { borderColor: 'rgba(0, 0, 0, 0)' } : {}),
        ...(style.boxShadow === 'none' ? {} : { boxShadow: shadowsIn(style.boxShadow).map(seeThrough).join(', ') }),
        ...(ownText ? { color: 'rgba(0, 0, 0, 0)' } : {}),
      }
      if (Object.keys(look).length) parts.push({ el, look })
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
    const read: Record<string, string> = { backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, boxShadow: style.boxShadow, color: style.color }
    return Object.fromEntries(Object.keys(look).map((key) => [key, read[key]]))
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

// Border widths, from a look's `borderWidth` (top right bottom left).
const edgesOf = (look: Look) => {
  const [top, right, bottom, left] = look.borderWidth.split(' ').map((width) => parseFloat(width) || 0)
  return { top, right, bottom, left }
}

// The look half of a morph, for morphPanelOpen and for one that moves its
// panel its own way (the settings panel's): the panel's fill, edge,
// shadow, frost, sheen and rim carried from the button's to its own while
// it grows, and back while it draws in. Make it at rest, before
// data-morphing lets go of the skin's important look (liquid-glass.css),
// since it ends on exactly that. Whoever pins the panel takes its own
// sheen off meanwhile (background-image: none), and the layers standing in
// for it go with `drop`; whoever moves it has them `follow` it.
export function lookMorph(source: HTMLElement, panel: HTMLElement) {
  const haze = hazeOf(source)
  const sourceLook = buttonLookOf(source, !!haze)
  const restLook = lookOf(panel)
  const rim = rimOf(source)
  // The boxes the button's light and the panel's sheen belong to: inside
  // each one's edge, as a background lies.
  const inside = (box: Box, look: Look) => {
    const edges = edgesOf(look)
    return { width: box.width - edges.left - edges.right, height: box.height - edges.top - edges.bottom }
  }
  const ourSize = inside(source.getBoundingClientRect(), sourceLook)
  const theirSize = inside(panel.getBoundingClientRect(), restLook)
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
      // Hidden once it's faded, so nothing draws it any more (the rim
      // stretches with the panel, so would be redrawn every frame).
      const going = (layer: HTMLElement | null) =>
        layer
          ? [layer.animate([{ opacity: 1, visibility: 'visible', easing: 'ease-out' }, { opacity: 0, visibility: 'hidden', offset: 0.4 }, { opacity: 0, visibility: 'hidden' }], timing)]
          : []
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
    // Keeps the layers on the panel while it moves through `boxes` (evenly
    // spaced) on `timing`. Stretched with it, as the rim is, they'd be
    // redrawn at every size, every frame: in an iPhone's web view that's
    // done on its processor, at three times the size, and the panel drops
    // frames. So the button's light and the panel's sheen are each drawn
    // once, at the size they belong to, and scaled with the panel's box;
    // the haze is drawn once over all the ground the panel covers and held
    // where it is on screen, as its fixed backgrounds were. The panel's
    // curve clips them. Added onto no transform of their own, so they're
    // worked out with the panel, frame for frame, not apart from it.
    follow: (boxes: Box[], timing: KeyframeAnimationOptions): Animation[] => {
      lay()
      const options = { ...timing, fill: 'both' as const, composite: 'add' as const }
      const scaled = (layer: HTMLElement | null, size: { width: number; height: number }, look: Look) => {
        if (!layer) return []
        Object.assign(layer.style, { inset: 'auto', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px`, borderRadius: '0', transformOrigin: '0 0', willChange: 'transform' })
        const edges = edgesOf(look)
        return [
          layer.animate(
            boxes.map((box) => ({ transform: `scale(${(box.width - edges.left - edges.right) / size.width}, ${(box.height - edges.top - edges.bottom) / size.height})` })),
            options,
          ),
        ]
      }
      const held = (layer: HTMLElement | null) => {
        if (!layer || !haze) return []
        const left = Math.min(...boxes.map((box) => box.left))
        const top = Math.min(...boxes.map((box) => box.top))
        const right = Math.max(...boxes.map((box) => box.left + box.width))
        const bottom = Math.max(...boxes.map((box) => box.top + box.height))
        Object.assign(layer.style, { inset: 'auto', left: '0', top: '0', width: `${right - left}px`, height: `${bottom - top}px`, borderRadius: '0', backgroundAttachment: 'scroll', willChange: 'transform' })
        placeHaze(layer, haze, { left, top })
        const edges = edgesOf(restLook)
        return [layer.animate(boxes.map((box) => ({ transform: `translate(${left - box.left - edges.left}px, ${top - box.top - edges.top}px)` })), options)]
      }
      return [...scaled(layers.ours, ourSize, sourceLook), ...scaled(layers.theirs, theirSize, restLook), ...held(layers.haze)]
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
const PINNED_CHILD = ['width', 'height', 'flex-shrink', 'position', 'left', 'top'] as const

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
  // The panel's padding, which comes off while it's pinned.
  let pad = { left: 0, top: 0 }

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
  // held at their size at rest, so nothing reflows or gets squeezed (a list
  // that scrolls would shrink with the panel otherwise). Its padding comes
  // off meanwhile, or a padded panel couldn't start as small as a small
  // button; the contents are moved in by as much (holdStill moves them on
  // from there). data-morphing lets go of Liquid Glass's important geometry
  // (liquid-glass.css) so the animation's can apply.
  const pin = () => {
    if (pinned) return
    pinned = true
    const style = getComputedStyle(panel)
    pad = { left: parseFloat(style.paddingLeft) || 0, top: parseFloat(style.paddingTop) || 0 }
    for (const el of contents) {
      Object.assign(el.style, {
        width: `${el.offsetWidth}px`,
        height: `${el.offsetHeight}px`,
        flexShrink: '0',
        position: 'relative',
        left: `${pad.left}px`,
        top: `${pad.top}px`,
      })
    }
    panel.setAttribute('data-morphing', '')
    // Its sheen goes on a layer meanwhile (lookMorph).
    Object.assign(panel.style, { position: 'fixed', margin: '0', overflow: 'hidden', padding: '0', backgroundImage: 'none' })
  }
  // The contents held still on screen where `at` puts them (the panel's box
  // they lie in) while the panel moves through `boxes` on `timing`: offset
  // against its moves frame by frame, on the same keyframes and curve, so
  // the glass opens over them and draws in off them rather than carrying
  // them along, and all they do is come in or go.
  const holdStill = (at: Box, boxes: Box[], timing: KeyframeAnimationOptions) =>
    contents.map((el) =>
      el.animate(
        boxes.map((box) => ({ left: `${pad.left + at.left - box.left}px`, top: `${pad.top + at.top - box.top}px` })),
        { ...timing, fill: 'both' },
      ),
    )
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
    ...holdStill(rest, [from, halfway(from, rest), rest], { duration: OPEN_MS, easing: panelSpring() }),
    ...look.open(OPEN_MS),
    ...look.follow([from, halfway(from, rest), rest], { duration: OPEN_MS, easing: panelSpring() }),
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
    // Where its contents are on screen: still held where they rest, if it
    // hasn't arrived yet; else where it is.
    const heldAt = pinned ? rest : now
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
      ...look.follow([now, halfway(now, to), to], { duration: CLOSE_MS, easing: MORPH_CALM }),
      ...(flyer && flight
        ? [flyer.animate([flown ?? { transform: flight.landed, color: flight.colour.to }, { transform: 'none', color: flight.colour.from }], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' })]
        : []),
      panel.animate([frame(now, nowCorners), bubble(now, to), frame(to, cornersOf(source, to))], { duration: CLOSE_MS, easing: MORPH_CALM, fill: 'forwards' }),
      ...holdStill(heldAt, [now, halfway(now, to), to], { duration: CLOSE_MS, easing: MORPH_CALM }),
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
