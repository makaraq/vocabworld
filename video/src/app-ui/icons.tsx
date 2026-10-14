import React, { useId, useMemo } from 'react'
import { APP_ICONS } from '../generated/app-icons'
import { SECTION_ICONS } from '../generated/app-sections'

// The app draws its icons with @iconify/react from bundled collections
// (lib/icons/offline-icons.ts). This renders the same bodies synchronously,
// sized the way <Icon> sizes them: 1em by default, or by its className.

/** Make ids inside an icon body unique per instance, as Iconify does. */
function scopeIds(body: string, suffix: string) {
  return body
    .replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${suffix})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${id}-${suffix}"`)
}

export const AppIcon: React.FC<{
  icon: string
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
}> = ({ icon, className, style, width, height }) => {
  const data = APP_ICONS[icon]
  const suffix = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (!data) throw new Error(`Icon missing from the synced app data: ${icon}`)
  const ratio = data.width / data.height
  const w = width ?? (height !== undefined ? Number(height) * ratio : '1em')
  const h = height ?? (width !== undefined ? Number(width) / ratio : '1em')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${data.width} ${data.height}`}
      width={w}
      height={h}
      className={className}
      style={style}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: scopeIds(data.body, suffix) }}
    />
  )
}

// ── Section header icons ─────────────────────────────────────────────
// The headers are SMIL-animated SVGs that draw themselves the first time a
// section is shown; after 2s the app strips the <animate> elements and sets
// the end state by hand (language-selector.tsx): dash offsets to 0 and
// fill-opacity="0" to 1. SMIL runs on wall-clock time, which a frame-by-frame
// render cannot use, so this evaluates the same animation at a given time.

const FINALIZE_AFTER = 2 // seconds, as in the app

function evaluateSectionIcon(svg: string, t: number, suffix: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement

  if (t >= FINALIZE_AFTER) {
    root.querySelectorAll('[stroke-dashoffset]').forEach((el) => el.setAttribute('stroke-dashoffset', '0'))
    root.querySelectorAll('[fill-opacity="0"]').forEach((el) => el.setAttribute('fill-opacity', '1'))
    root.querySelectorAll('animate, animateMotion, animateTransform').forEach((el) => el.remove())
  } else {
    root.querySelectorAll('animate').forEach((anim) => {
      const target = anim.parentElement
      const attr = anim.getAttribute('attributeName')
      const values = (anim.getAttribute('values') ?? '').split(';').map(Number)
      const begin = parseFloat(anim.getAttribute('begin') ?? '0')
      const dur = parseFloat(anim.getAttribute('dur') ?? '0')
      if (target && attr && values.length >= 2 && values.every((v) => !Number.isNaN(v)) && t >= begin) {
        const p = dur > 0 ? Math.min(1, (t - begin) / dur) : 1
        const seg = p * (values.length - 1)
        const i = Math.min(values.length - 2, Math.floor(seg))
        const v = values[i] + (values[i + 1] - values[i]) * (seg - i)
        target.setAttribute(attr, String(v))
      }
      anim.remove()
    })
    root.querySelectorAll('animateMotion').forEach((motion) => {
      const target = motion.parentElement
      const dur = parseFloat(motion.getAttribute('dur') ?? '1')
      const dy = Number(motion.getAttribute('path')?.match(/v(-?[\d.]+)/)?.[1] ?? 0)
      if (target) target.setAttribute('transform', `translate(0 ${dy * ((t % dur) / dur)})`)
      motion.remove()
    })
  }

  const out = new XMLSerializer().serializeToString(root)
  return scopeIds(out, suffix)
}

/**
 * A section header icon as it looks `t` seconds after the section first came
 * up (Infinity: the settled icon the app shows on every later visit).
 */
export const SectionIcon: React.FC<{ section: string; t?: number }> = ({ section, t = Infinity }) => {
  const suffix = useId().replace(/[^a-zA-Z0-9]/g, '')
  const svg = SECTION_ICONS[section]
  // Quantise to a frame so equal times reuse the same markup.
  const key = Number.isFinite(t) ? Math.round(t * 30) / 30 : Infinity
  const html = useMemo(() => evaluateSectionIcon(svg, key, suffix), [svg, key, suffix])
  return (
    <div
      className="w-6 h-6 flex-shrink-0 flex items-center justify-center"
      style={{ color: 'currentColor' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
