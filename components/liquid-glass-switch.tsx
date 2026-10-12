"use client"

import { useEffect } from "react"
import { hapticsMedium } from "@/lib/haptics"
import { liquidGlassAvailable, setLiquidGlass } from "@/lib/liquid-glass"

// Hold two fingers still anywhere for HOLD_MS to flip between the Liquid
// Glass look and the old one. No UI and nothing to translate: it exists so
// the two looks can be compared on a TestFlight build.
const HOLD_MS = 800
const SLOP_PX = 24

export function LiquidGlassSwitch() {
  useEffect(() => {
    if (!liquidGlassAvailable()) return

    let timer: number | undefined
    let start: { x: number; y: number }[] = []

    const cancel = () => {
      window.clearTimeout(timer)
      timer = undefined
    }

    // Lifting the fingers after the flip would otherwise land as a tap on
    // whatever was under them.
    const swallowClick = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const onStart = (e: TouchEvent) => {
      cancel()
      if (e.touches.length !== 2) return
      start = Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY }))
      timer = window.setTimeout(() => {
        timer = undefined
        setLiquidGlass(!document.documentElement.classList.contains("liquid-glass"))
        hapticsMedium()
        window.addEventListener("click", swallowClick, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener("click", swallowClick, { capture: true }), 1000)
      }, HOLD_MS)
    }

    const onMove = (e: TouchEvent) => {
      if (timer === undefined) return
      for (let i = 0; i < Math.min(e.touches.length, start.length); i++) {
        const t = e.touches[i]
        if (Math.hypot(t.clientX - start[i].x, t.clientY - start[i].y) > SLOP_PX) return cancel()
      }
    }

    const opts = { capture: true, passive: true } as const
    document.addEventListener("touchstart", onStart, opts)
    document.addEventListener("touchmove", onMove, opts)
    document.addEventListener("touchend", cancel, opts)
    document.addEventListener("touchcancel", cancel, opts)
    return () => {
      cancel()
      document.removeEventListener("touchstart", onStart, opts)
      document.removeEventListener("touchmove", onMove, opts)
      document.removeEventListener("touchend", cancel, opts)
      document.removeEventListener("touchcancel", cancel, opts)
    }
  }, [])

  return null
}
