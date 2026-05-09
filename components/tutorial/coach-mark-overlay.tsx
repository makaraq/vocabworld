'use client'

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'

export interface CoachMarkStep {
  selector: string
  title: string
  body: string
  placement?: 'auto' | 'top' | 'bottom'
  padding?: number
}

interface Props {
  open: boolean
  steps: CoachMarkStep[]
  onComplete: () => void
  onSkip: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const TOOLTIP_HEIGHT_FALLBACK = 200
const TOOLTIP_GAP = 14
const VIEWPORT_MARGIN = 16

export function CoachMarkOverlay({ open, steps, onComplete, onSkip }: Props) {
  const [mounted, setMounted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [missing, setMissing] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(TOOLTIP_HEIGHT_FALLBACK)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (open) setStepIndex(0)
  }, [open])

  const step = steps[stepIndex]

  const measure = useCallback(() => {
    if (!step) return
    const el = document.querySelector(step.selector) as HTMLElement | null
    if (!el) {
      setRect(null)
      setMissing(true)
      return
    }
    setMissing(false)
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  useLayoutEffect(() => {
    if (!open || !mounted) return
    measure()
    const ro = new ResizeObserver(measure)
    const el = step ? (document.querySelector(step.selector) as HTMLElement | null) : null
    if (el) ro.observe(el)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, mounted, measure, step])

  // Measure the tooltip after every render so placement uses the real height,
  // not a guess. Avoids the body text overlapping the highlighted element.
  useLayoutEffect(() => {
    if (!open || !mounted || !tooltipRef.current) return
    const h = tooltipRef.current.offsetHeight
    if (h && Math.abs(h - tooltipHeight) > 2) setTooltipHeight(h)
  })

  if (!open || !mounted || !step) return null

  const isLast = stepIndex >= steps.length - 1
  const padding = step.padding ?? 8

  const handleNext = () => {
    if (isLast) onComplete()
    else setStepIndex(i => i + 1)
  }

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }

  // Determine tooltip position. Pick the side with the most usable space,
  // honoring an explicit `placement` only when that side actually fits the tooltip.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const requiredSpace = tooltipHeight + TOOLTIP_GAP + VIEWPORT_MARGIN

  let tooltipTop = 0
  let placement: 'top' | 'bottom' = 'bottom'
  let tooltipOverlapsTarget = false

  if (rect) {
    const spaceAbove = rect.top - padding
    const spaceBelow = vh - (rect.top + rect.height + padding)
    const fitsAbove = spaceAbove >= requiredSpace
    const fitsBelow = spaceBelow >= requiredSpace

    let placeBelow: boolean
    if (step.placement === 'bottom') placeBelow = fitsBelow || !fitsAbove
    else if (step.placement === 'top') placeBelow = !fitsAbove && fitsBelow
    else placeBelow = spaceBelow >= spaceAbove

    if (placeBelow) {
      placement = 'bottom'
      tooltipTop = rect.top + rect.height + padding + TOOLTIP_GAP
    } else {
      placement = 'top'
      tooltipTop = rect.top - padding - TOOLTIP_GAP - tooltipHeight
    }

    // If neither side fits, anchor the tooltip to the viewport edge with the
    // most room. The arrow is hidden in that case (see render below).
    if (!fitsAbove && !fitsBelow) {
      tooltipOverlapsTarget = true
      if (spaceBelow >= spaceAbove) {
        tooltipTop = vh - tooltipHeight - VIEWPORT_MARGIN
      } else {
        tooltipTop = VIEWPORT_MARGIN
      }
    } else {
      tooltipTop = Math.max(VIEWPORT_MARGIN, Math.min(tooltipTop, vh - tooltipHeight - VIEWPORT_MARGIN))
    }
  } else {
    tooltipTop = Math.max(VIEWPORT_MARGIN, vh / 2 - tooltipHeight / 2)
  }

  const content = (
    <div className="fixed inset-0 z-[10000] pointer-events-none">

      {/* Spotlight: when target exists, use a div with massive box-shadow to dim everything except the cutout */}
      {rect && !missing ? (
        <div
          aria-hidden
          className="absolute rounded-2xl pointer-events-auto transition-all duration-300 ease-out"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={handleNext}
        />
      ) : (
        // Fallback: solid backdrop when target can't be found
        <div
          aria-hidden
          className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
          onClick={handleNext}
        />
      )}

      {/* Pulse ring around the target */}
      {rect && !missing && (
        <div
          aria-hidden
          className="absolute rounded-2xl border-2 border-blue-400/80 pointer-events-none animate-pulse"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            boxShadow: '0 0 24px 4px rgba(59, 130, 246, 0.45)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
        style={{ top: tooltipTop }}
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-5 space-y-4">

          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex
                      ? 'w-6 bg-blue-400'
                      : i < stepIndex
                      ? 'w-1.5 bg-blue-400/60'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-white/50 text-xs font-medium active:text-white/80 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <h3 className="text-white text-base font-bold leading-tight">
              {step.title}
            </h3>
            <p className="text-white/65 text-sm leading-relaxed">
              {step.body}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-white/40 text-xs tabular-nums">
              {stepIndex + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="text-white/60 text-sm font-medium px-3 py-2 rounded-xl active:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5"
              >
                {isLast ? 'Got it' : 'Next'}
                <Icon
                  icon={isLast ? 'solar:check-circle-bold' : 'solar:arrow-right-bold'}
                  width="14"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Pointer arrow — hidden when the tooltip is anchored to the viewport edge */}
        {rect && !missing && !tooltipOverlapsTarget && (
          <div
            aria-hidden
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white/10 backdrop-blur-xl border border-white/20 rotate-45 ${
              placement === 'bottom'
                ? '-top-1.5 border-r-0 border-b-0'
                : '-bottom-1.5 border-l-0 border-t-0'
            }`}
          />
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
