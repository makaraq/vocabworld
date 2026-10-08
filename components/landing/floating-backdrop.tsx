'use client'

// The ground the landing page sits on: the topic icons from the app's menu,
// the flags from its language picker and the leaderboard's smileys, loose
// across the whole page — no cards, no labels.
//
// They are a little physics world rather than a CSS animation: each one
// drifts at its own slow speed, and when two meet they bounce off each other
// (equal-mass elastic, nothing else — no pop, no squash) and off the edges
// of the page. CSS cannot do that — a collision depends on where everything
// else is this frame — so a single rAF loop owns `transform` and `opacity`
// and writes them straight to the DOM. No React state per frame: a re-render
// of this component would overwrite the loop's work, which is why the
// trophies keep their replay timer in a child of their own.
//
// Purely decorative: aria-hidden, pointer-events-none, always behind the
// hero (which sits at z-10). Anything that wanders behind the words fades
// down on its own so the copy still reads cleanly over it.

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { LANDING_TOPICS } from '@/components/landing/landing-topics'
import { smileyAvatar } from '@/lib/avatars/smiley-avatar'

// A sprinkle of flags, not a parade of them: the topic icons carry the page.
const FLAGS = [
  'flag:es-1x1', 'flag:fr-1x1', 'flag:de-1x1', 'flag:jp-1x1',
  'flag:tr-1x1', 'flag:kr-1x1', 'flag:it-1x1', 'flag:in-1x1',
]

const AVATAR_SEEDS = ['k3p1', 'w2x8', '9fz2', 'q7m4', 'm8d3', 'z4v7']

/** How many trophies drift around replaying the topic-complete animation. */
const TROPHIES = 2

/** Each floater joins at one of these widths, so phones stay uncrowded. */
const TIERS = ['', 'hidden md:block', 'hidden xl:block'] as const

/** Slow: a floater crosses the page in something like a minute. */
const SPEED_MIN = 7
const SPEED_MAX = 20
/** How far a floater fades where it crosses the middle copy, and how wide
 *  the soft edge of that fade is, in px. */
const DIMMED = 0.35
const FEATHER = 70

interface Piece {
  kind: 'topic' | 'flag' | 'avatar' | 'trophy'
  value: string
  tier: number
  size: number
  /** starting point, in % of the page — what the server renders */
  left: number
  top: number
  speed: number
  heading: number
  spin: number
}

/** mulberry32 — a deterministic scatter, so SSR and the client agree. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(): Piece[] {
  const rand = rng(20261008)

  // Every topic icon twice, the flags and faces once each: interleaved so no
  // kind clumps in the draw order, and so the thinner groups spread out.
  const groups = [
    [...LANDING_TOPICS, ...LANDING_TOPICS].map((t) => ({ kind: 'topic' as const, value: t.icon })),
    FLAGS.map((value) => ({ kind: 'flag' as const, value })),
    AVATAR_SEEDS.map((value) => ({ kind: 'avatar' as const, value })),
    Array.from({ length: TROPHIES }, (_, i) => ({ kind: 'trophy' as const, value: `t${i}` })),
  ]
  const mixed: { kind: Piece['kind']; value: string }[] = []
  while (groups.some((g) => g.length)) {
    for (const g of groups) {
      const next = g.shift()
      if (next) mixed.push(next)
    }
  }

  const placed: [number, number][] = []
  return mixed.map((item, i) => {
    let left = 50
    let top = 50
    // Rejection sampling: random, but nothing starts inside anything else.
    for (let attempt = 0; attempt < 60; attempt++) {
      left = 5 + rand() * 90
      top = 4 + rand() * 91
      const clear = placed.every(([px, py]) => Math.abs(px - left) > 8 || Math.abs(py - top) > 5.5)
      if (clear) break
    }
    placed.push([left, top])

    return {
      ...item,
      // Phones get a third of them, tablets two thirds, desktops the lot.
      // Offset so the tier cycle does not lock onto the kind cycle and hand
      // phones nothing but flags.
      tier: (i + Math.floor(i / 3)) % 3,
      size: Math.round(
        (item.kind === 'trophy' ? 58 : item.kind === 'topic' ? 38 : item.kind === 'avatar' ? 30 : 26) +
          rand() * 18,
      ),
      left: Math.round(left * 10) / 10,
      top: Math.round(top * 10) / 10,
      speed: SPEED_MIN + rand() * (SPEED_MAX - SPEED_MIN),
      heading: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 14,
      }
  })
}

const PIECES = build()

interface Body {
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  r: number
  angle: number
  spin: number
  alpha: number
  target: number
}

export function FloatingBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let bodies: Body[] = []
    let width = 0
    let height = 0
    /** The boxes of the actual words, so only what crosses them fades. */
    let text: { x0: number; x1: number; y0: number; y1: number }[] = []

    const measure = () => {
      const rect = host.getBoundingClientRect()
      width = rect.width
      height = rect.height

      // Only the middle copy — the headline and the lines under it. The
      // badge and the footer look after themselves, and fading for them too
      // washed out most of the page.
      const root = host.parentElement
      text = root
        ? [...root.querySelectorAll('main h1, main p')].map((el) => {
            const b = el.getBoundingClientRect()
            return {
              x0: b.left - rect.left,
              x1: b.right - rect.left,
              y0: b.top - rect.top,
              y1: b.bottom - rect.top,
            }
          })
        : []

      // Keep whatever is already on screen; (re)seed anything new or hidden.
      bodies = []
      nodes.current.forEach((el, i) => {
        if (!el || el.offsetParent === null) return
        const piece = PIECES[i]
        const existing = bodies.find((b) => b.el === el)
        if (existing) return
        const r = piece.size / 2
        bodies.push({
          el,
          x: Math.min(Math.max((piece.left / 100) * width, r), Math.max(r, width - r)),
          y: Math.min(Math.max((piece.top / 100) * height, r), Math.max(r, height - r)),
          vx: Math.cos(piece.heading) * piece.speed,
          vy: Math.sin(piece.heading) * piece.speed,
          r,
          angle: 0,
          spin: piece.spin,
          alpha: 0,
          target: 1,
        })
      })
    }

    measure()

    let raf = 0
    let last = performance.now()
    let started = last

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const age = (now - started) / 1000

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.angle += b.spin * dt

        // Walls.
        if (b.x < b.r) {
          b.x = b.r
          b.vx = Math.abs(b.vx)
        } else if (b.x > width - b.r) {
          b.x = width - b.r
          b.vx = -Math.abs(b.vx)
        }
        if (b.y < b.r) {
          b.y = b.r
          b.vy = Math.abs(b.vy)
        } else if (b.y > height - b.r) {
          b.y = height - b.r
          b.vy = -Math.abs(b.vy)
        }
      }

      // Pairwise, equal mass, perfectly elastic: swap the velocity components
      // along the line between the two centres and leave the tangent alone.
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const min = a.r + b.r
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min || d2 === 0) continue

          const d = Math.sqrt(d2)
          const nx = dx / d
          const ny = dy / d

          // Push them apart first, or they stick together and jitter.
          const overlap = (min - d) / 2
          a.x -= nx * overlap
          a.y -= ny * overlap
          b.x += nx * overlap
          b.y += ny * overlap

          const an = a.vx * nx + a.vy * ny
          const bn = b.vx * nx + b.vy * ny
          if (an - bn <= 0) continue // already separating

          a.vx += (bn - an) * nx
          a.vy += (bn - an) * ny
          b.vx += (an - bn) * nx
          b.vy += (an - bn) * ny

          a.spin = -a.spin
          b.spin = -b.spin
        }
      }

      for (const b of bodies) {
        // Soft falloff: full dim right over the words, easing back to full
        // strength FEATHER px out, so nothing pops as it drifts past.
        let over = 0
        for (const t of text) {
          const ox = Math.max(t.x0 - b.x, b.x - t.x1, 0)
          const oy = Math.max(t.y0 - b.y, b.y - t.y1, 0)
          const d = Math.hypot(ox, oy) - b.r
          if (d >= FEATHER) continue
          over = Math.max(over, Math.min(1, 1 - d / FEATHER))
        }
        b.target = 1 - (1 - DIMMED) * over
        // Ease in over the first moments, then ease between dim and full.
        const ceiling = Math.min(1, age / 0.9)
        b.alpha += (Math.min(b.target, ceiling) - b.alpha) * Math.min(1, dt * 4)

        b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${b.angle}deg)`
        b.el.style.opacity = b.alpha.toFixed(3)
      }

      raf = requestAnimationFrame(frame)
    }

    // Hand the pieces over to the loop: positions now come from transforms.
    nodes.current.forEach((el) => {
      if (!el) return
      el.style.left = '0px'
      el.style.top = '0px'
    })
    raf = requestAnimationFrame(frame)

    const observer = new ResizeObserver(() => measure())
    observer.observe(host)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {PIECES.map((p, i) => (
        <div
          key={`${p.kind}-${i}`}
          ref={(el) => {
            nodes.current[i] = el
          }}
          style={{
            // Server-rendered resting place; the loop takes over on mount.
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: 0,
          }}
          className={`landing-floater absolute ${TIERS[p.tier]}`}
        >
          {p.kind === 'topic' && (
            <span
              className="block w-full h-full text-[#B8390A]/75 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: p.value }}
            />
          )}
          {p.kind === 'flag' && (
            <Icon
              icon={p.value}
              className="w-full h-full rounded-full drop-shadow-[0_6px_10px_rgba(13,11,10,0.18)]"
            />
          )}
          {p.kind === 'avatar' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={smileyAvatar(p.value)}
              alt=""
              className="w-full h-full rounded-full drop-shadow-[0_6px_10px_rgba(13,11,10,0.18)]"
            />
          )}
          {p.kind === 'trophy' && <TrophyPiece delay={i * 900} />}
        </div>
      ))}
    </div>
  )
}

// The topic-complete celebration, riding along as one of the floaters: it
// drifts and bounces like everything else and replays every few seconds.
// Lottie and the 110KB animation load only after the hero has painted, and
// the replay timer lives here so re-rendering it never disturbs the loop.
const REPLAY_MS = 6000

function TrophyPiece({ delay }: { delay: number }) {
  const [anim, setAnim] = useState<unknown>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Lottie, setLottie] = useState<any>(null)
  const [round, setRound] = useState(0)

  useEffect(() => {
    let alive = true
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 600)
    idle(() => {
      Promise.all([import('lottie-react'), import('@/lib/animations/trophy.json')]).then(
        ([mod, data]) => {
          if (!alive) return
          setLottie(() => mod.default)
          setAnim(data.default)
        },
      )
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!anim) return
    const start = window.setTimeout(() => setRound((r) => r + 1), delay)
    const timer = window.setInterval(() => setRound((r) => r + 1), REPLAY_MS)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [anim, delay])

  if (!anim || !Lottie) return null

  return (
    <div className="w-full h-full drop-shadow-[0_6px_10px_rgba(13,11,10,0.18)]">
      <Lottie key={round} animationData={anim} loop={false} autoplay />
    </div>
  )
}
