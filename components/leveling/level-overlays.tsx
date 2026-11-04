"use client"

// The two moments XP shows itself while you learn:
//   - XpToast: a small pill under the status bar, "+340 XP · 50%", each time
//     the level bar passes a quarter. Every gain in between stays quiet. On an
//     iPhone with a Dynamic Island it grows out of the island instead
//     (lib/native/island-toast.ts).
//   - LevelUpOverlay: the full-screen celebration — rays, shockwaves, the
//     letters of LEVEL UP dropping in, confetti, and when a new rank comes
//     with it, the old border bursting into the new one and the new title.
// Mounted once, by AchievementProvider (and by the Level Lab).

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import { useT } from "@/components/providers/translation-provider"
import { haptic } from "@/lib/haptics"
import {
  getLevelProfile,
  subscribeLevelUp,
  subscribeXpGain,
  type LevelUpEvent,
  type XpGain,
} from "@/lib/leveling/engine"
import { levelInfo, rankForLevel } from "@/lib/leveling/definitions"
import { showInIsland } from "@/lib/native/island-toast"
import { LevelAvatar } from "./level-avatar"

export function LevelOverlays() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <>
      <XpToast />
      <LevelUpOverlay />
    </>,
    document.body,
  )
}

// ── XP toast ─────────────────────────────────────────────────────────────────

/** Which quarter of which level `xp` is in, as one count that only grows. */
function quarterOf(xp: number): number {
  const info = levelInfo(xp)
  return (info.level - 1) * 4 + Math.min(3, Math.floor(info.progress * 4))
}

interface ToastState {
  /** XP earned since the toast last showed. */
  total: number
  xp: number
  bump: number
}

/** The quarter of the level `xp` has just passed (25%, 50% or 75%), and
 *  how it is written in the UI language. */
function quarterReached(xp: number, uiLang: string) {
  const reached = Math.floor(levelInfo(xp).progress * 4) / 4
  let pct = `${Math.round(reached * 100)}%`
  try {
    pct = new Intl.NumberFormat(uiLang, { style: "percent" }).format(reached)
  } catch {}
  return { reached, pct }
}

function XpToast() {
  const { uiLang } = useT()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [leaving, setLeaving] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const goneTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const unshown = useRef({ userId: null as string | null, xp: 0 })
  const bump = useRef(0)
  const lang = useRef(uiLang)
  lang.current = uiLang

  useEffect(() => {
    const showWeb = (total: number, xp: number) => {
      clearTimeout(hideTimer.current)
      clearTimeout(goneTimer.current)
      setLeaving(false)
      setToast({ total, xp, bump: ++bump.current })
      hideTimer.current = setTimeout(() => {
        setLeaving(true)
        goneTimer.current = setTimeout(() => setToast(null), 260)
      }, 2200)
    }
    return subscribeXpGain((g: XpGain) => {
      const u = unshown.current
      if (u.userId !== g.userId) unshown.current = { userId: g.userId, xp: 0 }
      unshown.current.xp += g.amount
      // A full bar is the level-up overlay's moment; it starts the count over.
      if (g.levelAfter > g.levelBefore) {
        unshown.current.xp = 0
        return
      }
      if (quarterOf(g.totalXp) <= quarterOf(g.totalXp - g.amount)) return
      const total = unshown.current.xp
      unshown.current.xp = 0
      // On an iPhone with a Dynamic Island it grows out of the island instead.
      const level = levelInfo(g.totalXp).level
      const rank = rankForLevel(level)
      const { reached, pct } = quarterReached(g.totalXp, lang.current)
      void showInIsland({ level, xp: total, percent: pct, progress: reached, color: rank.color, accent: rank.accent })
        .then((shown) => { if (!shown) showWeb(total, g.totalXp) })
    })
  }, [])

  useEffect(() => () => {
    clearTimeout(hideTimer.current)
    clearTimeout(goneTimer.current)
  }, [])

  if (!toast) return null
  const info = levelInfo(toast.xp)
  const rank = rankForLevel(info.level)
  // The quarter just passed: 25%, 50% or 75%, written the UI language's way.
  const { reached, pct } = quarterReached(toast.xp, uiLang)
  return (
    <div
      className="fixed left-1/2 z-[70] pointer-events-none w-max max-w-[92vw]"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        animation: leaving ? "lvl-toast-out .26s ease-in forwards" : "lvl-toast-in .4s cubic-bezier(.2,.9,.3,1.3) both",
        ["--c" as string]: rank.color,
        ["--a" as string]: rank.accent,
      }}
    >
      <div className="relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 whitespace-nowrap rounded-full bg-black/55 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="relative w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${rank.color} ${reached * 360}deg, rgba(255,255,255,.15) 0)` }}>
          <div className="absolute inset-[3px] rounded-full bg-black/80 flex items-center justify-center">
            <span className="text-[10px] font-extrabold text-white tabular-nums">{info.level}</span>
          </div>
        </div>
        <span key={toast.bump} className="lvl-shiny-text font-extrabold text-base tabular-nums" style={{ animation: "lvl-bump .35s ease-out, lvl-text-shine 2.5s linear infinite" }}>
          +{toast.total} XP
        </span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: rank.color }}>{pct}</span>
      </div>
    </div>
  )
}

// ── Level-up overlay ─────────────────────────────────────────────────────────

const LETTERS_KEY = "level.up" as const

function LevelUpOverlay() {
  const { t } = useT()
  const [queue, setQueue] = useState<LevelUpEvent[]>([])
  const evt = queue[0] ?? null

  useEffect(() => {
    return subscribeLevelUp((e) => {
      setQueue((q) => {
        // Several levels at once (a big badge) merge into one celebration.
        if (q.length > 0) {
          const last = q[q.length - 1]
          const merged: LevelUpEvent = { ...last, to: e.to, rank: e.rank, newRank: last.newRank || e.newRank }
          return [...q.slice(0, -1), merged]
        }
        return [e]
      })
    })
  }, [])

  const close = useCallback(() => {
    setQueue((q) => q.slice(1))
  }, [])

  if (!evt) return null
  return <LevelUpScene key={`${evt.from}-${evt.to}`} evt={evt} onClose={close} t={t} />
}

function LevelUpScene({ evt, onClose, t }: { evt: LevelUpEvent; onClose: () => void; t: ReturnType<typeof useT>["t"] }) {
  const profile = getLevelProfile()
  const [shownLevel, setShownLevel] = useState(evt.from)
  const [swapped, setSwapped] = useState(!evt.newRank)
  const [leaving, setLeaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rank = swapped ? evt.rank : evt.rankBefore

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const steps = evt.to - evt.from
    const start = 650
    const stepMs = Math.max(60, Math.min(220, 700 / steps))
    for (let i = 1; i <= steps; i++) {
      timers.push(setTimeout(() => {
        setShownLevel(evt.from + i)
        // The last step lands on success, below.
        if (i < steps) haptic.tap()
      }, start + i * stepMs))
    }
    const end = start + steps * stepMs
    timers.push(setTimeout(() => haptic.success(), end))
    timers.push(setTimeout(() => {
      haptic.celebrate()
      burst(canvasRef.current, [evt.rankBefore.color, evt.rankBefore.accent, "#ffffff", "#fde047"], 140)
    }, 380))
    if (evt.newRank) {
      timers.push(setTimeout(() => {
        setSwapped(true)
        haptic.celebrate()
        burst(canvasRef.current, [evt.rank.color, evt.rank.accent, "#ffffff"], 220)
      }, end + 250))
    }
    return () => timers.forEach(clearTimeout)
  }, [evt])

  const finish = () => {
    if (leaving) return
    setLeaving(true)
    haptic.tap()
    setTimeout(onClose, 280)
  }

  const word = t(LETTERS_KEY)
  const late = evt.newRank ? 1.5 : 0.9

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden"
      style={{
        ["--c" as string]: rank.color,
        ["--a" as string]: rank.accent,
        transition: "opacity .28s ease",
        opacity: leaving ? 0 : 1,
      }}
      onClick={finish}
      role="dialog"
      aria-modal="true"
      aria-label={word}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" style={{ animation: "lvl-fade .3s ease-out both" }} />
      {/* Light rays */}
      <div
        className="absolute left-1/2 top-[42%] w-[160vmax] h-[160vmax] -ml-[80vmax] -mt-[80vmax] rounded-full pointer-events-none"
        style={{
          background: `repeating-conic-gradient(from 0deg, ${rank.color}33 0deg 7deg, transparent 7deg 20deg)`,
          WebkitMask: "radial-gradient(closest-side, #000 10%, transparent 70%)",
          mask: "radial-gradient(closest-side, #000 10%, transparent 70%)",
          animation: "lvl-rays-in .9s cubic-bezier(.2,.8,.2,1) both, lvl-spin 40s linear .9s infinite",
          transition: "background .4s",
        }}
      />
      <div
        className="absolute left-1/2 top-[42%] w-[70vmin] h-[70vmin] -ml-[35vmin] -mt-[35vmin] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${rank.color}55, transparent)`, animation: "lvl-pulse 2.2s ease-in-out infinite" }}
      />
      {/* Shockwaves */}
      {[0.35, 0.55, 0.75].map((d, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-[42%] w-40 h-40 rounded-full pointer-events-none"
          style={{ border: `3px solid ${evt.rankBefore.color}`, animation: `lvl-shock 1.1s ease-out ${d}s both` }}
        />
      ))}
      {evt.newRank && swapped && [0, 0.15, 0.3].map((d, i) => (
        <span
          key={`n${i}`}
          className="absolute left-1/2 top-[42%] w-40 h-40 rounded-full pointer-events-none"
          style={{ border: `4px solid ${evt.rank.color}`, animation: `lvl-shock 1.2s ease-out ${d}s both` }}
        />
      ))}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="relative flex flex-col items-center px-6 text-center" style={{ marginTop: "-6vh" }}>
        <h2 className="flex text-4xl font-black tracking-wider mb-8" aria-hidden>
          {Array.from(word).map((ch, i) => (
            <span
              key={i}
              className="lvl-shiny-text inline-block"
              style={{ animation: `lvl-letter .55s cubic-bezier(.2,.9,.3,1.3) ${0.25 + i * 0.05}s both, lvl-text-shine 2.5s linear infinite`, whiteSpace: "pre" }}
            >
              {ch}
            </span>
          ))}
        </h2>

        <div className="relative" style={{ animation: "lvl-hero-in .8s cubic-bezier(.2,.9,.3,1.2) .1s both" }}>
          <LevelAvatar level={shownLevel} border={rank.id} size={148} src={profile.src} initials={profile.initials} />
          {evt.newRank && swapped && (
            <span className="absolute -inset-10 rounded-full bg-white pointer-events-none" style={{ animation: "lvl-flash .6s ease-out both" }} />
          )}
        </div>

        <div className="mt-10 flex items-baseline gap-2">
          <span className="text-white/60 font-bold text-lg uppercase tracking-widest">{t("level.short")}</span>
          <span key={shownLevel} className="text-6xl font-black text-white tabular-nums inline-block" style={{ animation: "lvl-num-pop .3s ease-out", textShadow: `0 0 24px ${rank.color}` }}>
            {shownLevel}
          </span>
        </div>

        {evt.newRank ? (
          <div className="mt-5 flex flex-col items-center gap-1" style={{ animation: `lvl-rise .6s cubic-bezier(.2,.9,.3,1.2) ${late}s both` }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">{t("level.newTitle")}</span>
            <span className="lvl-shiny-text text-3xl font-black">{t(`level.rank.${evt.rank.id}`)}</span>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-white/10 border border-white/25">
              <Icon icon="solar:stars-bold" width="14" style={{ color: evt.rank.color }} />
              {t("level.newBorder")}
            </span>
          </div>
        ) : (
          <div className="mt-4 text-white/70 text-sm font-semibold" style={{ animation: `lvl-rise .5s ease-out ${late}s both` }}>
            {t(`level.rank.${rank.id}`)}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); finish() }}
          className="mt-10 rounded-full px-10 py-3.5 font-bold text-black shadow-2xl"
          style={{ background: `linear-gradient(135deg, #fff, ${rank.color})`, animation: `lvl-rise .5s ease-out ${late + 0.35}s both`, boxShadow: `0 0 30px ${rank.color}88` }}
        >
          {t("level.continue")}
        </button>
      </div>
    </div>
  )
}

// ── Confetti ─────────────────────────────────────────────────────────────────

/** A burst from the hero avatar: ribbons, discs and four-point stars. */
function burst(canvas: HTMLCanvasElement | null, colors: string[], count: number) {
  if (!canvas) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const cx = w / 2
  const cy = h * 0.42 - h * 0.06 + 40
  type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; c: string; k: number; life: number }
  const parts: P[] = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2
    const v = 4 + Math.random() * 11
    return {
      x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      s: 4 + Math.random() * 7, c: colors[(Math.random() * colors.length) | 0],
      k: (Math.random() * 3) | 0, life: 1,
    }
  })
  const prev = (canvas as any).__lvlParts as P[] | undefined
  const all = prev ? prev.concat(parts) : parts
  ;(canvas as any).__lvlParts = all
  if ((canvas as any).__lvlRunning) return
  ;(canvas as any).__lvlRunning = true
  const tick = () => {
    const list = (canvas as any).__lvlParts as P[]
    ctx.clearRect(0, 0, w, h)
    for (const p of list) {
      p.vx *= 0.985
      p.vy = p.vy * 0.985 + 0.22
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      p.life -= 0.006
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5))
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      if (p.k === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      else if (p.k === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s / 3, 0, Math.PI * 2); ctx.fill() }
      else {
        const s = p.s / 1.5
        ctx.beginPath()
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s)
        ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill()
      }
      ctx.restore()
    }
    const alive = list.filter((p) => p.life > 0 && p.y < h + 40)
    ;(canvas as any).__lvlParts = alive
    if (alive.length && canvas.isConnected) requestAnimationFrame(tick)
    else {
      ;(canvas as any).__lvlRunning = false
      ctx.clearRect(0, 0, w, h)
    }
  }
  requestAnimationFrame(tick)
}
