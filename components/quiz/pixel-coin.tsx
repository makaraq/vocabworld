"use client"
import { forwardRef } from "react"

// An 8×8 pixel-art coin, drawn as crisp squares so it stays pixelated at any
// size. o rim, h highlight, y face, s shade, d the stamp in the middle.
const ROWS = [
  "..oooo..",
  ".ohhyyo.",
  "ohyyyyso",
  "ohyddyso",
  "oyyddyso",
  "oyyyysso",
  ".osssso.",
  "..oooo..",
]

const GOLD: Record<string, string> = {
  o: "#7a4a05",
  h: "#fff6c2",
  y: "#ffcc33",
  s: "#e09a1a",
  d: "#c98410",
}

const PIXELS = ROWS.flatMap((row, y) =>
  [...row].map((c, x) => (c === "." ? null : { x, y, c })).filter((p): p is { x: number; y: number; c: string } => !!p)
)

export function PixelCoin({ size = 18, spent = false, className = "" }: { size?: number; spent?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`shrink-0 transition-[filter,opacity] duration-300 ${spent ? "grayscale opacity-30" : ""} ${className}`}
    >
      {PIXELS.map(({ x, y, c }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={GOLD[c]} />
      ))}
    </svg>
  )
}

// Today's coins, left to right: the ones still to spend in gold, the spent
// ones greyed. The newest spent coin is the leftmost grey one, so a purchase
// greys the coin next to the gold ones.
export const CoinPurse = forwardRef<HTMLDivElement, { left: number; total: number; label: string }>(
  function CoinPurse({ left, total, label }, ref) {
    return (
      <div ref={ref} role="img" aria-label={label} className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <PixelCoin key={i} spent={i >= left} />
        ))}
      </div>
    )
  }
)
