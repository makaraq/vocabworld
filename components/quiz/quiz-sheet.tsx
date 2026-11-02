"use client"
import { useState, useEffect, useLayoutEffect, useCallback, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import { hapticsLight } from "@/lib/haptics"
import { canMorphFrom, morphPanelOpen, type PanelMorph } from "@/lib/morph-modal"

interface QuizSheetProps {
  title: string
  icon: string
  iconClassName: string
  closeLabel: string
  onClose: () => void
  // Beside the ✕: the picture coins.
  headerExtra?: ReactNode
  // The tile it was opened from: when it is on screen the sheet opens out of
  // it and closes back into it (lib/morph-modal.ts) instead of sliding up.
  // Dragged down, it slides away, the tile forming again behind it.
  morphFrom?: () => HTMLElement | null
  // Gets the close, for a Done button.
  children: (close: () => void) => ReactNode
}

// The quizzes' frame: a bottom sheet like the leaderboard's, so the glass
// skin dresses it as it does the app's other sheets. A grabber, the title on
// the left, the coins and the ✕ on the right, and one height whatever it
// holds: cards load after it opens, and the result is shorter than a
// question.
export function QuizSheet({ title, icon, iconClassName, closeLabel, onClose, headerExtra, morphFrom, children }: QuizSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<PanelMorph | null>(null)
  const closingRef = useRef(false)
  const dragState = useRef<{ phase: 'idle' | 'pending' | 'dragging'; startY: number; currentY: number; startTime: number }>({
    phase: 'idle', startY: 0, currentY: 0, startTime: 0,
  })

  // Mount + fully freeze background (prevent scroll + swipe on the page behind)
  useEffect(() => {
    setMounted(true)
    const scrollY = window.scrollY
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    }
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.documentElement.style.overflow = "hidden"
    return () => {
      setMounted(false)
      document.body.style.overflow = originalStyles.overflow
      document.body.style.position = originalStyles.position
      document.body.style.top = originalStyles.top
      document.body.style.width = originalStyles.width
      document.documentElement.style.overflow = originalStyles.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Out of the tile, when it's on screen; else the slide up. Before the
  // first paint, so it never shows in place first.
  useLayoutEffect(() => {
    if (!mounted) return
    const source = morphFrom?.()
    if (modalRef.current && canMorphFrom(source)) {
      morphRef.current = morphPanelOpen(source, modalRef.current, backdropRef.current)
      // Its own slide up doesn't run; the morph holds it meanwhile.
      setShown(true)
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(raf)
      morphRef.current?.dispose()
      morphRef.current = null
    }
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back into the tile it opened from; dragged down, it slides away
  // instead, carrying on at the drag's `velocity` (px/ms) while the tile
  // forms again (lib/morph-modal.ts).
  const animateClose = useCallback((how?: 'slide', velocity?: number) => {
    if (closingRef.current) return
    closingRef.current = true
    if (morphRef.current) {
      if (how === 'slide') morphRef.current.slide(onClose, velocity)
      else morphRef.current.close(onClose)
      return
    }
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'
      modalRef.current.style.transform = 'translateY(100%)'
      modalRef.current.style.opacity = '0'
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'opacity 0.3s ease-out'
      backdropRef.current.style.opacity = '0'
    }
    setTimeout(onClose, 300)
  }, [onClose])

  const close = useCallback(() => animateClose(), [animateClose])

  // Lets go of a drag: far or fast enough, it slides away; else it springs
  // back.
  const endDrag = useCallback((dy: number, dt: number) => {
    const velocity = dy / Math.max(dt, 1)
    if (dy > 100 || velocity > 0.4) {
      animateClose('slide', velocity)
      return
    }
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
      modalRef.current.style.transform = 'translateY(0)'
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'opacity 0.3s ease'
      backdropRef.current.style.opacity = '1'
    }
  }, [animateClose])

  const dragTo = (dy: number) => {
    if (modalRef.current) {
      modalRef.current.style.transform = `translateY(${dy < 0 ? dy * 0.15 : dy}px)`
      modalRef.current.style.transition = 'none'
    }
    if (backdropRef.current && dy > 0) {
      backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / 400))
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select')) return
    dragState.current = {
      phase: target.closest('[data-drag-handle]') ? 'dragging' : 'pending',
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      startTime: Date.now(),
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = dragState.current
    if (s.phase === 'idle') return
    const clientY = e.touches[0].clientY
    const dy = clientY - s.startY
    if (s.phase === 'pending') {
      if (dy > 8) s.phase = 'dragging'
      else if (dy < -8) { s.phase = 'idle'; return }
      else return
    }
    s.currentY = clientY
    dragTo(dy)
  }

  const handleTouchEnd = () => {
    const s = dragState.current
    if (s.phase !== 'dragging') { s.phase = 'idle'; return }
    s.phase = 'idle'
    endDrag(s.currentY - s.startY, Date.now() - s.startTime)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (!target.closest('[data-drag-handle]') || target.closest('button')) return
    e.preventDefault()
    const startY = e.clientY
    const startTime = Date.now()
    let currentY = startY
    const onMove = (ev: MouseEvent) => {
      currentY = ev.clientY
      dragTo(currentY - startY)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
      endDrag(currentY - startY, Date.now() - startTime)
    }
    // Caught on the way down: the view stops mouse events going up to the
    // page behind it, the window included.
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mouseup', onUp, true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animateClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [animateClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => { e.stopPropagation(); e.preventDefault() }}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <div
        ref={modalRef}
        className={`relative w-full h-[88dvh] bg-white/10 backdrop-blur-2xl rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 select-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div data-drag-handle className="shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        <div data-drag-handle className="shrink-0 w-full max-w-lg mx-auto flex items-center justify-between gap-3 px-5 pt-2 pb-3 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <h2 className="min-w-0 text-white font-bold text-lg tracking-wide flex items-center gap-2">
            <Icon icon={icon} width="22" className={`shrink-0 ${iconClassName}`} />
            <span className="truncate">{title}</span>
          </h2>
          <div className="shrink-0 flex items-center gap-3">
            {headerExtra}
            <button
              onClick={() => { hapticsLight(); close() }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all cursor-pointer"
              aria-label={closeLabel}
            >
              <Icon icon="solar:close-circle-bold" width="20" height="20" />
            </button>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 w-full max-w-lg mx-auto px-5 flex flex-col"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          {children(close)}
        </div>
      </div>
    </div>,
    document.body
  )
}
