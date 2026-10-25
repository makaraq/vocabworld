'use client'

import React, { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { getFlagIcon } from '@/utils/flags'

// Tutorial guide: a small girl rises slowly from behind a tile's top edge,
// grips it, leans over its corner and points into it once, then stays put. After that only her
// face changes (a smile, a happy "talk", a blink), never her body.
//
// Frames were cut from one sprite sheet (public/tutorial/guide-*.webp); the
// numbers below are in sheet pixels, and SCALE turns them into CSS pixels.
// The three pointing frames share one body and differ only in the face.

const SCALE = 0.28

interface Frame {
  src: string
  x: number
  y: number
  w: number
  h: number
}

// Peek frames sit on the line where the body is cut off, so the tile's top
// edge hides everything below it.
const PEEK: Frame[] = [
  { src: '/tutorial/guide-peek-1.webp', x: 61, y: -184, w: 312, h: 205 },
  { src: '/tutorial/guide-peek-2.webp', x: -3, y: -276, w: 341, h: 294 },
]
// Tallest peek pose above the cut line, and how far her hands hang below it.
const PEEK_RISE = 300
const HAND_DROP = 22

// Pointing frames sit on the gripping hand at their left edge.
const POINT_FACES = ['/tutorial/guide-point.webp', '/tutorial/guide-point-talk.webp', '/tutorial/guide-point-blink.webp']
const POINT = { x: 0, y: -167, w: 381, h: 462 }
// From the gripping hand: her fingertip, the centre of her head, and the top of her hair.
const TIP = { x: 376, y: 294 }
const POINT_HEAD_X = 193
const POINT_HAIR_TOP = 167

// Card guides: she sits behind a card's top edge (the caption, or the theme
// panel) and rises from behind it. Two kinds:
//  - poses: she acts out a routine from her sprite sheet. Every frame is
//    lined up on her head (x) and the cut line of her body (y), so poses
//    change without her sliding around.
//  - layers: one still body; only her hand and face swap on top of it.
const CARD_SCALE = 0.26
const t = (name: string) => `/tutorial/guide-${name}.webp`

type CardFx = 'swipe' | 'flags' | 'sparkles'

// x: shift that lines the head up with the reference pose; cut: the row
// where her body is cut off; w/h: image size. All in sheet pixels.
interface PoseFrame { x: number; cut: number; w: number; h: number }

interface CardGuideBase {
  name: string
  // Which top corner of the card she sits on.
  side: 'left' | 'right'
  fx?: CardFx
  // Where the effect sits, in sheet pixels of the reference frame.
  fxAt?: { x: number; y: number }
}

interface PoseGuide extends CardGuideBase {
  kind: 'poses'
  // Frames 1-8 of the sheet, in order (guide-<name>-<n>.webp).
  frames: PoseFrame[]
  // [frame number, ms to hold]. The intro plays once, then the loop repeats.
  intro: [number, number][]
  loop: [number, number][]
  // The frame fxAt is measured on, and the frames the effect shows during.
  fxFrame?: number
  fxOn?: number[]
}

interface LayerGuide extends CardGuideBase {
  kind: 'layers'
  w: number
  h: number
  // Body variants, the first is the resting pose; faces go on top.
  bodies: string[]
  faces: Record<string, string>
  // [body index, face or null, ms to hold]. Loops forever.
  loop: [number, string | null, number][]
  // Bodies the effect shows on.
  fxOn?: number[]
}

type CardGuideConfig = PoseGuide | LayerGuide

// Two quick swipes, then a reaction, so it reads as scrolling through topics.
const swipes = (): [number, string | null, number][] => [
  [1, null, 220], [0, null, 220], [1, null, 220], [0, null, 300],
]

export const CARD_GUIDES = {
  phone: {
    kind: 'layers', name: 'phone', side: 'right', w: 329, h: 428,
    bodies: [t('phone'), t('phone-swipe')],
    faces: { wow: t('phone-wow'), happy: t('phone-happy'), blink: t('phone-blink'), laugh: t('phone-laugh') },
    loop: [
      ...swipes(), [0, 'wow', 900], [0, null, 500],
      ...swipes(), [0, 'happy', 1000], [0, 'blink', 180], [0, null, 600],
      ...swipes(), [0, 'laugh', 1000], [0, null, 700],
    ],
    fx: 'swipe', fxAt: { x: 300, y: 262 }, fxOn: [1],
  },
  present: {
    kind: 'poses', name: 'present', side: 'left',
    frames: [
      { x: -22, cut: 376, w: 284, h: 378 }, { x: -13, cut: 386, w: 323, h: 392 },
      { x: -38, cut: 373, w: 371, h: 388 }, { x: -5, cut: 398, w: 438, h: 401 },
      { x: -4, cut: 380, w: 364, h: 387 }, { x: 0, cut: 376, w: 399, h: 391 },
      { x: 2, cut: 381, w: 379, h: 394 }, { x: -11, cut: 381, w: 426, h: 408 },
    ],
    intro: [[3, 600]],
    loop: [[4, 900], [6, 1300], [5, 600], [7, 1200], [8, 900], [6, 1100]],
    fx: 'flags', fxAt: { x: 352, y: 112 }, fxFrame: 6, fxOn: [4, 5, 6, 7, 8],
  },
  // Headphones on, words popping up in bubbles as she listens and learns.
  listen: {
    kind: 'poses', name: 'listen', side: 'right',
    frames: [
      { x: 0, cut: 414, w: 359, h: 416 }, { x: 2, cut: 406, w: 360, h: 407 },
      { x: 3, cut: 426, w: 383, h: 427 }, { x: -6, cut: 441, w: 387, h: 443 },
      { x: 2, cut: 406, w: 347, h: 407 }, { x: -7, cut: 401, w: 402, h: 403 },
      { x: -20, cut: 391, w: 409, h: 402 }, { x: 12, cut: 365, w: 349, h: 367 },
    ],
    intro: [[1, 1300]],
    loop: [[2, 1100], [3, 1000], [4, 1100], [5, 1100], [6, 1000], [7, 1400], [8, 1300], [1, 1300]],
  },
  cheer: {
    kind: 'poses', name: 'cheer', side: 'right',
    frames: [
      { x: -30, cut: 430, w: 394, h: 431 }, { x: -14, cut: 391, w: 303, h: 395 },
      { x: 2, cut: 398, w: 296, h: 399 }, { x: 0, cut: 394, w: 313, h: 399 },
      { x: -34, cut: 409, w: 362, h: 425 }, { x: -11, cut: 409, w: 341, h: 415 },
      { x: 4, cut: 398, w: 306, h: 400 }, { x: 5, cut: 399, w: 360, h: 400 },
    ],
    intro: [[2, 450], [1, 750]],
    loop: [[4, 1100], [7, 700], [6, 900], [3, 700], [8, 900], [5, 900], [4, 700], [2, 450], [1, 750]],
    fx: 'sparkles',
  },
  settings: {
    kind: 'poses', name: 'settings', side: 'right',
    frames: [
      { x: -6, cut: 386, w: 348, h: 388 }, { x: -3, cut: 386, w: 331, h: 388 },
      { x: -14, cut: 377, w: 404, h: 381 }, { x: -15, cut: 394, w: 376, h: 396 },
      { x: 0, cut: 387, w: 380, h: 389 }, { x: 2, cut: 375, w: 357, h: 381 },
      { x: 1, cut: 374, w: 379, h: 382 }, { x: 2, cut: 375, w: 360, h: 377 },
    ],
    intro: [[1, 900]],
    loop: [[3, 900], [4, 1000], [5, 1100], [6, 1000], [7, 900], [8, 1100], [2, 900], [1, 900]],
  },
  themes: {
    kind: 'poses', name: 'themes', side: 'right',
    frames: [
      { x: 19, cut: 371, w: 296, h: 374 }, { x: 0, cut: 377, w: 404, h: 380 },
      { x: 12, cut: 370, w: 391, h: 373 }, { x: 16, cut: 378, w: 381, h: 385 },
      { x: 18, cut: 380, w: 395, h: 382 }, { x: 33, cut: 381, w: 355, h: 383 },
      { x: 17, cut: 374, w: 400, h: 376 }, { x: 23, cut: 369, w: 379, h: 371 },
    ],
    intro: [[1, 1000]],
    loop: [[2, 900], [3, 900], [4, 1200], [5, 900], [6, 1200], [7, 900], [3, 700], [8, 1300], [1, 900]],
  },
} satisfies Record<string, CardGuideConfig>

export type CardGuideName = keyof typeof CARD_GUIDES

// The images of a guide, each placed in one shared box: left/top/size in
// CSS pixels, with the box's bottom on the card's top edge.
function cardLayout(g: CardGuideConfig) {
  if (g.kind === 'layers') {
    const box = { left: 0, top: 0, width: g.w * CARD_SCALE, height: g.h * CARD_SCALE }
    return {
      width: box.width,
      height: box.height,
      bodies: g.bodies.map(src => ({ src, ...box })),
      faces: Object.entries(g.faces).map(([k, src]) => ({ k, src, ...box })),
      fx: g.fxAt && { left: g.fxAt.x * CARD_SCALE, top: g.fxAt.y * CARD_SCALE },
    }
  }
  const minX = Math.min(...g.frames.map(f => f.x))
  const maxRight = Math.max(...g.frames.map(f => f.x + f.w))
  const maxCut = Math.max(...g.frames.map(f => f.cut))
  const place = (f: PoseFrame) => ({ left: (f.x - minX) * CARD_SCALE, top: (maxCut - f.cut) * CARD_SCALE, width: f.w * CARD_SCALE, height: f.h * CARD_SCALE })
  const ref = g.frames[(g.fxFrame ?? 1) - 1]
  return {
    width: (maxRight - minX) * CARD_SCALE,
    height: maxCut * CARD_SCALE,
    bodies: g.frames.map((f, i) => ({ src: t(`${g.name}-${i + 1}`), ...place(f) })),
    faces: [] as { k: string; src: string; left: number; top: number; width: number; height: number }[],
    fx: g.fxAt && { left: (ref.x - minX + g.fxAt.x) * CARD_SCALE, top: (maxCut - ref.cut + g.fxAt.y) * CARD_SCALE },
  }
}

// How far a card guide rises above its card, so the layout can leave room.
export function cardGuideHeight(name: CardGuideName) {
  return cardLayout(CARD_GUIDES[name]).height
}

// Flags she presents on the languages step, one at a time.
const PRESENT_FLAGS = ['es', 'fr', 'de', 'ja', 'it', 'ko', 'tr', 'pt', 'zh', 'ru'].map(getFlagIcon)

export const GUIDE_AVATAR = t('avatar')
export const GUIDE_FRAMES = [
  ...PEEK.map(f => f.src),
  ...POINT_FACES,
  ...Object.values(CARD_GUIDES).flatMap((g: CardGuideConfig) => {
    const L = cardLayout(g)
    return [...L.bodies, ...L.faces].map(i => i.src)
  }),
  GUIDE_AVATAR,
]

type Stage = 'hidden' | 'peek' | 'rise' | 'point'

// Face loop once she is pointing: [face index, ms to hold].
const FACE_LOOP: [number, number][] = [[0, 1800], [1, 900], [0, 2200], [2, 220], [0, 1600], [2, 220], [0, 400], [1, 700]]

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
// Long, soft ease-out for her first appearance: no overshoot, no snap.
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

// Her head in the higher peek pose, from the cut line; in the pointing
// pose, from the gripping hand. The lean glides one onto the other.
const PEEK_HEAD = { x: 188, y: -189 }
const POINT_HEAD = { x: POINT_HEAD_X, y: -62 }
// Leftmost pixel of any peek frame, so she can be kept on the flat part of
// the tile's edge, clear of its rounded corner.
const PEEK_MIN_X = -3
const CORNER_INSET = 18

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface Props {
  target: Rect
  // Fired as she points, so the caption can come in on cue.
  onGreeted?: () => void
}

export function GuideCharacter({ target, onGreeted }: Props) {
  const [stage, setStage] = useState<Stage>('hidden')
  // Her hands on the edge show once she is up, so nothing pokes out in
  // front of the tile while she rises behind it.
  const [grip, setGrip] = useState(false)
  const [face, setFace] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    at(150, () => setStage('peek'))
    at(1100, () => setGrip(true))
    at(1650, () => setStage('rise'))
    at(2350, () => { setStage('point'); onGreeted?.() })

    let i = 0
    const nextFace = (delay: number) => at(delay, () => {
      const [f, hold] = FACE_LOOP[i++ % FACE_LOOP.length]
      setFace(f)
      nextFace(hold)
    })
    nextFace(3400)

    return () => timers.forEach(clearTimeout)
    // Plays once per mount; the overlay remounts it for each showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Peek: on the flat part of the tile's top edge, just in from its left corner.
  const edge = target.top
  const peekLeft = target.left + CORNER_INSET - PEEK_MIN_X * SCALE
  const peekHeight = PEEK_RISE * SCALE
  const handDrop = HAND_DROP * SCALE
  const peekHead = { x: peekLeft + PEEK_HEAD.x * SCALE, y: edge + PEEK_HEAD.y * SCALE }

  // Point: her head stays about where it was, a little to the left as she
  // leans over the corner, so her finger lands in the tile. Kept on screen.
  const anchorLeft = Math.max(peekHead.x - 24 - POINT_HEAD.x * SCALE, 4)
  const anchorTop = Math.max(peekHead.y - POINT_HEAD.y * SCALE, 24 + POINT_HAIR_TOP * SCALE)
  const pointHead = { x: anchorLeft + POINT_HEAD.x * SCALE, y: anchorTop + POINT_HEAD.y * SCALE }
  const tipX = anchorLeft + TIP.x * SCALE
  const tipY = anchorTop + TIP.y * SCALE
  // How far her head travels in the lean.
  const lean = { x: pointHead.x - peekHead.x, y: pointHead.y - peekHead.y }

  const peekFrame = stage === 'rise' || stage === 'point' ? 1 : 0
  const peekUp = stage !== 'hidden'
  const pointing = stage === 'point'

  // The peek frames, drawn twice: above the edge (where she rises from
  // behind the tile) and below it (only her hands, over the front).
  const peekImages = (
    <div
      className="absolute"
      style={{
        left: 60,
        transform: pointing
          ? `translate(${lean.x}px, ${lean.y}px)`
          : peekUp ? 'translateY(0)' : `translateY(${peekHeight + 10}px)`,
        transition: pointing ? `transform 560ms ${EASE_IN_OUT}` : `transform 1000ms ${EASE_OUT}`,
      }}
    >
      {PEEK.map((f, i) => (
        <img
          key={f.src}
          src={f.src}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            left: f.x * SCALE,
            top: f.y * SCALE,
            width: f.w * SCALE,
            height: f.h * SCALE,
            opacity: i === peekFrame ? 1 : 0,
            transition: 'opacity 260ms ease-in-out',
          }}
        />
      ))}
    </div>
  )
  const clipBox = { left: peekLeft - 60, width: 380 * SCALE + 120 }

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div style={{ opacity: pointing ? 0 : 1, transition: 'opacity 280ms ease-in-out' }}>
        {/* Above the edge: her bottom is cut exactly at the tile's top */}
        <div className="absolute overflow-hidden" style={{ ...clipBox, top: edge - peekHeight - 40, height: peekHeight + 40 }}>
          <div className="absolute" style={{ top: peekHeight + 40, left: 0 }}>{peekImages}</div>
        </div>
        {/* Below the edge: her hands, gripping it, once she is up */}
        <div
          className="absolute overflow-hidden"
          style={{ ...clipBox, top: edge, height: handDrop + 1, opacity: grip ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        >
          <div className="absolute" style={{ top: 0, left: 0 }}>{peekImages}</div>
        </div>
      </div>

      {/* One ripple where her finger lands */}
      {pointing && (
        <span
          className="guide-ripple absolute rounded-full border-2 border-white/80"
          style={{ left: tipX - 14, top: tipY - 14, width: 28, height: 28, animationDelay: '520ms' }}
        />
      )}

      {/* Point: glides in from where her head was, then holds still; only
          the face changes */}
      <div
        className="absolute"
        style={{
          left: anchorLeft,
          top: anchorTop,
          opacity: pointing ? 1 : 0,
          transform: pointing ? 'translate(0, 0)' : `translate(${-lean.x}px, ${-lean.y}px)`,
          transition: pointing ? `transform 560ms ${EASE_IN_OUT}, opacity 280ms ease-in-out` : 'none',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
        }}
      >
        {POINT_FACES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              left: POINT.x * SCALE,
              top: POINT.y * SCALE,
              width: POINT.w * SCALE,
              height: POINT.h * SCALE,
              opacity: i === 0 || i === face ? 1 : 0,
              transition: 'opacity 90ms linear',
            }}
          />
        ))}
      </div>
    </div>
  )
}


// Render inside the card's positioned wrapper, before the card, so the card
// covers her cut-off body.
export function CardGuide({ name }: { name: CardGuideName }) {
  const g: CardGuideConfig = CARD_GUIDES[name]
  const [up, setUp] = useState(false)
  // Poses: the frame number showing. Layers: the body index and face.
  const [frame, setFrame] = useState(g.kind === 'poses' ? g.intro[0][0] : 0)
  const [face, setFace] = useState<string | null>(null)
  // Flips on every pose change to restart the little bounce.
  const [beat, setBeat] = useState(false)
  const [flag, setFlag] = useState(-1)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
    at(120, () => setUp(true))
    let start = 900
    if (g.kind === 'poses') {
      const show = (n: number) => { setFrame(n); setBeat(b => !b) }
      // The intro's first pose is the one she rises in; the rest play once.
      start = 120 + g.intro[0][1]
      for (const [n, ms] of g.intro.slice(1)) { at(start, () => show(n)); start += ms }
      let i = 0
      const next = (wait: number) => at(wait, () => {
        const [n, ms] = g.loop[i++ % g.loop.length]
        show(n)
        next(ms)
      })
      next(start)
    } else {
      let i = 0
      const next = (wait: number) => at(wait, () => {
        const [b, f, ms] = g.loop[i++ % g.loop.length]
        setFrame(b)
        setFace(f)
        next(ms)
      })
      next(start)
    }
    if (g.fx === 'flags') {
      const pop = (wait: number) => at(wait, () => { setFlag(f => f + 1); pop(1150) })
      pop(start + 200)
    }
    return () => timers.forEach(clearTimeout)
  }, [g])

  const L = cardLayout(g)
  const fxOn = !g.fxOn || g.fxOn.includes(frame)
  const fx = L.fx && { left: L.fx.left, top: 40 + L.fx.top }
  // Poses show one frame at a time; layers keep the resting body under the
  // swapped one so nothing flickers through.
  const bodyOn = (i: number) => g.kind === 'poses' ? i + 1 === frame : i === 0 || i === frame
  const pos = (b: { left: number; top: number; width: number; height: number }) =>
    ({ left: b.left, top: b.top, width: b.width, height: b.height })

  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none ${g.side === 'left' ? 'left-3' : 'right-3'}`}
      style={{ bottom: 'calc(100% - 6px)', width: L.width, height: L.height + 40 }}
    >
      {/* Clip at the card's edge so she comes up from behind it */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: L.height + 6, marginLeft: -30, marginRight: -30 }}>
        <div
          className="absolute bottom-0"
          style={{
            left: 30,
            width: L.width,
            height: L.height,
            transform: up ? 'translateY(0)' : `translateY(${L.height + 8}px)`,
            transition: `transform 620ms ${SPRING}`,
          }}
        >
          <div
            className={`absolute inset-0 ${up && g.kind === 'poses' ? (beat ? 'guide-beat-a' : 'guide-beat-b') : ''}`}
            style={{ transformOrigin: '50% 100%' }}
          >
            {L.bodies.map((b, i) => (
              <img
                key={b.src}
                src={b.src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ ...pos(b), opacity: bodyOn(i) ? 1 : 0, transition: g.kind === 'poses' ? 'opacity 90ms linear' : undefined }}
              />
            ))}
            {L.faces.map(f => (
              <img
                key={f.k}
                src={f.src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ ...pos(f), opacity: face === f.k ? 1 : 0, transition: 'opacity 80ms linear' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Effects live outside the clip so they can float above her */}
      {up && fx && g.fx === 'swipe' && (
        <span className="absolute" style={{ ...fx, marginTop: -12, opacity: fxOn ? 1 : 0, transition: 'opacity 90ms linear' }}>
          <span className="absolute block w-[3px] h-2.5 rounded-full bg-[#f26b1d]" style={{ left: 2, top: 4, transform: 'rotate(35deg)' }} />
          <span className="absolute block w-[3px] h-2 rounded-full bg-[#f26b1d]" style={{ left: 9, top: 9, transform: 'rotate(70deg)' }} />
        </span>
      )}
      {up && fx && g.fx === 'flags' && fxOn && flag >= 0 && (
        <span key={flag} className="guide-flag-pop absolute block w-6 h-6" style={{ left: fx.left - 12, top: fx.top - 30 }}>
          <Icon icon={PRESENT_FLAGS[flag % PRESENT_FLAGS.length]} className="w-full h-full rounded-full shadow-md" />
        </span>
      )}
      {up && g.fx === 'sparkles' && [[0.02, 0.5], [0.94, 0.42], [0.84, 0.06]].map(([x, y], i) => (
        <span
          key={i}
          className="guide-twinkle absolute text-[13px] leading-none text-[#f5a524]"
          style={{ left: x * L.width, top: 40 + y * L.height, animationDelay: `${i * 0.55}s` }}
        >
          ✦
        </span>
      ))}
    </div>
  )
}
