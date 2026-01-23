"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'

interface AnimatedIconProps {
  svgString: string
  className?: string
  style?: React.CSSProperties
  /** Unique key to identify this icon instance - animation replays when this changes */
  iconKey: string | number
}

/**
 * AnimatedIcon component that plays SVG animations once per iconKey value.
 * 
 * When iconKey changes (e.g., navigating to a new section), the animation plays.
 * When the component re-renders with the same iconKey (e.g., console logs, state updates),
 * it shows the static version to prevent re-animation.
 */
export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  svgString,
  className,
  style,
  iconKey
}) => {
  // Track the iconKey that we've animated for
  const animatedForKeyRef = useRef<string | number | null>(null)
  const [showStatic, setShowStatic] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Convert animated SVG to static by setting elements to their final animated state
  const staticSvg = useMemo(() => {
    if (!svgString) return ''
    
    // Parse the SVG and remove animation elements, setting attributes to final values
    let staticVersion = svgString
    
    // Remove all <animate> elements - they've served their purpose
    staticVersion = staticVersion.replace(/<animate[^>]*\/>/g, '')
    staticVersion = staticVersion.replace(/<animate[^>]*>[\s\S]*?<\/animate>/g, '')
    staticVersion = staticVersion.replace(/<animateMotion[^>]*\/>/g, '')
    staticVersion = staticVersion.replace(/<animateMotion[^>]*>[\s\S]*?<\/animateMotion>/g, '')
    staticVersion = staticVersion.replace(/<animateTransform[^>]*\/>/g, '')
    staticVersion = staticVersion.replace(/<animateTransform[^>]*>[\s\S]*?<\/animateTransform>/g, '')
    
    // Set stroke-dashoffset to 0 (animation end state for draw-on effects)
    staticVersion = staticVersion.replace(/stroke-dashoffset="[^"]*"/g, 'stroke-dashoffset="0"')
    
    // Set fill-opacity to final values (typically 0.3 or 1)
    // Look for patterns like fill-opacity="0" that should be visible
    staticVersion = staticVersion.replace(/fill-opacity="0"(?=[^>]*>(?!<animate))/g, (match, offset) => {
      // Check if there's an animate element that changes this
      const context = svgString.substring(Math.max(0, offset - 200), offset + 200)
      if (context.includes('values="0;0.3"')) return 'fill-opacity="0.3"'
      if (context.includes('values="0;1"')) return 'fill-opacity="1"'
      return 'fill-opacity="0.3"' // Default to visible
    })
    
    return staticVersion
  }, [svgString])
  
  useEffect(() => {
    // If iconKey changed, we need to animate again
    if (animatedForKeyRef.current !== iconKey) {
      // Clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      
      // Show animated version
      setShowStatic(false)
      animatedForKeyRef.current = iconKey
      
      // Wait for longest animation to complete (based on SVG analysis: ~1.8s max)
      // Add a small buffer for safety
      timerRef.current = setTimeout(() => {
        setShowStatic(true)
      }, 2000)
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [iconKey])
  
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: showStatic ? staticSvg : svgString }}
    />
  )
}

export default AnimatedIcon
