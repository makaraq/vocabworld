"use client"
import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Topic, VocabularyWord, VocabularyResponse, getTopics, getVocabularyForTopic } from "@/lib/database"
import { useAuth } from "@/contexts/auth-context"
import { ProgressStats } from "@/components/progress/progress-stats"
import { SearchWordLearning } from "@/components/learning/search-word-learning"
import { PaywallModal } from "@/components/paywall/paywall-modal"

declare global {
  interface Window {
    // Reserved for future use
  }
}
import { Icon } from '@iconify/react'
import {
  Search,
  Languages,
  MessageCircle,
  BookOpen,
  ArrowLeft,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Square,
} from "lucide-react"

// Topic icon mapping for our new 39 topics
// Iconify Solar set icons (solar by 480 Design) — use icon names, render with <Icon icon="solar:..." />
const TOPIC_ICONS = [
  { id: 1, icon: 'solar:chat-round-linear' }, // Greetings
  { id: 2, icon: 'solar:calculator-linear' }, // Numbers
  { id: 3, icon: 'solar:clock-circle-linear' }, // Time & Dates
  { id: 4, icon: 'solar:map-point-linear' }, // Directions & Transportation
  { id: 5, icon: 'solar:cart-3-linear' }, // Shopping & Money
  { id: 6, icon: 'solar:cup-hot-linear' }, // Food, Drinks & Restaurants
  { id: 7, icon: 'solar:danger-triangle-linear' }, // Emergency & Safety
  { id: 8, icon: 'solar:heart-pulse-linear' }, // Health
  { id: 9, icon: 'solar:home-2-linear' }, // Home & Household Items
  { id: 10, icon: 'solar:t-shirt-linear' }, // Clothing & Personal Style
  { id: 11, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.74 5.47c2.36 1.03 3.61 3.56 3.18 5.99A6 6 0 0 1 18 16v.17a3 3 0 0 1 1-.17a3 3 0 0 1 3 3a3 3 0 0 1-3 3H6a4 4 0 0 1-4-4a4 4 0 0 1 4-4h.27C5 12.45 4.6 10.24 5.5 8.26a5.49 5.49 0 0 1 7.24-2.79m-.81 1.83c-1.77-.8-3.84.01-4.62 1.77c-.46 1.02-.38 2.15.1 3.06A5.99 5.99 0 0 1 12 10c.7 0 1.38.12 2 .34a3.51 3.51 0 0 0-2.07-3.04m1.62-3.66c-.55-.24-1.1-.41-1.67-.52l2.49-1.3l.9 2.89a7.7 7.7 0 0 0-1.72-1.07m-7.46.8c-.49.35-.92.75-1.29 1.19l.11-2.81l2.96.68c-.62.21-1.22.53-1.78.94M18 9.71c-.09-.59-.22-1.16-.41-1.71l2.38 1.5l-2.05 2.23c.11-.65.13-1.33.08-2.02M3.04 11.3c.07.6.2 1.17.39 1.7l-2.37-1.5L3.1 9.28c-.1.65-.13 1.33-.06 2.02M19 18h-3v-2a4 4 0 0 0-4-4a4 4 0 0 0-4 4H6a2 2 0 0 0-2 2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1a1 1 0 0 0-1-1"/></svg>' }, // Weather
  { id: 12, icon: 'solar:users-group-rounded-linear' }, // Family
  { id: 13, icon: 'solar:emoji-funny-square-linear' }, // Emotions & Feelings
  { id: 14, icon: 'solar:user-circle-linear' }, // Personality & Character
  { id: 15, icon: 'solar:gameboy-linear' }, // Hobbies & Leisure Activities
  { id: 16, icon: 'solar:basketball-linear' }, // Sports & Fitness
  { id: 17, icon: 'solar:buildings-2-linear' }, // City
  { id: 18, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 6h2V4h-2zm1 6q-1.9 0-3.625-.788T5 9.45V8q0-.825.588-1.412T7 6h2V3q0-.425.288-.712T10 2h4q.425 0 .713.288T15 3v3h2q.825 0 1.413.588T19 8v1.45q-1.65.975-3.375 1.763T12 12m-5 9q-.825 0-1.412-.587T5 19v-7.3q1.4.85 2.888 1.45t3.112.8V14q0 .425.288.713T12 15t.713-.288T13 14v-.05q1.625-.2 3.113-.8T19 11.7V19q0 .825-.587 1.413T17 21q0 .425-.288.713T16 22q-.4 0-.562-.363T15 21H9q0 .425-.288.713T8 22q-.4 0-.562-.363T7 21"/></svg>' }, // Travel
  { id: 19, icon: 'solar:star-bold' }, // Colors & Shapes  
  { id: 20, icon: 'solar:sun-bold' }, // Nature
  { id: 21, icon: 'solar:walking-linear' }, // Actions
  { id: 22, icon: 'solar:document-text-linear' }, // Adjectives
  { id: 23, icon: 'solar:music-note-4-linear' }, // Arts & Entertainment
  { id: 24, icon: 'solar:smartphone-linear' }, // Technology & Gadgets
  { id: 25, icon: 'solar:case-round-linear' }, // Work & Professions
  { id: 26, icon: 'solar:graduation-cap-linear' }, // Education & School Life
  { id: 27, icon: 'solar:microphone-linear' }, // Communication & Media
  { id: 28, icon: 'solar:leaf-linear' }, // Environment & Sustainability
  { id: 29, icon: 'solar:graph-up-linear' }, // Business & Economics
  { id: 30, icon: 'solar:book-2-linear' }, // Common Collocations
  { id: 31, icon: 'solar:chat-square-like-linear' }, // Slang & Modern Expressions
  { id: 32, icon: 'solar:atom-linear' }, // Science & Technology
  { id: 33, icon: 'solar:calculator-minimalistic-linear' }, // Mathematics & Geometry
  { id: 34, icon: 'solar:history-linear' }, // History & Culture
  { id: 35, icon: 'solar:scale-linear' }, // Politics & Law
  { id: 36, icon: 'solar:meditation-round-linear' }, // Religion & Philosophy
  { id: 37, icon: 'solar:magic-stick-3-linear' }, // Mythology & Fantasy
  { id: 38, icon: 'solar:confetti-minimalistic-linear' }, // Celebrations & Holidays
  { id: 39, icon: 'solar:document-medicine-linear' }, // Advanced Communication & Formal Language
  { id: 40, icon: 'solar:global-linear' }, // Cultural Integration & Global Perspectives
  { id: 41, icon: 'solar:running-2-linear' }, // Verbs
  { id: 42, icon: 'solar:book-2-linear' }, // Common Phrases
]

// iPhone-style Topic Slider Component
interface TopicSliderProps {
  topics: Topic[]
  selectedTopic: Topic | null
  onTopicSelect: (topic: Topic) => void
  TOPIC_ICONS: Array<{ id: number; icon: string | any }>
  getTopicDisplayName: (id: number, name: string) => string
  isIOS?: boolean
  user: any
  signOut: () => Promise<void>
  nativeLanguage: string
  nativeLanguageCode: string
  targetLanguage: string
  targetLanguageCode: string
  handleSignOut: () => Promise<void>
  getFlagIcon: (languageCode: string) => string
  completedTopicIds: number[]
  currentSection: number
  setCurrentSection: (section: number) => void
  lastTopicSectionRef: React.MutableRefObject<number>
  // Playlist props
  userPlaylists: Array<{
    id: string
    name: string
    icon: string
    word_count?: number
    source_language_code: string
    target_language_code: string
  }>
  isLoadingPlaylists: boolean
  onCreatePlaylist: () => void
  renderTopicButton: (topic: Topic) => React.ReactElement
  isPremium: boolean
  setShowPaywall: (show: boolean) => void
}

const TopicSlider: React.FC<TopicSliderProps> = ({ 
  topics, 
  selectedTopic, 
  onTopicSelect, 
  TOPIC_ICONS, 
  getTopicDisplayName,
  isIOS = false,
  user,
  signOut,
  nativeLanguage,
  nativeLanguageCode,
  targetLanguage,
  targetLanguageCode,
  handleSignOut,
  getFlagIcon,
  completedTopicIds,
  currentSection,
  setCurrentSection,
  lastTopicSectionRef,
  userPlaylists,
  isLoadingPlaylists,
  onCreatePlaylist,
  renderTopicButton,
  isPremium,
  setShowPaywall
}) => {
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Stable icon key - only changes when section actually changes, not during transitions
  const [iconKey, setIconKey] = useState(currentSection)
  const lastSectionRef = useRef(currentSection)
  
  useEffect(() => {
    // Only update icon key when section changes AND we're not in the middle of transitioning
    if (lastSectionRef.current !== currentSection && !isTransitioning) {
      setIconKey(currentSection)
      lastSectionRef.current = currentSection
    }
  }, [currentSection, isTransitioning])

  // Define the 7 sections with their topics and metadata (Account first, but FIRST AID KIT is default)
  const sections = [
    {
      name: "ACCOUNT",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" fill-opacity="0" stroke-dasharray="20" stroke-dashoffset="20" d="M12 12c2.21 0 4 -1.79 4 -4c0 -2.21 -1.79 -4 -4 -4c-2.21 0 -4 1.79 -4 4c0 2.21 1.79 4 4 4Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="20;0"/></path><path stroke-dasharray="36" stroke-dashoffset="36" d="M20 20c0 -4.42 -3.58 -8 -8 -8c-4.42 0 -8 3.58 -8 8"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.4s" values="36;0"/></path></g></svg>',
      topics: [], // No topics, this is a special page
      gridCols: 1,
      isAccount: true // Special flag for account page
    },
    {
      name: "FIRST AID KIT",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGDmnSdctG"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M9 7h11c0.55 0 1 0.45 1 1v11c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11c0 -0.55 0.45 -1 1 -1Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.9s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke-dasharray="16" stroke-dashoffset="16" d="M9 7v-3c0 -0.55 0.45 -1 1 -1h4c0.55 0 1 0.45 1 1v3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="16;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M12 11v6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="8;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M9 14h6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="8;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGDmnSdctG)"/></svg>',
      topics: topics.slice(0, 6), // 6 topics: Greetings, Numbers, Time, Emergency, Directions, Travel
      gridCols: 2,
      isDefault: true // This will be the default page
    },
    {
      name: "DAILY LIFE", 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" d="M17 14v4c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-4Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"/></path><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="48" stroke-dashoffset="48" d="M17 9v9c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-9Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="48;0"/></path><path stroke-dasharray="14" stroke-dashoffset="14" d="M17 9h3c0.55 0 1 0.45 1 1v3c0 0.55 -0.45 1 -1 1h-3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="14;0"/></path><mask id="SVGnGEayvOG"><path stroke="#fff" d="M8 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M12 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M16 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4"><animateMotion calcMode="linear" dur="3s" path="M0 0v-8" repeatCount="indefinite"/></path></mask><rect width="24" height="0" y="7" fill="currentColor" mask="url(#SVGnGEayvOG)"><animate fill="freeze" attributeName="y" begin="0.8s" dur="0.6s" values="7;2"/><animate fill="freeze" attributeName="height" begin="0.8s" dur="0.6s" values="0;5"/></rect></g></svg>',
      topics: topics.slice(6, 14), // 8 topics: Shopping, Food, Health, Home, Family, Personal Style, Weather & Nature, Places
      gridCols: 2
    },
    {
      name: "WORK & SCHOOL",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="20" stroke-dashoffset="20" d="M3 21h18"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"/></path><path fill="currentColor" fill-opacity="0" stroke-dasharray="48" stroke-dashoffset="48" d="M7 17v-4l10 -10l4 4l-10 10h-4"><animate fill="freeze" attributeName="fill-opacity" begin="1.1s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.6s" values="48;0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M14 6l4 4"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="8;0"/></path></g></svg>',
      topics: topics.slice(20, 28), // 8 topics: Professions, Education, History & Culture, Science, Technology, Arts, Mathematics, Colors
      gridCols: 2
    },
    {
      name: "PERSONAL & SOCIAL LIFE",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGydZajcRT"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M9 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.2s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M15 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="12" stroke-dashoffset="12" d="M8 14c0.5 1.5 1.79 3 4 3c2.21 0 3.5 -1.5 4 -3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="12;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGydZajcRT)"/></svg>',
      topics: topics.slice(14, 20), // 6 topics: Emotions & Feelings, Personality, Actions, Hobbies, Sports, Adjectives
      gridCols: 2
    },
    {
      name: "CULTURE & SOCIETY",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-dasharray="80" stroke-dashoffset="80" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.47 5.94c1.83 1.37 3.81 4.14 4.53 5.63c0.72 -1.49 2.7 -4.26 4.53 -5.63c1.33 -0.99 3.47 -1.75 3.47 0.68c0 0.49 -0.28 4.08 -0.45 4.66c-0.57 2.03 -2.65 2.55 -4.5 2.23c3.24 0.55 4.06 2.36 2.28 4.17c-3.38 3.44 -4.85 -0.87 -5.23 -1.97c-0.07 -0.2 -0.1 -0.3 -0.1 -0.22c-0 -0.08 -0.03 0.02 -0.1 0.22c-0.38 1.1 -1.86 5.41 -5.23 1.97c-1.78 -1.81 -0.96 -3.63 2.28 -4.17c-1.85 0.31 -3.93 -0.21 -4.5 -2.23c-0.17 -0.58 -0.45 -4.18 -0.45 -4.66c0 -2.43 2.14 -1.67 3.47 -0.68Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="80;0"/></path></svg>',
      topics: topics.slice(28, 36), // 8 topics: Business & Economics, Politics & Law, Religion & Philosophy, Cultural Integration, Environment, Media, Mythology & Fantasy, Celebrations & Holidays
      gridCols: 2
    },
    {
      name: "VETERAN FIELD",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="64" stroke-dashoffset="64" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l-9 3.5v6.5c0 3.5 3.5 9 8 10c4.5 -1 8 -6.5 8 -10v-6.5l-8 -3.5Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path></svg>',
      topics: topics.slice(36, 41), // 5 topics: Common Collocations, Modern Expressions, Formal Language, Verbs, Common Phrases
      gridCols: 2
    },
    {
      name: "MY WORDS",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3v18h18V3zm16 16H5V5h14zm-7-2h5v-2h-5zm0-4h5V9h-5zm-6 4h4v-6H6zm0-8h10V7H6z"/></svg>',
      topics: [], // No predefined topics - this is for custom word search
      gridCols: 1,
      isMyWords: true // Special flag for My Words section
    }
  ]

  // Enhanced touch handlers for drag gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return
    
    setTouchEnd(0) // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(false)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning) return
    
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    
    if (touchStart) {
      const diff = currentTouch - touchStart
      setIsDragging(true)
      
      // Limit drag distance to prevent over-scrolling
      const maxDrag = window.innerWidth * 0.3 // 30% of screen width
      const limitedDrag = Math.max(-maxDrag, Math.min(maxDrag, diff))
      setDragOffset(limitedDrag)
    }
  }

  const handleTouchEnd = () => {
    if (isTransitioning) return
    
    if (!touchStart || !touchEnd) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }
    
    const distance = touchStart - touchEnd
    const threshold = 80 // Minimum swipe distance
    const isLeftSwipe = distance > threshold
    const isRightSwipe = distance < -threshold

    setIsTransitioning(true)
    
    if (isLeftSwipe && currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
    } else if (isRightSwipe && currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
    
    // Reset drag state
    setIsDragging(false)
    setDragOffset(0)
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300)
  }

  // Mouse event handlers for desktop drag support
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isTransitioning) return
    
    setTouchEnd(0)
    setTouchStart(e.clientX)
    setIsDragging(false)
    setDragOffset(0)
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isTransitioning) return
      
      setTouchEnd(moveEvent.clientX)
      
      if (touchStart) {
        const diff = moveEvent.clientX - touchStart
        setIsDragging(true)
        
        const maxDrag = window.innerWidth * 0.3
        const limitedDrag = Math.max(-maxDrag, Math.min(maxDrag, diff))
        setDragOffset(limitedDrag)
      }
    }
    
    const handleMouseUp = () => {
      if (isTransitioning) return
      
      if (touchStart && touchEnd) {
        const distance = touchStart - touchEnd
        const threshold = 80
        const isLeftSwipe = distance > threshold
        const isRightSwipe = distance < -threshold

        setIsTransitioning(true)
        
        if (isLeftSwipe && currentSection < sections.length - 1) {
          setCurrentSection(currentSection + 1)
        } else if (isRightSwipe && currentSection > 0) {
          setCurrentSection(currentSection - 1)
        }
        
        setTimeout(() => setIsTransitioning(false), 300)
      }
      
      setIsDragging(false)
      setDragOffset(0)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const currentSectionData = sections[currentSection]

  return (
    <div className="h-full flex flex-col">
      {/* Section title */}
      <div className="mb-2 px-3 py-1 flex-shrink-0">
        <h2 className="font-medium flex items-center justify-center gap-2.5 text-white">
          <div 
            key={`section-icon-${iconKey}`}
            className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center" 
            style={{ color: 'currentColor' }}
            dangerouslySetInnerHTML={{ __html: currentSectionData.icon }}
          />
          <span className="text-lg sm:text-2xl tracking-wide leading-none">{currentSectionData.name}</span>
        </h2>
      </div>

      {/* Sliding container with drag support */}
      <div 
        className="flex-1 overflow-hidden px-2"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div 
          className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
          style={{ 
            transform: `translateX(${-currentSection * 100 + (dragOffset / window.innerWidth) * 100}%)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="w-full h-full flex-shrink-0 px-2 overflow-hidden">
              {/* Account section special content */}
              {section.isAccount ? (
                <div className="h-full flex flex-col space-y-2.5 sm:space-y-3">
                  {/* Progress Section with Real Data */}
                  {targetLanguageCode && (
                    <ProgressStats 
                      targetLanguageCode={targetLanguageCode}
                      targetLanguageName={targetLanguage}
                    />
                  )}

                  {/* Merged User Info, Subscription, and Sign Out */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 space-y-3 sm:space-y-4">
                    {/* User Profile Info */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                          <img 
                            src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <Icon icon="solar:user-bold" width="24" height="24" className="text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                          {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                        </h3>
                        <p className="text-white/70 text-xs sm:text-sm truncate">{user?.email}</p>
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-white font-medium text-sm sm:text-base flex items-center space-x-1.5 sm:space-x-2">
                        <Icon icon="solar:crown-bold" width="18" height="18" className="text-yellow-400 sm:w-5 sm:h-5" />
                        <span>Subscription</span>
                      </h4>
                      {isPremium ? (
                        <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white border border-yellow-500/30">
                          Premium
                        </div>
                      ) : (
                        <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-500/30 text-white/70 border border-gray-500/30">
                          Free
                        </div>
                      )}
                    </div>

                    {/* Upgrade Button (show only for free users) */}
                    {!isPremium && (
                      <button
                        onClick={() => setShowPaywall(true)}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-sm hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center space-x-2"
                      >
                        <Icon icon="solar:crown-bold" width="18" height="18" className="sm:w-5 sm:h-5" />
                        <span>Upgrade to Premium</span>
                      </button>
                    )}

                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-sm hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <Icon icon="solar:logout-3-bold" width="18" height="18" className="sm:w-5 sm:h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (section as any).isMyWords ? (
                /* MY WORDS section - Search and custom playlists */
                <div className="h-full flex flex-col gap-3 overflow-hidden">
                  {/* Search Word Card */}
                  <button
                    onClick={() => {
                      // Premium check - show paywall if not premium
                      if (!isPremium) {
                        setShowPaywall(true)
                        return
                      }
                      lastTopicSectionRef.current = currentSection
                      onTopicSelect({ id: -1, name: 'Search Word', icon: '' } as Topic)
                    }}
                    className="flex-shrink-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30 border-2 border-blue-400/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center hover:from-blue-500/40 hover:to-purple-600/40 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-2 right-2">
                        <Icon icon="solar:crown-bold" width="20" height="20" className="text-yellow-400" />
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-full flex items-center justify-center">
                        <Icon icon="solar:magnifer-bold" width="32" height="32" className="sm:w-10 sm:h-10 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-white text-lg sm:text-xl font-semibold">Search Word</p>
                        <p className="text-white/60 text-sm mt-1">Find any word & get translation</p>
                      </div>
                    </div>
                  </button>

                  {/* My Playlists Section - show 5 items then scroll */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 flex flex-col overflow-hidden max-h-[340px] min-h-[100px]">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-white font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Icon icon="solar:playlist-bold" width="20" height="20" className="text-purple-400" />
                        My Playlists
                      </h3>
                      <button 
                        onClick={onCreatePlaylist}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                      >
                        <Icon icon="solar:add-circle-bold" width="20" height="20" className="text-white/80" />
                      </button>
                    </div>
                    
                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                      {/* Loading state */}
                      {isLoadingPlaylists && (
                        <div className="text-center py-6">
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-white/50 text-sm">Loading playlists...</p>
                        </div>
                      )}
                      
                      {/* Empty state */}
                      {!isLoadingPlaylists && userPlaylists.length === 0 && (
                        <div className="text-center py-6">
                          <Icon icon="solar:folder-with-files-bold-duotone" width="48" height="48" className="text-white/30 mx-auto mb-3" />
                          <p className="text-white/50 text-sm">No playlists yet</p>
                          <p className="text-white/40 text-xs mt-1">Search words and add them to playlists</p>
                        </div>
                      )}
                      
                      {/* Playlist items */}
                      {!isLoadingPlaylists && userPlaylists.length > 0 && (
                        <div className="space-y-2 pr-1">
                          {userPlaylists.map((playlist) => (
                            <button
                              key={playlist.id}
                              onClick={() => {
                                // Open playlist learning view
                                lastTopicSectionRef.current = currentSection
                                onTopicSelect({ id: -2, name: playlist.name, icon: '', playlistId: playlist.id } as any)
                              }}
                              className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-left"
                            >
                              <Icon icon={playlist.icon || "solar:playlist-minimalistic-linear"} width="22" height="22" className="text-purple-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{playlist.name}</p>
                                <p className="text-white/50 text-xs">{playlist.word_count || 0} words</p>
                              </div>
                              <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" className="text-white/40 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular topic grid for all other sections */
                <div 
                  className={`grid gap-2.5 sm:gap-3 h-full content-start ${
                    section.gridCols === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {section.topics.map(renderTopicButton)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation dots - enhanced visibility with drag feedback */}
      <div className="flex justify-center gap-3 mt-3 pb-2 flex-shrink-0">
        {sections.map((section, index) => {
          // Calculate opacity based on drag position for visual feedback
          let opacity = index === currentSection ? 1 : 0.4
          if (isDragging && dragOffset !== 0) {
            const dragDirection = dragOffset > 0 ? -1 : 1 // Opposite direction of content
            const targetSection = currentSection + dragDirection
            if (index === targetSection && Math.abs(dragOffset) > 40) {
              opacity = 0.7 // Preview next section
            }
          }
          
          return (
            <button
              key={index}
              onClick={() => {
                if (!isDragging && !isTransitioning) {
                  setIsTransitioning(true)
                  setCurrentSection(index)
                  setTimeout(() => setIsTransitioning(false), 300)
                }
              }}
              className={`relative transition-all duration-300 ${
                index === currentSection 
                  ? 'w-3 h-3 bg-white rounded-full shadow-lg' 
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60 rounded-full'
              }`}
              style={{ opacity }}
              title={section.name}
            >
              {/* Add text labels for first two sections */}
              {index === 0 && (
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/80 whitespace-nowrap">
                  Account
                </span>
              )}
              {index === 1 && (
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/80 whitespace-nowrap">
                  First Aid
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type PageState = "native" | "target" | "confirmation" | "learning"

export function LanguageSelector() {
  // Custom sign out handler that resets to first page
  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // First, reset all local state immediately to prevent UI issues
      setCurrentPage("native")
      setNativeLanguage("")
      setNativeLanguageCode("")
      setTargetLanguage("")
      setTargetLanguageCode("")
      setSelectedTopic(null)
      setQuestionText("What language do you speak?")
      setShowSettings(false)
      
      // Clear any stored language preferences
      localStorage.removeItem('nativeLanguage')
      localStorage.removeItem('nativeLanguageCode')
      localStorage.removeItem('targetLanguage')
      localStorage.removeItem('targetLanguageCode')
      localStorage.removeItem('currentPage')
      localStorage.removeItem('prePaymentState')
      
      // Then sign out from authentication
      await signOut()
      
      console.log('Sign out process completed')
      
      // The welcome overlay will automatically appear due to the auth context
    } catch (error) {
      console.error('Sign out failed:', error)
      // Even if sign out fails, reset the local state
      setCurrentPage("native")
      setQuestionText("What language do you speak?")
    }
  }

  const { user, signOut, signInWithGoogle, isPremium, canAccessTopic, refreshSubscription, loading } = useAuth()
  const [showPaywall, setShowPaywall] = useState(false)

  // Debug auth state
  useEffect(() => {
    console.log('🔍 Auth state:', { 
      user: !!user,
      isPremium
    })
  }, [user, isPremium])
  const [currentPage, setCurrentPage] = useState<PageState>("native")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [nativeLanguage, setNativeLanguage] = useState("")
  const [nativeLanguageCode, setNativeLanguageCode] = useState("")
  const [targetLanguage, setTargetLanguage] = useState("")
  const [targetLanguageCode, setTargetLanguageCode] = useState("")
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [questionText, setQuestionText] = useState("What language do you speak?")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [currentSection, setCurrentSection] = useState(1) // Start with FIRST AID KIT (index 1)
  const lastTopicSectionRef = useRef(1) // Track which section the user was on when selecting a topic
  const [phonetics, setPhonetics] = useState<Record<string, { target: string; native: string }>>({})
  
  // Playlist state for MY WORDS section
  const [userPlaylists, setUserPlaylists] = useState<Array<{
    id: string
    name: string
    icon: string
    word_count?: number
    source_language_code: string
    target_language_code: string
  }>>([])
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  
  // Autoplay state machine
  const autoplayAbortController = useRef<AbortController | null>(null)
  const isAutoplayActive = useRef(false)
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  const [settings, setSettings] = useState({
    autoPlay: true, // Auto-play enabled by default as requested
    trainingLanguageVoice: "Male" as "Female" | "Male", // Changed to Male
    mainLanguageVoice: "Male" as "Female" | "Male",
    pronunciationSpeed: "Normal" as "Slow" | "Normal" | "Fast",
    pauseBetweenTranslations: 0.5, // 0.5 seconds by default
    pauseForNextWord: 0.7, // 0.7 seconds by default
    repeatTargetLanguage: 1, // 1x by default
    repeatMainLanguage: 1, // 1x by default
    playTargetOnly: false, // Play only target language (skip native translation)
    showPhonetics: false, // Show IPA phonetic pronunciations below words
  })

  // Load user settings from database
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.id) return
      
      try {
        console.log('📥 Loading user settings from database...')
        const response = await fetch('/api/settings')
        
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setSettings(data.settings)
            console.log('✅ User settings loaded:', data.settings)
          }
        } else {
          console.log('⚠️ Failed to load settings, using defaults')
        }
      } catch (error) {
        console.error('❌ Error loading user settings:', error)
      }
    }

    loadUserSettings()
  }, [user?.id])

  // 🍎 iOS Detection for Glass Effect Override
  useEffect(() => {
    const detectIOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isCapacitor = !!(window as any).Capacitor;
      setIsIOS(isIOSDevice || isCapacitor);
      
      if (isIOSDevice || isCapacitor) {
        console.log('🍎 iOS/Capacitor detected - applying glass effect overrides');
        document.documentElement.classList.add('ios-device');
      }
    };
    
    detectIOS();
  }, []);

  // 🎉 Restore language selection after successful payment return
  useEffect(() => {
    const restoreAfterPayment = () => {
      // Check both old and new flag names for compatibility
      const shouldRestore = localStorage.getItem('restoreLanguages') === 'true' || 
                           localStorage.getItem('restoreToTopicView') === 'true'
      
      if (shouldRestore) {
        console.log('🎉 Restoring language selection after payment success')
        
        // Get saved language codes
        const savedNativeCode = localStorage.getItem('nativeLanguageCode')
        const savedTargetCode = localStorage.getItem('targetLanguageCode')
        
        // Clean up all restoration flags
        localStorage.removeItem('restoreLanguages')
        localStorage.removeItem('restoreToTopicView')
        
        if (savedNativeCode && savedTargetCode) {
          // Helper to get language name from code
          const getLanguageName = (code: string): string => {
            const languageNames: { [key: string]: string } = {
              'ar': 'Arabic', 'bg': 'Bulgarian', 'bn': 'Bengali', 'ca': 'Catalan',
              'cs': 'Czech', 'cy': 'Welsh', 'da': 'Danish', 'de': 'German',
              'el': 'Greek', 'en': 'English', 'es': 'Spanish', 'et': 'Estonian',
              'eu': 'Basque', 'fa': 'Persian', 'fi': 'Finnish', 'fr': 'French',
              'ga': 'Irish', 'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi',
              'hr': 'Croatian', 'hu': 'Hungarian', 'id': 'Indonesian', 'is': 'Icelandic',
              'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'lt': 'Lithuanian',
              'lv': 'Latvian', 'mk': 'Macedonian', 'ml': 'Malayalam', 'mr': 'Marathi',
              'mt': 'Maltese', 'nl': 'Dutch', 'no': 'Norwegian', 'pl': 'Polish',
              'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian', 'sk': 'Slovak',
              'sl': 'Slovenian', 'sv': 'Swedish', 'ta': 'Tamil', 'te': 'Telugu',
              'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu',
              'vi': 'Vietnamese', 'zh': 'Chinese'
            }
            return languageNames[code] || code
          }
          
          // Restore language state
          setNativeLanguageCode(savedNativeCode)
          setNativeLanguage(getLanguageName(savedNativeCode))
          setTargetLanguageCode(savedTargetCode)
          setTargetLanguage(getLanguageName(savedTargetCode))
          
          // Navigate directly to confirmation (topic slider)
          setCurrentPage('confirmation')
          console.log('✅ Restored to topic slider with languages:', savedNativeCode, '→', savedTargetCode)
        }
      }
    }
    
    // Check on mount
    restoreAfterPayment()
  }, [])

  // 📊 Set global variables for progress tracking in audio service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__vocaWorldUserId = user?.id || null;
      (window as any).__vocaWorldTargetLangCode = targetLanguageCode || null;
      console.log('📊 Progress tracking globals set:', {
        userId: user?.id,
        targetLangCode: targetLanguageCode
      });
    }
  }, [user?.id, targetLanguageCode]);

  // 📋 Fetch playlists function - can be called from child components
  const refreshPlaylists = useCallback(async () => {
    if (!user?.id || !nativeLanguageCode || !targetLanguageCode) return
    
    console.log('🔄 Refreshing playlists...')
    setIsLoadingPlaylists(true)
    try {
      const response = await fetch(
        `/api/playlists?userId=${user.id}&sourceLanguageCode=${nativeLanguageCode}&targetLanguageCode=${targetLanguageCode}`
      )
      if (response.ok) {
        const data = await response.json()
        setUserPlaylists(data.playlists || [])
        console.log('✅ Playlists refreshed:', data.playlists?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }, [user?.id, nativeLanguageCode, targetLanguageCode])

  // 📋 Fetch playlists when MY WORDS section is visible or languages change
  useEffect(() => {
    // MY WORDS section is index 7 (8th section, 0-based)
    const MY_WORDS_SECTION_INDEX = 7
    if (currentSection !== MY_WORDS_SECTION_INDEX) return
    
    refreshPlaylists()
  }, [currentSection, refreshPlaylists]);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudioStep, setCurrentAudioStep] = useState<'training' | 'main' | 'pause' | 'idle'>('idle')
  // User interaction tracking to prevent auto-play on page load
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [autoPlayActive, setAutoPlayActive] = useState(false)
  
  // Ref to track auto-play state for cancellation
  const autoPlayRef = useRef(false)
  
  // Audio call tracking to prevent rapid concurrent calls
  const audioCallInProgress = useRef(false)
  const lastAudioCallTime = useRef(0)
  
  // Position save debounce ref
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Settings save debounce ref
  const saveSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // B2 Audio service state
  const [activeAudioService, setActiveAudioService] = useState<string>("None")

  // 🌍 UNIVERSAL LANGUAGE CODE MAPPING - All 47 Azure Languages + Alnilam
  const getLanguageCode = (languageName: string): string => {
    const languageMap: { [key: string]: string } = {
      // ✅ Phase 1B Complete (7 languages)
      'Swedish': 'sv-SE',
      'Norwegian': 'nb-NO', 
      'Danish': 'da-DK',
      'Hebrew': 'he-IL',
      'Chinese': 'zh-CN',
      'Mandarin': 'zh-CN',
      'Finnish': 'fi-FI',
      'Czech': 'cs-CZ',

      // 🚀 Phase 2 - Western European (6 languages)
      'German': 'de-DE',
      'French': 'fr-FR',
      'Spanish': 'es-ES',
      'Italian': 'it-IT',
      'Portuguese': 'pt-PT',
      'Dutch': 'nl-NL',

      // 🌍 Phase 2 - Eastern European (6 languages)
      'Russian': 'ru-RU',
      'Polish': 'pl-PL',
      'Ukrainian': 'uk-UA',
      'Hungarian': 'hu-HU',
      'Romanian': 'ro-RO',
      'Bulgarian': 'bg-BG',

      // 🥢 Phase 2 - Asian Languages (8 languages)
      'Japanese': 'ja-JP',
      'Korean': 'ko-KR',
      'Thai': 'th-TH',
      'Vietnamese': 'vi-VN',
      'Hindi': 'hi-IN',
      'Bengali': 'bn-IN',
      'Tamil': 'ta-IN',
      'Telugu': 'te-IN',

      // 🕌 Phase 2 - Middle Eastern & Others (6 languages)
      'Arabic': 'ar-SA',
      'Turkish': 'tr-TR',
      'Persian': 'fa-IR',
      'Farsi': 'fa-IR',
      'Urdu': 'ur-PK',
      'Malayalam': 'ml-IN',
      'Gujarati': 'gu-IN',

      // 🌟 Phase 3 - Additional European & Others (14 languages)
      'Croatian': 'hr-HR',
      'Slovak': 'sk-SK',
      'Slovenian': 'sl-SI',
      'Lithuanian': 'lt-LT',
      'Latvian': 'lv-LV',
      'Estonian': 'et-EE',
      'Greek': 'el-GR',
      'Maltese': 'mt-MT',
      'Macedonian': 'mk-MK',
      'Icelandic': 'is-IS',
      'Irish': 'ga-IE',
      'Welsh': 'cy-GB',
      'Basque': 'eu-ES',
      'Catalan': 'ca-ES',

      // 🎵 Alnilam Library Languages (22 languages)
      'English': 'en-US',
      'Indonesian': 'id-ID',
      'Marathi': 'mr-IN',

      // Additional Azure variants
      'Malay': 'ms-MY',
      'Serbian': 'sr-RS',
    }
    return languageMap[languageName] || 'en-US'
  }

  // Get flag icon for language code using Flag Icons pack
  const getFlagIcon = (languageCode: string): string => {
    const flagMap: { [key: string]: string } = {
      'ar': 'flag:sa-1x1', // Arabic -> Saudi Arabia
      'bg': 'flag:bg-1x1', // Bulgarian -> Bulgaria
      'bn': 'flag:bd-1x1', // Bengali -> Bangladesh
      'ca': 'flag:es-ct-1x1', // Catalan -> Catalonia (Spain)
      'cs': 'flag:cz-1x1', // Czech -> Czech Republic
      'cy': 'flag:gb-wls-1x1', // Welsh -> Wales
      'da': 'flag:dk-1x1', // Danish -> Denmark
      'de': 'flag:de-1x1', // German -> Germany
      'el': 'flag:gr-1x1', // Greek -> Greece
      'en': 'flag:us-1x1', // English -> United States
      'es': 'flag:es-1x1', // Spanish -> Spain
      'et': 'flag:ee-1x1', // Estonian -> Estonia
      'eu': 'flag:es-pv-1x1', // Basque -> Basque Country
      'fa': 'flag:ir-1x1', // Persian -> Iran
      'fi': 'flag:fi-1x1', // Finnish -> Finland
      'fr': 'flag:fr-1x1', // French -> France
      'ga': 'flag:ie-1x1', // Irish -> Ireland
      'gu': 'flag:in-1x1', // Gujarati -> India
      'he': 'flag:il-1x1', // Hebrew -> Israel
      'hi': 'flag:in-1x1', // Hindi -> India
      'hr': 'flag:hr-1x1', // Croatian -> Croatia
      'hu': 'flag:hu-1x1', // Hungarian -> Hungary
      'id': 'flag:id-1x1', // Indonesian -> Indonesia
      'is': 'flag:is-1x1', // Icelandic -> Iceland
      'it': 'flag:it-1x1', // Italian -> Italy
      'ja': 'flag:jp-1x1', // Japanese -> Japan
      'ko': 'flag:kr-1x1', // Korean -> South Korea
      'lt': 'flag:lt-1x1', // Lithuanian -> Lithuania
      'lv': 'flag:lv-1x1', // Latvian -> Latvia
      'mk': 'flag:mk-1x1', // Macedonian -> North Macedonia
      'ml': 'flag:in-1x1', // Malayalam -> India
      'mr': 'flag:in-1x1', // Marathi -> India
      'mt': 'flag:mt-1x1', // Maltese -> Malta
      'nl': 'flag:nl-1x1', // Dutch -> Netherlands
      'no': 'flag:no-1x1', // Norwegian -> Norway
      'pl': 'flag:pl-1x1', // Polish -> Poland
      'pt': 'flag:pt-1x1', // Portuguese -> Portugal
      'ro': 'flag:ro-1x1', // Romanian -> Romania
      'ru': 'flag:ru-1x1', // Russian -> Russia
      'sk': 'flag:sk-1x1', // Slovak -> Slovakia
      'sl': 'flag:si-1x1', // Slovenian -> Slovenia
      'sv': 'flag:se-1x1', // Swedish -> Sweden
      'ta': 'flag:in-1x1', // Tamil -> India
      'te': 'flag:in-1x1', // Telugu -> India
      'th': 'flag:th-1x1', // Thai -> Thailand
      'tr': 'flag:tr-1x1', // Turkish -> Turkey
      'uk': 'flag:ua-1x1', // Ukrainian -> Ukraine
      'ur': 'flag:pk-1x1', // Urdu -> Pakistan
      'vi': 'flag:vn-1x1', // Vietnamese -> Vietnam
      'zh': 'flag:cn-1x1', // Chinese -> China
    }
    return flagMap[languageCode] || 'flag:us-1x1'
  }

  // Speech speed mapping
  const getSpeedRate = (speed: string): number => {
    let rate: number
    switch (speed) {
      case 'Slow': rate = 0.7; break
      case 'Fast': rate = 1.3; break
      default: rate = 1.0 // Normal
    }
    console.log(`getSpeedRate: ${speed} -> ${rate}`)
    return rate
  }

  // B2 Audio Service Integration
  const [alnilamService, setAlnilamService] = useState<any>(null)
  
  // Audio control for immediate stopping
  const [currentAudioElements, setCurrentAudioElements] = useState<HTMLAudioElement[]>([])
  const audioElementsRef = useRef<HTMLAudioElement[]>([])
  const stopRequestedRef = useRef(false)
  
  // 🔊 MOBILE FIX V3: Use Web Audio API with a persistent AudioContext
  // This approach keeps the AudioContext unlocked after the first user gesture
  // and routes all audio through it for reliable mobile playback
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioUnlockedRef = useRef(false)
  
  // Initialize Web Audio API context on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('🔊 Web Audio API context created, state:', audioContextRef.current.state)
      } catch (e) {
        console.log('⚠️ Failed to create AudioContext:', e)
      }
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])
  
  // 🔓 Unlock AudioContext on user interaction (for mobile autoplay policy)
  const unlockAudio = async () => {
    if (audioUnlockedRef.current) return true
    
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      
      // Resume the AudioContext (this is what unlocks it on mobile)
      if (ctx.state === 'suspended') {
        await ctx.resume()
        console.log('🔓 AudioContext resumed, state:', ctx.state)
      }
      
      // Create and play a short silent buffer to fully unlock
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      
      audioUnlockedRef.current = true
      console.log('🔓 Audio unlocked for mobile playback via Web Audio API')
      return true
    } catch (error) {
      console.log('⚠️ Audio unlock failed:', error)
      return false
    }
  }
  
  // 🔊 Play audio through Web Audio API for reliable mobile playback
  const playAudioWithWebAudio = (url: string, playbackRate: number = 1.0): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure AudioContext is resumed
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        // Fetch the audio file
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        
        // Check if stop was requested during fetch
        if (stopRequestedRef.current) {
          reject(new DOMException('Audio fetch aborted', 'AbortError'))
          return
        }
        
        // Decode the audio data
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
        
        // Check again after decode
        if (stopRequestedRef.current) {
          reject(new DOMException('Audio decode aborted', 'AbortError'))
          return
        }
        
        // Create and play the buffer source
        const source = audioContextRef.current!.createBufferSource()
        source.buffer = audioBuffer
        source.playbackRate.value = playbackRate
        source.connect(audioContextRef.current!.destination)
        
        source.onended = () => resolve()
        source.start(0)
        
        console.log('🎵 Playing via Web Audio API at', playbackRate, 'x speed')
        
      } catch (error) {
        console.error('Web Audio playback error:', error)
        reject(error)
      }
    })
  }
  
  // Fallback: regular HTML Audio element playback
  const playAudioFallback = (url: string, playbackRate: number = 1.0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.crossOrigin = 'anonymous'
      audio.playbackRate = playbackRate
      audioElementsRef.current.push(audio)
      
      const cleanup = () => {
        audioElementsRef.current = audioElementsRef.current.filter(a => a !== audio)
      }
      
      audio.onended = () => { cleanup(); resolve() }
      audio.onerror = (e) => { cleanup(); reject(e) }
      
      audio.play().catch(reject)
    })
  }
  
  // Combined audio player - tries Web Audio first, falls back to HTML Audio
  const playAudioUniversal = async (url: string, playbackRate: number = 1.0): Promise<void> => {
    // If Web Audio is available and unlocked, use it
    if (audioContextRef.current && audioUnlockedRef.current) {
      try {
        await playAudioWithWebAudio(url, playbackRate)
        return
      } catch (error) {
        console.log('⚠️ Web Audio failed, trying fallback:', error)
      }
    }
    
    // Fallback to HTML Audio
    await playAudioFallback(url, playbackRate)
  }
  
  // Audio request queue to prevent concurrent B2 API calls
  const audioRequestQueue = useRef<Array<() => Promise<void>>>([])
  const isProcessingAudioQueue = useRef(false)
  
  // Process audio queue one at a time to prevent browser rate limiting
  const processAudioQueue = async () => {
    if (isProcessingAudioQueue.current || audioRequestQueue.current.length === 0) {
      return
    }
    
    isProcessingAudioQueue.current = true
    
    while (audioRequestQueue.current.length > 0 && !stopRequestedRef.current) {
      const audioRequest = audioRequestQueue.current.shift()
      if (audioRequest) {
        try {
          await audioRequest()
          // Small delay between requests to prevent browser overwhelm
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error('Audio queue request failed:', error)
        }
      }
    }
    
    isProcessingAudioQueue.current = false
  }
  
  // Queue an audio request instead of making it immediately
  const queueAudioRequest = (audioRequest: () => Promise<void>) => {
    audioRequestQueue.current.push(audioRequest)
    processAudioQueue()
  }

  // Initialize Audio Service (uses /api/universal-audio backed by B2)
  useEffect(() => {
    const initAlnilam = () => {
      try {
        console.log('🚀 Starting Alnilam service initialization...') // Updated for debugging
        console.log('🔍 initAlnilam function called - checking environment');
        
        // Create service directly with all needed methods
        const alnilamAudioService = {
          async playWordSequence(sourceWord: string, targetWord: string, settings: any, wordId: string, sourceLanguage: string, targetLanguage: string, englishWord?: string) {
            console.log('🎵 Alnilam playWordSequence called:', {
              sourceWord, targetWord, sourceLanguage, targetLanguage, wordId, englishWord
            });

            // Get abort signal from the current autoplay session
            const abortSignal = autoplayAbortController.current?.signal;

            try {
              // Check abort at entry
              if (abortSignal?.aborted || stopRequestedRef.current) {
                console.log('🛑 Playback aborted at entry');
                return false;
              }
              
              // Clear any existing audio elements
              audioElementsRef.current.forEach(audio => {
                try {
                  audio.pause();
                  audio.src = '';
                } catch (e) {}
              });
              audioElementsRef.current = [];

              // Convert language names to codes - All 49 languages with B2 audio support
              const languageMappings = {
                // All languages with B2/Alnilam audio support (use simple ISO codes)
                'Arabic': 'ar', 'Basque': 'eu', 'Bengali': 'bn', 'Bulgarian': 'bg',
                'Catalan': 'ca', 'Chinese': 'zh', 'Croatian': 'hr', 'Czech': 'cs',
                'Danish': 'da', 'Dutch': 'nl', 'English': 'en', 'Estonian': 'et',
                'Finnish': 'fi', 'French': 'fr', 'German': 'de', 'Greek': 'el',
                'Gujarati': 'gu', 'Hebrew': 'he', 'Hindi': 'hi', 'Hungarian': 'hu',
                'Icelandic': 'is', 'Indonesian': 'id', 'Irish': 'ga', 'Italian': 'it',
                'Japanese': 'ja', 'Korean': 'ko', 'Latvian': 'lv', 'Lithuanian': 'lt',
                'Macedonian': 'mk', 'Malayalam': 'ml', 'Maltese': 'mt', 'Marathi': 'mr',
                'Norwegian': 'no', 'Persian': 'fa', 'Polish': 'pl', 'Portuguese': 'pt',
                'Romanian': 'ro', 'Russian': 'ru', 'Slovak': 'sk', 'Slovenian': 'sl',
                'Spanish': 'es', 'Swedish': 'sv', 'Tamil': 'ta', 'Telugu': 'te',
                'Thai': 'th', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Urdu': 'ur',
                'Vietnamese': 'vi', 'Welsh': 'cy'
              };

              const sourceLangCode = (languageMappings as any)[sourceLanguage] || sourceLanguage.toLowerCase();
              const targetLangCode = (languageMappings as any)[targetLanguage] || targetLanguage.toLowerCase();

              console.log(`🌟 Playing Alnilam audio: TARGET FIRST ${targetWord} (${targetLangCode}) → THEN SOURCE ${sourceWord} (${sourceLangCode})`);

              // Helper function: Interruptible sleep that respects abort signal
              const abortableSleep = (ms: number): Promise<void> => {
                return new Promise((resolve, reject) => {
                  const timeoutId = setTimeout(() => resolve(), ms);
                  
                  // If abort signal exists, listen for abort
                  if (abortSignal) {
                    const abortHandler = () => {
                      clearTimeout(timeoutId);
                      reject(new DOMException('Sleep aborted', 'AbortError'));
                    };
                    abortSignal.addEventListener('abort', abortHandler, { once: true });
                  }
                  
                  // Also check stopRequestedRef
                  const checkInterval = setInterval(() => {
                    if (stopRequestedRef.current || abortSignal?.aborted) {
                      clearTimeout(timeoutId);
                      clearInterval(checkInterval);
                      reject(new DOMException('Sleep aborted', 'AbortError'));
                    }
                  }, 50); // Check every 50ms
                  
                  // Clean up interval when done
                  setTimeout(() => clearInterval(checkInterval), ms);
                });
              };

              // Helper function: Play audio with abort support
              // 🔊 MOBILE FIX: Use persistent audio element OR fallback to new Audio
              const playAudioWithAbort = (audio: HTMLAudioElement, description: string, playbackRate: number = 1.0): Promise<void> => {
                return new Promise((resolve, reject) => {
                  // Check abort before starting
                  if (abortSignal?.aborted || stopRequestedRef.current) {
                    reject(new DOMException('Audio playback aborted', 'AbortError'));
                    return;
                  }

                  const timeout = setTimeout(() => {
                    reject(new Error(`Audio timeout for ${description}`));
                  }, 10000);
                  
                  const cleanup = () => {
                    clearTimeout(timeout);
                    audio.onended = null;
                    audio.onerror = null;
                    audio.oncanplaythrough = null;
                    audioElementsRef.current = audioElementsRef.current.filter(a => a !== audio);
                  };
                  
                  audio.onended = () => {
                    cleanup();
                    resolve();
                  };
                  
                  audio.onerror = (error) => {
                    cleanup();
                    reject(error);
                  };
                  
                  audio.oncanplaythrough = () => {
                    // Double-check abort before playing
                    if (abortSignal?.aborted || stopRequestedRef.current) {
                      cleanup();
                      reject(new DOMException('Audio playback aborted', 'AbortError'));
                      return;
                    }
                    // CRITICAL: Set playbackRate right before play to ensure it's applied
                    audio.playbackRate = playbackRate;
                    console.log(`🎚️ Playing ${description} at speed ${playbackRate}x`);
                    audio.play().catch((playError) => {
                      // 🔊 MOBILE FIX: If play fails, try to recover
                      console.log(`⚠️ Play failed for ${description}, error:`, playError);
                      cleanup();
                      reject(playError);
                    });
                  };
                  
                  // Listen for abort signal during playback
                  if (abortSignal) {
                    abortSignal.addEventListener('abort', () => {
                      audio.pause();
                      cleanup();
                      reject(new DOMException('Audio playback aborted', 'AbortError'));
                    }, { once: true });
                  }
                  
                  // Also poll stopRequestedRef during playback
                  const checkInterval = setInterval(() => {
                    if (stopRequestedRef.current || abortSignal?.aborted) {
                      clearInterval(checkInterval);
                      audio.pause();
                      cleanup();
                      reject(new DOMException('Audio playback aborted', 'AbortError'));
                    }
                  }, 100);
                  
                  audio.addEventListener('ended', () => clearInterval(checkInterval), { once: true });
                  audio.addEventListener('error', () => clearInterval(checkInterval), { once: true });
                  
                  // Load the audio
                  audio.load();
                });
              };
              
              // 🔊 MOBILE FIX V3: Use Web Audio API for reliable mobile playback
              // Falls back to HTML Audio if Web Audio fails
              const playAudioUrl = async (url: string, description: string, playbackRate: number = 1.0): Promise<void> => {
                // Check abort before starting
                if (abortSignal?.aborted || stopRequestedRef.current) {
                  throw new DOMException('Audio playback aborted', 'AbortError');
                }
                
                // Try Web Audio API first (more reliable on mobile)
                if (audioContextRef.current && audioUnlockedRef.current) {
                  try {
                    console.log(`🎵 Playing via Web Audio: ${description}`);
                    await playAudioWithWebAudio(url, playbackRate);
                    return;
                  } catch (error: any) {
                    if (error.name === 'AbortError') throw error;
                    console.log('⚠️ Web Audio failed, trying HTML Audio fallback');
                  }
                }
                
                // Fallback to HTML Audio
                console.log(`🎵 Playing via HTML Audio: ${description}`);
                const audio = new Audio(url);
                audio.crossOrigin = 'anonymous';
                audio.preload = 'auto';
                audioElementsRef.current.push(audio);
                
                await playAudioWithAbort(audio, description, playbackRate);
              };

              // CRITICAL: Enable audio context for autoplay policy
              try {
                // Try to resume AudioContext if it's suspended (autoplay policy)
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  console.log('🔓 Resuming AudioContext for autoplay...');
                  await audioContextRef.current.resume();
                }
              } catch (audioContextError) {
                console.log('⚠️ AudioContext resume failed (might be normal):', (audioContextError as Error).message);
              }

              // 🔧 UNIVERSAL AUDIO ROUTING - Supports all 47 Azure languages + Alnilam
              // Now includes optional 'word' parameter for Verbs topic word-based lookup
              // Also includes 'targetWord' parameter for cy/ga/mt Common Phrases lookup
              const getAudioUrl = (wordId: string | number, languageCode: string, englishWord?: string, targetWordForAudio?: string) => {
                console.log(`🌍 Using Universal Audio API for ${languageCode}`, { wordId, englishWord, targetWordForAudio });
                let url = `/api/universal-audio?wordId=${wordId}&languageCode=${languageCode}`;
                if (englishWord) {
                  url += `&word=${encodeURIComponent(englishWord)}`;
                }
                if (targetWordForAudio) {
                  url += `&targetWord=${encodeURIComponent(targetWordForAudio)}`;
                }
                return url;
              };

              // IMPROVED: Play audio with queuing to prevent browser overwhelm
              const playAudioWithQueue = async (url: string, description: string): Promise<void> => {
                return new Promise((resolve, reject) => {
                  queueAudioRequest(async () => {
                    try {
                      // Check if stop was requested
                      if (stopRequestedRef.current) {
                        console.log(`🛑 Stop requested during ${description}`);
                        resolve();
                        return;
                      }
                      
                      console.log(`🎯 Loading ${description}: ${url}`);
                      
                      // 🔊 MOBILE FIX V3: Use Web Audio API for reliable playback
                      const speedRate = getSpeedRate(settings.pronunciationSpeed || 'Normal');
                      
                      await playAudioUrl(url, description, speedRate);
                      resolve();
                    } catch (error) {
                      reject(error);
                    }
                  });
                });
              };

              // FIXED ORDER: Play TARGET language first (what user is learning)
              // Note: sourceWord actually contains the LEARNING language translation (inverted naming in vocabulary API)
              if (wordId && targetLangCode) {
                const targetUrl = getAudioUrl(wordId, targetLangCode, englishWord, sourceWord);
                console.log(`🎯 Loading TARGET audio FIRST: ${targetUrl}`);
                
                // Set visual indicator for target language
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('training');
                }
                
                // FIXED MAPPING: Target language repeats (what user is learning)
                const targetRepeats = settings?.repeatTargetLanguage || 1;
                for (let i = 0; i < targetRepeats; i++) {
                  // Check if stop was requested or aborted
                  if (abortSignal?.aborted || stopRequestedRef.current) {
                    console.log('🛑 Stop requested during target audio');
                    throw new DOMException('Target audio aborted', 'AbortError');
                  }
                  
                  try {
                    // 🔊 MOBILE FIX V3: Use Web Audio API for reliable playback
                    const speedRate = getSpeedRate(settings.pronunciationSpeed || 'Normal');
                    console.log(`🎚️ Speed setting: ${settings.pronunciationSpeed} -> rate: ${speedRate}`);
                    
                    await playAudioUrl(targetUrl, `TARGET ${targetWord} - Repeat ${i + 1}`, speedRate);
                    console.log(`✅ TARGET audio played: ${targetWord} (${targetLangCode}) - Repeat ${i + 1}/${targetRepeats}`);
                    
                    // Small pause between repeats (except after last repeat)
                    if (i < targetRepeats - 1) {
                      await abortableSleep(300);
                    }
                  } catch (error: any) {
                    if (error.name === 'AbortError') {
                      console.log(`🛑 TARGET audio aborted: ${targetWord}`);
                      throw error; // Re-throw to exit the loop
                    }
                    console.log(`⚠️ TARGET audio failed: ${targetWord} (${targetLangCode}) - Repeat ${i + 1}`, error);
                    await abortableSleep(500); // Brief pause before retry
                  }
                }

                // Pause between translations
                if (settings?.pauseBetweenTranslations) {
                  await abortableSleep(settings.pauseBetweenTranslations * 1000);
                }
              }

              // Check if stop was requested between target and source
              if (abortSignal?.aborted || stopRequestedRef.current) {
                console.log('🛑 Stop requested between target and source');
                throw new DOMException('Playback aborted between languages', 'AbortError');
              }

              // FIXED ORDER: Play SOURCE language second (native/main language)
              // Note: targetWord actually contains the NATIVE language translation (inverted naming in vocabulary API)
              // Skip source audio if playTargetOnly is enabled
              if (settings?.playTargetOnly) {
                console.log('⏭️ Skipping source audio (playTargetOnly enabled) - playing only target language');
              } else if (wordId && sourceLangCode) {
                const sourceUrl = getAudioUrl(wordId, sourceLangCode, englishWord, targetWord);
                console.log(`🎵 Loading SOURCE audio SECOND: ${sourceUrl}`);
                
                // Set visual indicator for source language
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('main');
                }
                
                // FIXED MAPPING: Source language repeats (main/native language)
                const sourceRepeats = settings?.repeatMainLanguage || 1;
                for (let i = 0; i < sourceRepeats; i++) {
                  // Check if stop was requested or aborted
                  if (abortSignal?.aborted || stopRequestedRef.current) {
                    console.log('🛑 Stop requested during source audio');
                    throw new DOMException('Source audio aborted', 'AbortError');
                  }
                  
                  try {
                    // 🔊 MOBILE FIX V3: Use Web Audio API for reliable playback
                    const speedRate = getSpeedRate(settings.pronunciationSpeed || 'Normal');
                    
                    await playAudioUrl(sourceUrl, `SOURCE ${sourceWord} - Repeat ${i + 1}`, speedRate);
                    console.log(`✅ SOURCE audio played: ${sourceWord} (${sourceLangCode}) - Repeat ${i + 1}/${sourceRepeats}`);
                    
                    // Small pause between repeats (except after last repeat)
                    if (i < sourceRepeats - 1) {
                      await abortableSleep(300);
                    }
                  } catch (error: any) {
                    if (error.name === 'AbortError') {
                      console.log(`🛑 SOURCE audio aborted: ${sourceWord}`);
                      throw error; // Re-throw to exit the loop
                    }
                    console.log(`⚠️ SOURCE audio failed: ${sourceWord} (${sourceLangCode}) - Repeat ${i + 1}`, error);
                    await abortableSleep(500); // Brief pause before retry
                  }
                }
              }

              console.log('🎉 Alnilam sequence completed successfully');
              
              // Track word progress when audio completes successfully
              // Get user from context - we'll need to access user state
              const userId = (window as any).__vocaWorldUserId;
              const userTargetLangCode = (window as any).__vocaWorldTargetLangCode;
              
              if (userId && wordId && userTargetLangCode) {
                try {
                  const response = await fetch('/api/progress/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: userId,
                      vocabularyId: wordId,
                      targetLanguageCode: userTargetLangCode
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('📊 Progress tracked for word:', wordId);
                    
                    // Update completed topics immediately from API response
                    if (data.completedTopicIds) {
                      setCompletedTopicIds(data.completedTopicIds);
                      console.log('🔄 Completed topics updated:', data.completedTopicIds);
                    }
                  }
                } catch (error) {
                  console.error('Failed to track progress:', error);
                }
              }
              
              // Reset visual indicator to idle
              if (settings?.setCurrentAudioStep) {
                settings.setCurrentAudioStep('idle');
              }
              
              return true;

            } catch (error: any) {
              if (error.name === 'AbortError') {
                console.log('🛑 Alnilam sequence aborted cleanly');
                // Reset visual indicator
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('idle');
                }
                return false; // Return false to indicate playback was stopped
              }
              console.error('❌ Alnilam sequence failed:', error);
              return false;
            }
          },

          isAvailable() {
            return true;
          },

          getStatus() {
            return {
              available: true,
              name: 'Alnilam Multilingual Audio Service'
            };
          }
        };

        console.log('🌊 B2 Audio Service initialized - Backblaze cloud audio');
        console.log('✅ B2 audio service created:', alnilamAudioService);
        setAlnilamService(alnilamAudioService);
        console.log('✅ B2 audio service set in state');
        setActiveAudioService("B2 Audio");
        console.log('🌟 B2 Audio Service initialized successfully');
        
        // IMMEDIATE TEST: Try calling the service right after initialization
        console.log('🧪 Testing Alnilam service immediately after initialization...');
        console.log('🧪 Service object test:', {
          serviceExists: !!alnilamAudioService,
          hasPlayMethod: !!alnilamAudioService.playWordSequence,
          serviceType: typeof alnilamAudioService
        });
        
      } catch (error) {
        console.error('❌ Failed to initialize Alnilam service:', error);
        console.log('Alnilam service not available, Algenib will be used instead');
      }
    }
    
    initAlnilam()
  }, [])

  // Main audio playback function - Algenib Enhanced
  const playAudio = async (word: any, autoPlay = false) => {
    const now = Date.now();
    console.log('🔴 DEBUG: playAudio called', { 
      word: word ? 'exists' : 'null', 
      isPlaying, 
      autoPlay,
      audioCallInProgress: audioCallInProgress.current,
      timeSinceLastCall: now - lastAudioCallTime.current,
      stopRequested: stopRequestedRef.current,
      autoplayAborted: autoplayAbortController.current?.signal.aborted,
      timestamp: now
    });
    
    // CRITICAL: Check abort signal first (highest priority)
    if (autoplayAbortController.current?.signal.aborted) {
      console.log('🛑 Autoplay aborted - rejecting playAudio call');
      return;
    }
    
    // CRITICAL: Check if stop was requested - exit immediately if true
    if (stopRequestedRef.current) {
      console.log('🛑 Stop flag is active - rejecting playAudio call');
      return;
    }
    
    // Prevent rapid consecutive calls (less than 100ms apart)
    if (audioCallInProgress.current) {
      console.log('🔴 DEBUG: Audio call already in progress, ignoring');
      return;
    }
    
    if (now - lastAudioCallTime.current < 100) {
      console.log('🔴 DEBUG: Too soon since last call, ignoring');
      return;
    }
    
    if (!word || isPlaying) {
      console.log('🔴 DEBUG: Returning early', { hasWord: !!word, isPlaying });
      return;
    }

    // Set guards
    audioCallInProgress.current = true;
    lastAudioCallTime.current = now;

    try {
      // Enhanced validation for word data
      const sourceWord = word.sourceWord || word.training_word || ''
      const targetWord = word.targetWord || word.main_word || ''
      const wordId = word.id
      const englishWord = word.english_word || '' // English word for Verbs audio lookup
      const isCustomWord = word.isCustomWord || false // Check if this is a playlist/custom word

      if (!sourceWord || typeof sourceWord !== 'string' || sourceWord.trim().length === 0) {
        console.warn('No valid source word found in:', word)
        return
      }
      if (!targetWord || typeof targetWord !== 'string' || targetWord.trim().length === 0) {
        console.warn('No valid target word found in:', word)
        return
      }

      console.log('🎓 Algenib audio playback for:', { 
        wordId,
        sourceWord, 
        targetWord,
        englishWord,
        targetLanguage, 
        nativeLanguage,
        currentWordIndex,
        autoPlay,
        isCustomWord
      })

      if (autoPlay) {
        setAutoPlayActive(true)
      }
      setIsPlaying(true)
      
      // For custom/playlist words, use TTS fallback instead of B2 audio
      if (isCustomWord) {
        console.log('🎤 Using TTS fallback for custom word')
        setActiveAudioService("TTS")
        
        try {
          // Get language codes for TTS
          const languageMappings: Record<string, string> = {
            'Arabic': 'ar', 'German': 'de', 'Spanish': 'es', 'French': 'fr',
            'Hindi': 'hi', 'Indonesian': 'id', 'Italian': 'it', 'Japanese': 'ja',
            'Korean': 'ko', 'Portuguese': 'pt', 'Russian': 'ru', 'Dutch': 'nl',
            'Polish': 'pl', 'Thai': 'th', 'Turkish': 'tr', 'Vietnamese': 'vi',
            'Romanian': 'ro', 'Ukrainian': 'uk', 'Bengali': 'bn', 'English': 'en',
            'Chinese': 'zh', 'Greek': 'el', 'Hebrew': 'he', 'Czech': 'cs',
            'Hungarian': 'hu', 'Bulgarian': 'bg', 'Croatian': 'hr', 'Slovak': 'sk',
            'Slovenian': 'sl', 'Estonian': 'et', 'Finnish': 'fi', 'Swedish': 'sv',
            'Norwegian': 'no', 'Danish': 'da'
          }
          
          const targetLangCode = languageMappings[targetLanguage] || targetLanguageCode || 'en'
          const nativeLangCode = languageMappings[nativeLanguage] || nativeLanguageCode || 'en'
          
          // Play target word (learning language) using Web Audio API
          setCurrentAudioStep('training')
          const targetAudioUrl = `/api/custom-audio?text=${encodeURIComponent(sourceWord)}&languageCode=${targetLangCode}`
          
          try {
            await playAudioUniversal(targetAudioUrl, 1.0);
          } catch (e) {
            console.log('⚠️ Target TTS failed:', e);
          }
          
          // Pause between words
          await new Promise(resolve => setTimeout(resolve, settings.pauseBetweenTranslations || 1000))
          
          if (stopRequestedRef.current) {
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }
          
          // Play native word using Web Audio API
          setCurrentAudioStep('main')
          const nativeAudioUrl = `/api/custom-audio?text=${encodeURIComponent(targetWord)}&languageCode=${nativeLangCode}`
          
          try {
            await playAudioUniversal(nativeAudioUrl, 1.0);
          } catch (e) {
            console.log('⚠️ Native TTS failed:', e);
          }
          
          console.log('✅ TTS audio completed successfully')
          setCurrentAudioStep('idle')
          setIsPlaying(false)
          audioCallInProgress.current = false
          return
          
        } catch (error) {
          console.error('❌ TTS audio error:', error)
          setCurrentAudioStep('idle')
          setIsPlaying(false)
          audioCallInProgress.current = false
          return
        }
      }
      
      console.log('🎮 Play button clicked - checking services...', {
        alnilamService: !!alnilamService,
        alnilamServiceType: typeof alnilamService,
        wordId,
        sourceWord,
        targetWord,
        targetLanguage,
        nativeLanguage
      });
      
      // CRITICAL DEBUG: Check if Alnilam service is available
      if (!alnilamService) {
        console.error('🚨 CRITICAL: Alnilam service is null/undefined!');
        console.log('🔍 Service initialization status check needed');
      }
      
      if (!wordId) {
        console.error('🚨 CRITICAL: wordId is missing!', { wordId });
      }
      
      // Priority 1: Try Alnilam Multilingual Audio first (54,738 files)
      if (alnilamService && wordId) {
        console.log('🌟 Using Alnilam Multilingual Audio for comprehensive language support')
        console.log('🔧 About to call playWordSequence with:', {
          sourceWord, targetWord, wordId, nativeLanguage, targetLanguage,
          settingsType: typeof settings,
          hasSetCurrentAudioStep: typeof setCurrentAudioStep
        })
        setActiveAudioService("Alnilam")
        
        console.log('🎮 DEBUG: Calling Alnilam with settings:', {
          playTargetOnly: settings.playTargetOnly,
          repeatTarget: settings.repeatTargetLanguage,
          repeatMain: settings.repeatMainLanguage
        })
        
        try {
          const alnilamSuccess = await alnilamService.playWordSequence(
            sourceWord,           // sourceWord string
            targetWord,           // targetWord string  
            {                     // settings object
              pronunciationSpeed: settings.pronunciationSpeed,
              pauseBetweenTranslations: settings.pauseBetweenTranslations,
              pauseForNextWord: settings.pauseForNextWord,
              repeatTargetLanguage: settings.repeatTargetLanguage,
              repeatMainLanguage: settings.repeatMainLanguage,
              playTargetOnly: settings.playTargetOnly,
              setCurrentAudioStep
            },
            wordId,               // wordId
            nativeLanguage,       // sourceLanguage
            targetLanguage,       // targetLanguage
            englishWord           // englishWord for Verbs audio lookup
          )
          
          console.log('🎵 Alnilam playWordSequence returned:', alnilamSuccess)
          
          // Check abort signal first (highest priority)
          if (autoplayAbortController.current?.signal.aborted) {
            console.log('🛑 Autoplay aborted during Alnilam playback - immediate exit');
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }
          
          // Check if stop was requested during playback - EXIT IMMEDIATELY
          if (stopRequestedRef.current) {
            console.log('🛑 Stop requested during Alnilam playback - cleaning up and exiting');
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }
          
          if (alnilamSuccess) {
            console.log('✅ Alnilam audio completed successfully')
            
            // Track word progress when audio is played successfully
            if (user?.id && wordId && targetLanguageCode) {
              try {
                await fetch('/api/progress/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.id,
                    vocabularyId: wordId,
                    targetLanguageCode: targetLanguageCode
                  })
                })
                console.log('📊 Progress tracked for word:', wordId)
              } catch (error) {
                console.error('Failed to track progress:', error)
              }
            }
            
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            return
          } else {
            console.log('⚠️ Audio service returned false - audio may not be available for this word')
            setCurrentAudioStep('idle')
            setIsPlaying(false)
          }
        } catch (error) {
          console.error('❌ Audio service error:', error)
          setCurrentAudioStep('idle')
          setIsPlaying(false)
        }
      } else {
        console.warn('❌ Audio service not available:', {
          hasService: !!alnilamService,
          hasWordId: !!wordId,
          serviceType: typeof alnilamService
        })
        setCurrentAudioStep('idle')
        setIsPlaying(false)
      }

    } catch (error) {
      console.error('Audio playback error:', error)
      setCurrentAudioStep('idle')
      setAutoPlayActive(false)
      setIsPlaying(false)
    } finally {
      // Always reset the guard
      audioCallInProgress.current = false;
    }
  }

  // Stop audio function with abort controller
  const stopAudio = () => {
    console.log('🛑 STOP AUDIO - Complete shutdown initiated');
    
    // Abort any ongoing autoplay loop immediately
    if (autoplayAbortController.current) {
      autoplayAbortController.current.abort();
      autoplayAbortController.current = null;
      console.log('✅ Autoplay aborted via AbortController');
    }
    
    // Set legacy stop flags for backward compatibility
    stopRequestedRef.current = true;
    autoPlayRef.current = false;
    isAutoplayActive.current = false;
    
    // Clear the audio request queue
    audioRequestQueue.current = [];
    isProcessingAudioQueue.current = false;
    
    // Immediately stop all audio elements
    audioElementsRef.current.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        console.log('🛑 Stopped audio element');
      } catch (error) {
        console.log('⚠️ Error stopping audio element:', error);
      }
    });
    
    // Clear the audio elements array
    audioElementsRef.current = [];
    
    // Cancel the auto-play loop - CRITICAL: Do this BEFORE resetting other states
    autoPlayRef.current = false
    
    // Reset all audio states - must happen AFTER autoPlayRef is set to false
    setIsPlaying(false)
    setCurrentAudioStep('idle')
    setAutoPlayActive(false)
    
    console.log('✅ Audio stopped immediately and all states reset')
  }

  // Database state
  const [topics, setTopics] = useState<Topic[]>([])
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([])
  const [totalWords, setTotalWords] = useState<number>(0)
  const [currentOffset, setCurrentOffset] = useState<number>(0)
  const [hasMoreWords, setHasMoreWords] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [completedTopicIds, setCompletedTopicIds] = useState<number[]>([])

  // Smart preloading cache - load everything invisibly in background
  const [dataCache, setDataCache] = useState<{
    topics: Topic[]
    vocabularyCache: { [key: string]: VocabularyWord[] }
  }>({
    topics: [],
    vocabularyCache: {}
  })

  // Load data from JSON file (reordered topics) on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Load topics from API endpoint to ensure it works in production
        const topicsResponse = await fetch('/api/topics')
        const topicsData = await topicsResponse.json()
        setTopics(topicsData)
        setDataCache(prev => ({
          ...prev,
          topics: topicsData
        }))
      } catch (error) {
        console.error('Failed to load data:', error)
        // Fallback to database if JSON file fails
        try {
          const topicsData = await getTopics()
          setTopics(topicsData)
          setDataCache(prev => ({
            ...prev,
            topics: topicsData
          }))
        } catch (dbError) {
          console.error('Failed to load data from database:', dbError)
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Fetch completed topics when user and target language are available
  useEffect(() => {
    if (!user?.id || !targetLanguageCode) {
      setCompletedTopicIds([])
      return
    }
    
    const fetchCompletedTopics = async () => {
      try {
        console.log('🔍 Fetching completed topics for:', { userId: user.id, targetLanguageCode })
        const response = await fetch(`/api/progress/topics?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Completed topics loaded:', data.completedTopicIds)
          setCompletedTopicIds(data.completedTopicIds || [])
        } else {
          console.error('Failed to fetch completed topics:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch completed topics:', error)
      }
    }
    
    fetchCompletedTopics()
  }, [user?.id, targetLanguageCode])

  // 💾 Auto-save position when word index changes (debounced)
  useEffect(() => {
    if (!user?.id || !selectedTopic || !targetLanguageCode || vocabulary.length === 0) {
      return
    }

    // Clear any existing timeout
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current)
    }

    // Debounce save for 2 seconds to avoid excessive API calls
    savePositionTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/progress/position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            topicId: selectedTopic.id,
            targetLanguageCode: targetLanguageCode,
            currentWordIndex: currentWordIndex,
            totalWords: vocabulary.length
          })
        })
        console.log('💾 Auto-saved position:', currentWordIndex, 'for topic:', selectedTopic.id)
      } catch (error) {
        console.error('Failed to auto-save position:', error)
      }
    }, 2000)

    // Cleanup on unmount
    return () => {
      if (savePositionTimeoutRef.current) {
        clearTimeout(savePositionTimeoutRef.current)
      }
    }
  }, [currentWordIndex, user?.id, selectedTopic, targetLanguageCode, vocabulary.length])

  // Fetch phonetics for vocabulary words
  const fetchPhonetics = async (vocab: VocabularyWord[], targetLangCode: string, nativeLangCode: string) => {
    if (!vocab || vocab.length === 0) {
      console.log('⏭️ No vocabulary to fetch phonetics for')
      return
    }
    
    try {
      console.log(`🔤 Fetching phonetics for ${vocab.length} words...`)
      
      // Get vocabulary IDs from the vocab array
      const vocabIds = vocab
        .map(v => v.id)
        .filter((id): id is number => id !== undefined && id !== null)
      
      if (vocabIds.length === 0) {
        console.log('⚠️ No vocabulary IDs found to fetch phonetics')
        return
      }
      
      const response = await fetch('/api/phonetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyIds: vocabIds,
          targetLanguageCode: targetLangCode,
          nativeLanguageCode: nativeLangCode
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded phonetics:`, Object.keys(data.phonetics || {}).length, 'entries')
        setPhonetics(data.phonetics || {})
      } else {
        console.log('⚠️ Failed to fetch phonetics:', response.status)
      }
    } catch (error) {
      console.error('❌ Error fetching phonetics:', error)
    }
  }

  // Smart background preloading - invisible to user
  const preloadVocabularyInBackground = async (nativeLang: string, targetLang: string) => {
    if (!dataCache.topics.length) return
    
    console.log('🔄 Silently preloading vocabulary in background...')
    
    // Preload vocabulary for all topics with these languages (sequential to avoid overwhelming DB)
    const topicsToPreload = dataCache.topics.slice(0, 3); // Reduced from 5 to 3 topics
    
    for (const topic of topicsToPreload) {
      const cacheKey = `${topic.id}-${targetLang}-${nativeLang}`
      
      if (!dataCache.vocabularyCache[cacheKey]) {
        try {
          const vocabularyResponse = await getVocabularyForTopic(
            topic.id,
            targetLang,
            nativeLang,
            100, // Reduced from 10000 to 100 for faster initial load
            0
          )
          
          setDataCache(prev => ({
            ...prev,
            vocabularyCache: {
              ...prev.vocabularyCache,
              [cacheKey]: vocabularyResponse.vocabulary || []
            }
          }))
          
          console.log(`✅ Cached vocabulary for topic ${topic.id}: ${vocabularyResponse.vocabulary?.length || 0} words`)
          
          // Small delay between requests to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to cache vocabulary for topic ${topic.id}:`, error)
        }
      }
    }
    
    console.log('✅ Vocabulary preloading completed')
  }
  // Vocabulary is now preloaded in handleTopicSelect before page transition
  /*
  useEffect(() => {
    const loadVocabulary = async () => {
      console.log('🔍 Vocabulary loading effect triggered:', {
        selectedTopic: selectedTopic?.id,
        selectedTopicName: selectedTopic?.name,
        nativeLanguageCode,
        targetLanguageCode,
        nativeLanguage,
        targetLanguage,
        allConditionsMet: !!(selectedTopic && nativeLanguageCode && targetLanguageCode)
      })
      
      if (selectedTopic && nativeLanguageCode && targetLanguageCode) {
        console.log('✅ Loading vocabulary for word training:', {
          topicId: selectedTopic.id,
          topicName: selectedTopic.name,
          trainingLanguage: `${targetLanguage} (${targetLanguageCode})`, // what user wants to learn
          mainLanguage: `${nativeLanguage} (${nativeLanguageCode})` // user's native language for translations
        })
        
        // Clear existing vocabulary to prevent showing old data
        setVocabulary([])
        setCurrentWordIndex(0)
        setIsLoading(true)
        
        try {
          // Load vocabulary words in batches for better performance
          // This ensures autoplay can continue through words while maintaining good performance
          const vocabularyResponse = await getVocabularyForTopic(
            selectedTopic.id,
            targetLanguage, // Use full language name, not code
            nativeLanguage, // Use full language name, not code
            1000, // Increased to 1000 to handle larger topics like Verbs (449) and Common Phrases (838)
            0 // Start from offset 0
          )
          
          console.log('Vocabulary loaded:', vocabularyResponse.vocabulary.length, 'words out of', vocabularyResponse.totalWords)
          if (vocabularyResponse.vocabulary.length > 0) {
            console.log('Sample vocabulary:', vocabularyResponse.vocabulary.slice(0, 3))
            console.log('First word details:', vocabularyResponse.vocabulary[0])
          }
          setVocabulary(vocabularyResponse.vocabulary)
          setTotalWords(vocabularyResponse.totalWords)
          setCurrentOffset(vocabularyResponse.vocabulary.length) // Set offset to loaded words count
          setHasMoreWords(false) // No more words to load since we loaded everything
          setCurrentWordIndex(0)
          
          // Audio system removed - placeholder for new TTS implementation
          console.log(`🎵 Audio system removed for topic ${selectedTopic.id}: ${selectedTopic.name}`)
          setHasUmbrielAudio(false)
          setUmbrielStatus(`🔄 TTS System Removed - Ready for New Implementation`)
          
          // Reset audio states when new vocabulary is loaded
          setIsPlaying(false)
          setCurrentAudioStep('idle')
          setAutoPlayActive(false)
          autoPlayRef.current = false
        } catch (error) {
          console.error('Failed to load vocabulary:', error)
          setVocabulary([])
        } finally {
          setIsLoading(false)
        }
      } else {
        console.log('❌ Vocabulary loading conditions not met:', {
          hasSelectedTopic: !!selectedTopic,
          hasNativeLanguageCode: !!nativeLanguageCode,
          hasTargetLanguageCode: !!targetLanguageCode,
          selectedTopic: selectedTopic?.name,
          nativeLanguageCode,
          targetLanguageCode
        })
      }
    }
    loadVocabulary()
  }, [selectedTopic, nativeLanguageCode, targetLanguageCode, nativeLanguage, targetLanguage])
  */

  // Function to load more words when approaching end of current batch
  const loadMoreWords = async () => {
    if (!selectedTopic || !hasMoreWords || isLoading) return
    
    try {
      setIsLoading(true)
      console.log('Loading more words from offset:', currentOffset)
      
      const vocabularyResponse = await getVocabularyForTopic(
        selectedTopic.id,
        targetLanguageCode,
        nativeLanguageCode,
        50,
        currentOffset
      )
      
      if (vocabularyResponse.vocabulary && vocabularyResponse.vocabulary.length > 0) {
        console.log('Loaded', vocabularyResponse.vocabulary.length, 'more words')
        // Append new words to existing vocabulary
        setVocabulary(prev => [...prev, ...(vocabularyResponse.vocabulary || [])])
        setCurrentOffset(prev => prev + 50)
        setHasMoreWords(vocabularyResponse.hasMore || false)
      }
    } catch (error) {
      console.error('Failed to load more vocabulary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-play controller function with AbortController pattern
  const startAutoPlay = async () => {
    if (!vocabulary.length || !settings.autoPlay) {
      console.log('❌ Autoplay blocked: no vocabulary or autoplay disabled');
      return;
    }
    
    // Prevent multiple simultaneous autoplay instances
    if (isAutoplayActive.current) {
      console.log('⚠️ Autoplay already active, ignoring duplicate call');
      return;
    }
    
    console.log('▶️ AUTOPLAY START from word', currentWordIndex + 1);
    
    // Create new AbortController for this autoplay session
    autoplayAbortController.current = new AbortController();
    const { signal } = autoplayAbortController.current;
    
    // Set state flags
    isAutoplayActive.current = true;
    autoPlayRef.current = true;
    stopRequestedRef.current = false;
    setAutoPlayActive(true);
    
    try {
      for (let i = currentWordIndex; i < vocabulary.length; i++) {
        // Check abort signal FIRST - highest priority check
        if (signal.aborted) {
          console.log('🛑 Autoplay aborted by signal at word', i + 1);
          throw new DOMException('Autoplay aborted', 'AbortError');
        }
        
        const word = vocabulary[i];
        if (!word || !word.sourceWord || !word.targetWord) {
          console.log('⏭️ Skipping invalid word at index', i);
          continue;
        }
        
        console.log(`▶️ Autoplay [${i + 1}/${vocabulary.length}]: ${word.sourceWord}`);
        
        // Update display ONLY if not aborted
        if (!signal.aborted) {
          setCurrentWordIndex(i);
        }
        
        // Check abort BEFORE playing
        if (signal.aborted) {
          console.log('🛑 Aborted before playAudio');
          throw new DOMException('Autoplay aborted', 'AbortError');
        }
        
        // Play the word - this is async and may take time
        await playAudio(word, false);
        
        // Check abort AFTER playing
        if (signal.aborted) {
          console.log('🛑 Aborted after playAudio');
          throw new DOMException('Autoplay aborted', 'AbortError');
        }
        
        // Pause before next word (except for last word)
        if (i < vocabulary.length - 1) {
          setCurrentAudioStep('pause');
          
          // Interruptible sleep using abort signal
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              resolve();
            }, settings.pauseForNextWord * 1000);
            
            // Listen for abort signal during sleep
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Autoplay aborted during pause', 'AbortError'));
            });
          });
        }
      }
      
      // Natural completion (not aborted)
      console.log('✅ Autoplay completed naturally');
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Autoplay aborted cleanly:', error.message);
      } else {
        console.error('❌ Autoplay error:', error);
      }
    } finally {
      // Always clean up state
      console.log('🧹 Autoplay cleanup');
      isAutoplayActive.current = false;
      autoPlayRef.current = false;
      setAutoPlayActive(false);
      setIsPlaying(false);
      setCurrentAudioStep('idle');
      stopRequestedRef.current = false;
      autoplayAbortController.current = null;
    }
  }

  // Auto-play effect - only when manually triggered and user has interacted
  useEffect(() => {
    // Prevent auto-play on page load - require user interaction first
    if (autoPlayActive && !isPlaying && vocabulary.length > 0 && hasUserInteracted) {
      console.log('Auto-play triggered by user interaction')
      startAutoPlay()
    } else if (autoPlayActive && !hasUserInteracted) {
      console.log('Auto-play blocked - no user interaction yet')
      setAutoPlayActive(false) // Reset autoplay since user hasn't interacted
    }
  }, [autoPlayActive, hasUserInteracted])

  // Initialize B2 audio system
  useEffect(() => {
    console.log('🎵 B2 Audio system active - Backblaze cloud audio storage')
  }, [])

  // Language names mapping for better display
  const getLanguageName = (languageCode: string): string => {
    const nameMap: { [key: string]: string } = {
      'af': 'Afrikaans',
      'am': 'Amharic',
      'ar': 'Arabic',
      'az': 'Azerbaijani',
      'be': 'Belarusian',
      'bg': 'Bulgarian',
      'bn': 'Bengali',
      'br': 'Breton',
      'bs': 'Bosnian',
      'ca': 'Catalan',
      'co': 'Corsican',
      'cs': 'Czech',
      'cy': 'Welsh',
      'da': 'Danish',
      'de': 'German',
      'el': 'Greek',
      'en': 'English',
      'eo': 'Esperanto',
      'es': 'Spanish',
      'et': 'Estonian',
      'eu': 'Basque',
      'fa': 'Persian',
      'fi': 'Finnish',
      'fo': 'Faroese',
      'fr': 'French',
      'ga': 'Irish',
      'gd': 'Scottish Gaelic',
      'gu': 'Gujarati',
      'ha': 'Hausa',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'hr': 'Croatian',
      'hu': 'Hungarian',
      'id': 'Indonesian',
      'ig': 'Igbo',
      'is': 'Icelandic',
      'it': 'Italian',
      'ja': 'Japanese',
      'jv': 'Javanese',
      'ka': 'Georgian',
      'kk': 'Kazakh',
      'km': 'Khmer',
      'kn': 'Kannada',
      'ko': 'Korean',
      'ky': 'Kyrgyz',
      'la': 'Latin',
      'lb': 'Luxembourgish',
      'lo': 'Lao',
      'lt': 'Lithuanian',
      'lv': 'Latvian',
      'mg': 'Malagasy',
      'mk': 'Macedonian',
      'ml': 'Malayalam',
      'mn': 'Mongolian',
      'mr': 'Marathi',
      'ms': 'Malay',
      'mt': 'Maltese',
      'my': 'Myanmar',
      'ne': 'Nepali',
      'nl': 'Dutch',
      'no': 'Norwegian',
      'or': 'Odia',
      'pa': 'Punjabi',
      'pl': 'Polish',
      'ps': 'Pashto',
      'pt': 'Portuguese',
      'ro': 'Romanian',
      'ru': 'Russian',
      'rw': 'Kinyarwanda',
      'sa': 'Sanskrit',
      'si': 'Sinhala',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'sn': 'Shona',
      'so': 'Somali',
      'sq': 'Albanian',
      'sr': 'Serbian',
      'sv': 'Swedish',
      'sw': 'Swahili',
      'ta': 'Tamil',
      'te': 'Telugu',
      'tg': 'Tajik',
      'th': 'Thai',
      'tk': 'Turkmen',
      'tl': 'Filipino',
      'tr': 'Turkish',
      'uk': 'Ukrainian',
      'ur': 'Urdu',
      'uz': 'Uzbek',
      'vi': 'Vietnamese',
      'xh': 'Xhosa',
      'yo': 'Yoruba',
      'zh': 'Chinese',
      'zu': 'Zulu',
    }
    return nameMap[languageCode] || languageCode.toUpperCase()
  }

  // All 50 languages from Alnilam Audio Library - matching available audio files
  const alnilamLanguageCodes = ['ar', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'is', 'it', 'ja', 'ko', 'lt', 'lv', 'mk', 'ml', 'mr', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh']
  
  // Order languages with most common first, then alphabetical
  const topLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'tr', 'ko', 'zh']
  const remainingLanguages = alnilamLanguageCodes
    .filter(code => !topLanguages.includes(code))
    .sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b)))
  const orderedLanguageCodes = [...topLanguages, ...remainingLanguages]
  
  const enhancedLanguages = orderedLanguageCodes.map(code => ({
    code,
    name: getLanguageName(code)
  }))

  const filteredLanguages = enhancedLanguages.filter((lang) => {
    // Filter by search query
    const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // If we're on target language selection, exclude the native language
    if (currentPage === "target" && nativeLanguageCode) {
      return matchesSearch && lang.code !== nativeLanguageCode
    }
    
    return matchesSearch
  })

  // Removed automatic useEffect transitions - handleLanguageSelect now handles all transitions
  /*
  useEffect(() => {
    if (nativeLanguage && currentPage === "native") {
      setIsTransitioning(true)
      setTimeout(() => {
        setQuestionText("choose the language\nyou want to train")
        setCurrentPage("target")
        setIsTransitioning(false)
      }, 300)
    }
  }, [nativeLanguage, currentPage])

  useEffect(() => {
    if (targetLanguage && currentPage === "target") {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPage("confirmation")
        setIsTransitioning(false)
      }, 300)
    }
  }, [targetLanguage, currentPage])
  */

  // Get display name for topics (with custom name mappings)
  const getTopicDisplayName = (topicId: number, originalName: string): string => {
    // Custom name mappings for specific topics
    const nameMapping: { [key: number]: string } = {
      8: "Health", // Health & Body Parts → Health
      11: "Weather", // Weather & Nature → Weather (already merged in database)
      12: "Family", // Family & Relationships → Family
      17: "City", // Places Around Town → City
      18: "Travel", // Travel & Tourism → Travel
    }
    
    return nameMapping[topicId] || originalName
  }

  const handleLanguageSelect = (language: { code: string; name: string }) => {
    console.log('Language selected:', language)
    
    // Reset scroll position to top of the container
    const languageGrid = document.querySelector('.language-grid-container')
    if (languageGrid) {
      languageGrid.scrollTop = 0
    }
    
    if (currentPage === "native") {
      setNativeLanguage(language.name)
      setNativeLanguageCode(language.code)
      console.log('Native language set:', language.name, language.code)
      
      // Start fade animation
      setIsTransitioning(true)
      
      // If we already have a target language selected, go back to confirmation
      // Otherwise go to target language selection
      setTimeout(() => {
        if (targetLanguage && targetLanguageCode) {
          setCurrentPage("confirmation")
        } else {
          setQuestionText("I want to learn")
          setCurrentPage("target")
        }
        setIsTransitioning(false)
      }, 300)
    } else if (currentPage === "target") {
      setTargetLanguage(language.name)
      setTargetLanguageCode(language.code)
      console.log('Target language set:', language.name, language.code)
      
      // Start background preloading immediately (invisible to user)
      preloadVocabularyInBackground(nativeLanguage, language.name)
      
      // Normal transition - no visible loading
      setIsTransitioning(true)
      
      setTimeout(() => {
        setCurrentPage("confirmation")
        setIsTransitioning(false)
      }, 300)
    }
    setSearchQuery("")
  }

  const handleContinue = () => {
    if (currentPage === "confirmation") {
      console.log("Starting language learning journey!")
    }
  }

  // New function specifically for confirmation page language changes
  const handleConfirmationLanguageChange = (type: "native" | "target") => {
    // Start fade animation
    setIsTransitioning(true)
    
    setTimeout(() => {
      if (type === "native") {
        setCurrentPage("native")
        setQuestionText("What language do you speak?")
        // Don't clear the language - we want to show current selection
      } else {
        setCurrentPage("target")
        setQuestionText("I want to learn")
        // Don't clear the language - we want to show current selection
      }
      setSearchQuery("")
      setIsTransitioning(false)
    }, 300)
  }

  const handleLanguageCardClick = (type: "native" | "target") => {
    // Start fade animation
    setIsTransitioning(true)
    
    setTimeout(() => {
      if (type === "native") {
        setCurrentPage("native")
        setQuestionText("What language do you speak?")
        // Clear the native language so it can be reselected
        setNativeLanguage("")
        setNativeLanguageCode("")
      } else {
        setCurrentPage("target")
        setQuestionText("I want to learn")
        // Clear the target language so it can be reselected
        setTargetLanguage("")
        setTargetLanguageCode("")
      }
      setSearchQuery("")
      setIsTransitioning(false)
    }, 300)
  }

  const handleTopicSelect = async (topic: Topic) => {
    console.log('🔐 Processing topic selection:', topic.id, topic.name)
    
    // Special case: Playlist learning - topic id -2
    if (topic.id === -2) {
      console.log('📋 Playlist selected - navigating to playlist learning')
      const playlistId = (topic as any).playlistId
      
      // Require authentication for playlists
      if (!user) {
        console.log('❌ Please sign in to access playlists')
        return
      }
      
      // Allow playlist access
      // Fetch playlist words
      try {
        const response = await fetch(`/api/playlists?userId=${user.id}&playlistId=${playlistId}`)
        if (!response.ok) {
          console.error('Failed to fetch playlist')
          return
        }
        const data = await response.json()
        
        console.log('📋 Raw playlist data:', JSON.stringify(data, null, 2))
        
        if (!data.words || data.words.length === 0) {
          alert('This playlist has no words yet. Add words from the Search Word feature!')
          return
        }
        
        // Transform playlist words to vocabulary format
        // vocabulary expects: { sourceWord (target language), targetWord (native language) }
        const playlistVocabulary = data.words.map((pw: any) => {
          const dictWord = pw.dictionary_words
          const translations = dictWord?.translations || {}
          
          // sourceWord = the word in target language (what user is learning)
          // targetWord = the word in native language (user's known language)
          const sourceWord = translations[targetLanguageCode] || dictWord?.word_en || ''
          const targetWord = translations[nativeLanguageCode] || dictWord?.word_en || ''
          
          console.log('📝 Transforming word:', { 
            word_en: dictWord?.word_en,
            sourceWord, 
            targetWord,
            targetLang: targetLanguageCode,
            nativeLang: nativeLanguageCode 
          })
          
          return {
            id: dictWord?.id,
            sourceWord: sourceWord,
            targetWord: targetWord,
            word_en: dictWord?.word_en,
            isCustomWord: true // Flag to indicate this needs TTS fallback
          }
        })
        
        console.log('📋 Loaded playlist vocabulary:', playlistVocabulary)
        
        // Set vocabulary and navigate
        setVocabulary(playlistVocabulary)
        setTotalWords(playlistVocabulary.length)
        setCurrentOffset(playlistVocabulary.length)
        setHasMoreWords(false)
        setCurrentWordIndex(0)
        setSelectedTopic({ ...topic, name: topic.name }) // Keep name without emoji, icon handled separately
        
        // Reset audio states
        setIsPlaying(false)
        setCurrentAudioStep('idle')
        setAutoPlayActive(false)
        autoPlayRef.current = false
        
        // Navigate to learning page
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentPage("learning")
          setIsTransitioning(false)
        }, 150)
      } catch (error) {
        console.error('Error loading playlist:', error)
      }
      return
    }
    
    // Special case: Search Word (My Words feature) - topic id -1
    if (topic.id === -1) {
      console.log('🔍 Search Word selected - navigating to search learning')
      
      // Require authentication for search
      if (!user) {
        console.log('❌ Please sign in to use search')
        return
      }
      
      // Allow search access
      setSelectedTopic(topic)
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPage("learning")
        setIsTransitioning(false)
      }, 150)
      return
    }
    
    // Access check already done in handleTopicClick, proceed with loading topic
    // Note: For regular topics called directly (e.g., from post-payment flow), 
    // we trust that the caller has verified access
    console.log('✅ Proceeding with topic loading:', topic.id)

    // User has access, proceed with topic selection
    const cacheKey = `${topic.id}-${targetLanguage}-${nativeLanguage}`
    
    // Load saved position for this topic (if user is authenticated)
    let savedPosition = 0
    if (user?.id && targetLanguageCode) {
      try {
        const positionResponse = await fetch(`/api/progress/position?userId=${user.id}&topicId=${topic.id}&targetLanguageCode=${targetLanguageCode}`)
        if (positionResponse.ok) {
          const positionData = await positionResponse.json()
          savedPosition = positionData.currentWordIndex || 0
          console.log('📍 Loaded saved position:', savedPosition, 'for topic:', topic.id)
        }
      } catch (error) {
        console.error('Failed to load saved position:', error)
      }
    }
    
    // Check if we have cached vocabulary
    if (dataCache.vocabularyCache[cacheKey]) {
      console.log('✅ Using cached vocabulary - instant transition!')
      
      // Set data from cache instantly
      const cachedVocabulary = dataCache.vocabularyCache[cacheKey]
      setVocabulary(cachedVocabulary)
      setTotalWords(cachedVocabulary.length)
      setCurrentOffset(cachedVocabulary.length)
      setHasMoreWords(false)
      setCurrentWordIndex(savedPosition) // Resume from saved position
      setSelectedTopic(topic)
      
      // Reset audio states
      setIsPlaying(false)
      setCurrentAudioStep('idle')
      setAutoPlayActive(false)
      autoPlayRef.current = false
      
      // Instant transition
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentPage("learning")
        setIsTransitioning(false)
      }, 150)
      
    } else {
      // Fallback: load data if not cached (should be rare)
      console.log('⚠️ Vocabulary not cached, loading...')
      setIsLoading(true)
      
      try {
        const vocabularyResponse = await getVocabularyForTopic(
          topic.id,
          targetLanguage,
          nativeLanguage,
          1000, // Increased to handle larger topics like Common Phrases (838 words)
          0
        )
        
        // Cache for future use
        setDataCache(prev => ({
          ...prev,
          vocabularyCache: {
            ...prev.vocabularyCache,
            [cacheKey]: vocabularyResponse.vocabulary || []
          }
        }))
        
        // Set all data at once
        setVocabulary(vocabularyResponse.vocabulary || [])
        setTotalWords(vocabularyResponse.totalWords || 0)
        setCurrentOffset(vocabularyResponse.vocabulary?.length || 0)
        setHasMoreWords(false)
        setCurrentWordIndex(savedPosition) // Resume from saved position
        setSelectedTopic(topic)
        
        // Fetch phonetics for vocabulary
        fetchPhonetics(vocabularyResponse.vocabulary || [], targetLanguageCode, nativeLanguageCode)
        
        // Reset audio states
        setIsPlaying(false)
        setCurrentAudioStep('idle')
        setAutoPlayActive(false)
        autoPlayRef.current = false
        
        // Transition to learning page
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentPage("learning")
          setIsTransitioning(false)
          setIsLoading(false)
        }, 150)
        
      } catch (error) {
        console.error('Failed to load vocabulary:', error)
        setIsLoading(false)
        setSelectedTopic(topic)
        setCurrentPage("learning")
      }
    }
  }

  const getCurrentContent = () => {
    // Since vocabulary is now preloaded, we shouldn't see loading states
    if (vocabulary.length === 0) {
      return { 
        sourceWord: `No ${targetLanguage} words found`, 
        targetWord: `Try a different topic or language combination`,
        category: ''
      }
    }
    const currentWord = vocabulary[currentWordIndex] || vocabulary[0]
    // Debug: Log category info
    if (selectedTopic?.id === 41) {
      console.log('🏷️ Current word:', currentWord.sourceWord, 'Category:', currentWord.category, 'learningOrder:', currentWord.learningOrder)
    }
    return {
      sourceWord: currentWord.sourceWord?.toLowerCase() || '', // Training language word (what user wants to learn) - displayed in lowercase
      targetWord: currentWord.targetWord?.toLowerCase() || '',  // Main language translation (user's native language) - displayed in lowercase
      category: currentWord.category || '' // Category for verb grouping display
    }
  }

  // Get category definitions based on topic
  const getCategoryDefinitions = () => {
    if (selectedTopic?.id === 41) {
      // Verbs topic categories
      return [
        { name: 'Basic', start: 1, end: 63 },
        { name: 'Daily Routine', start: 64, end: 107 },
        { name: 'Mental', start: 108, end: 173 },
        { name: 'Communication', start: 174, end: 210 },
        { name: 'Social', start: 211, end: 236 },
        { name: 'Work', start: 237, end: 276 },
        { name: 'Travel', start: 277, end: 304 },
        { name: 'Household', start: 305, end: 334 },
        { name: 'Money', start: 335, end: 356 },
        { name: 'Food', start: 357, end: 380 },
        { name: 'Nature', start: 381, end: 401 },
        { name: 'Health', start: 402, end: 423 },
        { name: 'Technology', start: 424, end: 449 }
      ]
    } else if (selectedTopic?.id === 42) {
      // Common Phrases categories
      return [
        { name: 'Daily Life & Actions', start: 1, end: 47 },
        { name: 'Socializing & Relationships', start: 48, end: 92 },
        { name: 'Conversation Starters & Enders', start: 93, end: 138 },
        { name: 'Small Talk & Casual Speech', start: 139, end: 185 },
        { name: 'Sharing Information', start: 186, end: 231 },
        { name: 'Asking for Information', start: 232, end: 274 },
        { name: 'Opinions & Thoughts', start: 275, end: 319 },
        { name: 'Agreement & Disagreement', start: 320, end: 357 },
        { name: 'Decisions & Choices', start: 358, end: 395 },
        { name: 'Time & Scheduling', start: 396, end: 435 },
        { name: 'Work & Productivity', start: 436, end: 476 },
        { name: 'Problems & Solutions', start: 477, end: 520 },
        { name: 'Emotions & Reactions', start: 521, end: 560 },
        { name: 'Politeness & Tone', start: 561, end: 604 },
        { name: 'Encouragement & Support', start: 605, end: 641 },
        { name: 'Money & Practical Life', start: 642, end: 682 },
        { name: 'Food & Daily Needs', start: 683, end: 722 },
        { name: 'Technology & Communication', start: 723, end: 763 },
        { name: 'Travel & Public Situations', start: 764, end: 801 },
        { name: 'Learning & Self-Improvement', start: 802, end: 1000 }
      ]
    }
    return []
  }

  // Get category-based progress for Verbs topic (41) and Common Phrases (42)
  const getCategoryProgress = () => {
    if ((selectedTopic?.id !== 41 && selectedTopic?.id !== 42) || vocabulary.length === 0) {
      return {
        current: currentWordIndex + 1,
        total: vocabulary.length,
        categoryName: ''
      }
    }

    const currentWord = vocabulary[currentWordIndex] || vocabulary[0]
    const learningOrder = currentWord.learningOrder || 1

    // Get category definitions
    const categories = getCategoryDefinitions()

    // Find current category
    const currentCategory = categories.find(cat => learningOrder >= cat.start && learningOrder <= cat.end)
    
    if (!currentCategory) {
      return {
        current: currentWordIndex + 1,
        total: vocabulary.length,
        categoryName: ''
      }
    }

    // Calculate position within current category
    const positionInCategory = learningOrder - currentCategory.start + 1
    const categorySize = currentCategory.end - currentCategory.start + 1

    return {
      current: positionInCategory,
      total: categorySize,
      categoryName: currentCategory.name.toUpperCase()
    }
  }

  const handlePreviousCategory = () => {
    unlockAudio()
    stopAudio()
    
    if (vocabulary.length === 0 || (selectedTopic?.id !== 41 && selectedTopic?.id !== 42)) return
    
    const currentWord = vocabulary[currentWordIndex] || vocabulary[0]
    const currentLearningOrder = currentWord.learningOrder || 1
    const categories = getCategoryDefinitions()
    
    // Find current category index
    const currentCategoryIndex = categories.findIndex(
      cat => currentLearningOrder >= cat.start && currentLearningOrder <= cat.end
    )
    
    if (currentCategoryIndex <= 0) {
      // Already at first category, go to last category
      const lastCategory = categories[categories.length - 1]
      const targetIndex = vocabulary.findIndex(w => w.learningOrder === lastCategory.start)
      if (targetIndex !== -1) setCurrentWordIndex(targetIndex)
    } else {
      // Go to previous category
      const prevCategory = categories[currentCategoryIndex - 1]
      const targetIndex = vocabulary.findIndex(w => w.learningOrder === prevCategory.start)
      if (targetIndex !== -1) setCurrentWordIndex(targetIndex)
    }
  }
  
  const handleNextCategory = () => {
    unlockAudio()
    stopAudio()
    
    if (vocabulary.length === 0 || (selectedTopic?.id !== 41 && selectedTopic?.id !== 42)) return
    
    const currentWord = vocabulary[currentWordIndex] || vocabulary[0]
    const currentLearningOrder = currentWord.learningOrder || 1
    const categories = getCategoryDefinitions()
    
    // Find current category index
    const currentCategoryIndex = categories.findIndex(
      cat => currentLearningOrder >= cat.start && currentLearningOrder <= cat.end
    )
    
    if (currentCategoryIndex === -1 || currentCategoryIndex >= categories.length - 1) {
      // Already at last category, go to first category
      const firstCategory = categories[0]
      const targetIndex = vocabulary.findIndex(w => w.learningOrder === firstCategory.start)
      if (targetIndex !== -1) setCurrentWordIndex(targetIndex)
    } else {
      // Go to next category
      const nextCategory = categories[currentCategoryIndex + 1]
      const targetIndex = vocabulary.findIndex(w => w.learningOrder === nextCategory.start)
      if (targetIndex !== -1) setCurrentWordIndex(targetIndex)
    }
  }

  const handlePrevious = () => {
    // 🔓 MOBILE FIX: Unlock audio on any user gesture
    unlockAudio()
    
    if (vocabulary.length > 0) {
      // Stop any current audio and auto-play sequence
      stopAudio()
      
      const prevIndex = currentWordIndex - 1
      
      if (prevIndex >= 0) {
        setCurrentWordIndex(prevIndex)
      } else {
        // Go to the last word in the topic (totalWords - 1)
        // If we don't have all words loaded, we need to implement logic to jump to end
        // For now, just cycle within loaded words
        setCurrentWordIndex(vocabulary.length - 1)
      }
    }
  }

  const handleNext = () => {
    // 🔓 MOBILE FIX: Unlock audio on any user gesture
    unlockAudio()
    
    if (vocabulary.length > 0) {
      // Stop any current audio and auto-play sequence
      stopAudio()
      
      const nextIndex = currentWordIndex + 1
      
      // Navigate to next word or cycle back to beginning if at the end
      if (nextIndex < vocabulary.length) {
        setCurrentWordIndex(nextIndex)
      } else {
        // At the end of all words, cycle back to beginning
        setCurrentWordIndex(0)
      }
    }
  }

  const handlePlay = async () => {
    // Mark that user has interacted (prevents auto-play on page load)
    setHasUserInteracted(true)
    
    // 🔓 MOBILE FIX: Unlock audio on user gesture before any playback
    await unlockAudio()
    
    if (isPlaying || autoPlayActive) {
      console.log('🛑 User pressed stop button - stopping all audio and autoplay')
      stopAudio()
    } else {
      const currentWord = vocabulary[currentWordIndex]
      if (currentWord) {
        console.log('▶️ Manual play button clicked')
        if (settings.autoPlay) {
          // Start auto-play sequence from current word
          console.log('🔄 Starting autoplay from word', currentWordIndex + 1)
          autoPlayRef.current = true
          setAutoPlayActive(true)
        } else {
          // Just play the current word once
          console.log('▶️ Playing single word')
          setIsPlaying(true)
          playAudio(currentWord, false).then(() => {
            // Only reset isPlaying if stop wasn't requested
            if (!stopRequestedRef.current) {
              setIsPlaying(false)
            }
          })
        }
      }
    }
  }

  // Create a new playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user?.id || !nativeLanguageCode || !targetLanguageCode) return
    
    setIsCreatingPlaylist(true)
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newPlaylistName.trim(),
          sourceLanguageCode: nativeLanguageCode,
          targetLanguageCode: targetLanguageCode
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add the new playlist to the list with word_count = 0
        const newPlaylist = { ...data.playlist, word_count: 0 }
        setUserPlaylists(prev => [newPlaylist, ...prev])
        setNewPlaylistName("")
        setShowCreatePlaylistModal(false)
      } else {
        const error = await response.json()
        console.error('Failed to create playlist:', error)
        alert(error.error || 'Failed to create playlist')
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('Failed to create playlist')
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleBackToTopics = async () => {
    // Save current position before going back
    if (user?.id && selectedTopic && targetLanguageCode && vocabulary.length > 0) {
      try {
        await fetch('/api/progress/position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            topicId: selectedTopic.id,
            targetLanguageCode: targetLanguageCode,
            currentWordIndex: currentWordIndex,
            totalWords: vocabulary.length
          })
        })
        console.log('💾 Position saved:', currentWordIndex, 'for topic:', selectedTopic.id)
      } catch (error) {
        console.error('Failed to save position:', error)
      }
    }
    
    // Restore the section where the topic was selected from
    setCurrentSection(lastTopicSectionRef.current)
    console.log('📍 Restoring section:', lastTopicSectionRef.current)
    
    // Stop any currently playing audio when navigating back
    stopAudio()
    setCurrentPage("confirmation")
  }

  const handleSettingsClick = () => {
    setShowSettings(true)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
  }

  const updateSetting = (key: string, value: any) => {
    console.log(`Updating setting: ${key} = ${value}`)
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value }
      console.log('New settings:', newSettings)
      
      // Debounce saving to database (wait 1 second after last change)
      if (saveSettingsTimeoutRef.current) {
        clearTimeout(saveSettingsTimeoutRef.current)
      }
      
      saveSettingsTimeoutRef.current = setTimeout(async () => {
        if (!user?.id) {
          console.log('⚠️ No user logged in, settings not saved')
          return
        }
        
        try {
          console.log('💾 Saving settings to database...')
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: newSettings })
          })
          
          if (response.ok) {
            console.log('✅ Settings saved successfully')
          } else {
            console.error('❌ Failed to save settings')
          }
        } catch (error) {
          console.error('❌ Error saving settings:', error)
        }
      }, 1000) // 1 second debounce
      
      return newSettings
    })
  }

  // Swipe gesture handlers for learning page
  const minSwipeDistance = 50 // Minimum distance for swipe
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance // Swipe from right to left
    const isRightSwipe = distance < -minSwipeDistance // Swipe from left to right
    
    // Right swipe (left to right) goes back
    if (isRightSwipe && currentPage === "learning") {
      console.log('🔄 Swipe detected - going back to topics')
      handleBackToTopics()
    }
  }



  // Topic click handler with subscription check
  const handleTopicClick = async (topic: Topic) => {
    console.log('🎯 Topic clicked:', { topicId: topic.id, topicName: topic.name, isPremium })
    
    // Check if user can access this topic
    if (!canAccessTopic(topic.id)) {
      console.log('🔒 Topic requires premium:', topic.id)
      setShowPaywall(true)
      return
    }
    
    // User has access, proceed
    console.log('✅ Granting access to topic:', topic.id)
    lastTopicSectionRef.current = currentSection
    handleTopicSelect(topic)
  }

  // renderTopicButton function - defined after handleTopicClick to access it
  const renderTopicButton = (topic: Topic) => {
    const hasCustomIcon = topic.icon
    const iconData = TOPIC_ICONS.find(icon => icon.id === topic.id)
    const isCompleted = completedTopicIds.includes(topic.id)
    
    // Debug logging
    if (topic.id === 1) {
      console.log('🎯 Topic 1 render:', { 
        completedTopicIds, 
        isCompleted,
        topicId: topic.id 
      })
    }
    
    // Direct mapping for custom SVG icons
    const customSVGIcons: { [key: number]: string } = {
      11: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.74 5.47c2.36 1.03 3.61 3.56 3.18 5.99A6 6 0 0 1 18 16v.17a3 3 0 0 1 1-.17a3 3 0 0 1 3 3a3 3 0 0 1-3 3H6a4 4 0 0 1-4-4a4 4 0 0 1 4-4h.27C5 12.45 4.6 10.24 5.5 8.26a5.49 5.49 0 0 1 7.24-2.79m-.81 1.83c-1.77-.8-3.84.01-4.62 1.77c-.46 1.02-.38 2.15.1 3.06A5.99 5.99 0 0 1 12 10c.7 0 1.38.12 2 .34a3.51 3.51 0 0 0-2.07-3.04m1.62-3.66c-.55-.24-1.1-.41-1.67-.52l2.49-1.3l.9 2.89a7.7 7.7 0 0 0-1.72-1.07m-7.46.8c-.49.35-.92.75-1.29 1.19l.11-2.81l2.96.68c-.62.21-1.22.53-1.78.94M18 9.71c-.09-.59-.22-1.16-.41-1.71l2.38 1.5l-2.05 2.23c.11-.65.13-1.33.08-2.02M3.04 11.3c.07.6.2 1.17.39 1.7l-2.37-1.5L3.1 9.28c-.1.65-.13 1.33-.06 2.02M19 18h-3v-2a4 4 0 0 0-4-4a4 4 0 0 0-4 4H6a2 2 0 0 0-2 2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1a1 1 0 0 0-1-1"/></svg>',
      18: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 6h2V4h-2zm1 6q-1.9 0-3.625-.788T5 9.45V8q0-.825.588-1.412T7 6h2V3q0-.425.288-.712T10 2h4q.425 0 .713.288T15 3v3h2q.825 0 1.413.588T19 8v1.45q-1.65.975-3.375 1.763T12 12m-5 9q-.825 0-1.412-.587T5 19v-7.3q1.4.85 2.888 1.45t3.112.8V14q0 .425.288.713T12 15t.713-.288T13 14v-.05q1.625-.2 3.113-.8T19 11.7V19q0 .825-.587 1.413T17 21q0 .425-.288.713T16 22q-.4 0-.562-.363T15 21H9q0 .425-.288.713T8 22q-.4 0-.562-.363T7 21"/></svg>'
    }
    
    return (
      <button
        key={topic.id}
        onClick={async () => await handleTopicClick(topic)}
        className={`bg-black/40 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center hover:bg-black/50 transition-all duration-300 transform hover:scale-[1.02] h-32 sm:h-36 shadow-lg hover:shadow-xl ${
          selectedTopic?.id === topic.id ? "bg-black/60 shadow-xl" : ""
        } ${
          isCompleted ? "shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,255,255,0.3)]" : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="flex-shrink-0">
            {hasCustomIcon ? (
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center" 
                style={{ color: 'rgba(255,255,255,0.8)' }}
                dangerouslySetInnerHTML={{ __html: topic.icon! }}
              />
            ) : customSVGIcons[topic.id] ? (
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center" 
                style={{ color: 'rgba(255,255,255,0.8)' }}
                dangerouslySetInnerHTML={{ __html: customSVGIcons[topic.id] }}
              />
            ) : iconData && typeof iconData.icon === 'string' ? (
              <Icon icon={iconData.icon} width="48" height="48" className="sm:w-16 sm:h-16" style={{ color: 'rgba(255,255,255,0.8)' }} />
            ) : iconData ? (
              (iconData.icon as any)({ className: 'w-12 h-12 sm:w-16 sm:h-16 text-white/80' })
            ) : (
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white/80" />
            )}
          </div>
          <p className="text-white/90 text-base sm:text-lg font-medium leading-tight px-1 text-center">{getTopicDisplayName(topic.id, topic.name)}</p>
        </div>
      </button>
    )
  }

  // Don't render until auth is initialized
  if (loading) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-3 h-full max-h-[90vh] sm:max-h-[85vh] flex items-center">
      <div className={`bg-white/5 backdrop-blur-3xl border border-white/15 rounded-2xl sm:rounded-3xl px-3 sm:px-5 md:px-7 py-4 sm:py-5 md:py-6 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl w-full max-h-full overflow-hidden ${isTransitioning ? 'bg-white/10' : 'bg-white/5'}`}>
        {isLoading && (
          <div className="text-center mb-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <p className="text-white/60 text-sm mt-2">Loading...</p>
          </div>
        )}
        
        {currentPage === "learning" && selectedTopic?.id === -1 && (
          /* Search Word Learning - Custom word search mode */
          <div 
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <SearchWordLearning
              nativeLanguage={nativeLanguage}
              nativeLanguageCode={nativeLanguageCode}
              targetLanguage={targetLanguage}
              targetLanguageCode={targetLanguageCode}
              userId={user?.id}
              onBack={handleBackToTopics}
              onSettingsClick={handleSettingsClick}
              onPlaylistUpdate={refreshPlaylists}
            />
          </div>
        )}
        
        {currentPage === "learning" && selectedTopic?.id !== -1 && (
          <div 
            className="text-center transition-all duration-500 ease-in-out"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8 gap-2">
                <button
                  onClick={handleBackToTopics}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                </button>

                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center">
                  {/* Topic Icon */}
                  {(() => {
                    // Special case: Playlist learning (id === -2) - show notepad icon
                    if (selectedTopic?.id === -2) {
                      return <Icon icon="solar:notebook-bold" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }} />
                    }
                    
                    // First check if topic has an SVG icon in the JSON data
                    if (selectedTopic?.icon) {
                      return (
                        <div 
                          className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex-shrink-0" 
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                          dangerouslySetInnerHTML={{ __html: selectedTopic.icon! }}
                        />
                      );
                    }
                    
                    // Fall back to hardcoded iconify icons
                    const iconData = TOPIC_ICONS.find(icon => icon.id === selectedTopic?.id)
                    if (iconData) {
                      if (typeof iconData.icon === 'string') {
                        return <Icon icon={iconData.icon} className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }} />
                      }
                      const IconComponent = iconData.icon as any
                      return <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 text-white/80 flex-shrink-0" />
                    }
                    return <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-white/80 flex-shrink-0" />
                  })()}
                  <h1 className="text-lg sm:text-xl md:text-2xl font-medium text-white text-center truncate">{selectedTopic?.name}</h1>
                </div>
                
                <button
                  onClick={handleSettingsClick}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg flex-shrink-0"
                >
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                </button>
              </div>

              {/* Progress indicator */}
              {vocabulary.length > 0 && (
                <div className="mb-6 text-center">
                  <p className="text-white/60 text-sm">
                    {(() => {
                      const progress = getCategoryProgress()
                      return `${progress.current} of ${progress.total} words`
                    })()}
                  </p>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(() => {
                          const progress = getCategoryProgress()
                          return (progress.current / progress.total) * 100
                        })()}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Category indicator - shown for topics with categories */}
              {getCurrentContent().category && (
                <div className="mb-4 flex justify-center items-center gap-3">
                  {/* Navigation arrows only for Verbs and Common Phrases */}
                  {(selectedTopic?.id === 41 || selectedTopic?.id === 42) && (
                    <button
                      onClick={handlePreviousCategory}
                      className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-200 transform hover:scale-110"
                      disabled={vocabulary.length === 0}
                      title="Previous category"
                    >
                      <ChevronLeft className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-white/70 text-xs font-medium uppercase tracking-wider">
                    {getCurrentContent().category}
                  </span>
                  {/* Navigation arrows only for Verbs and Common Phrases */}
                  {(selectedTopic?.id === 41 || selectedTopic?.id === 42) && (
                    <button
                      onClick={handleNextCategory}
                      className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-200 transform hover:scale-110"
                      disabled={vocabulary.length === 0}
                      title="Next category"
                    >
                      <ChevronRight className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-6 mb-12" onTouchStart={(e) => e.stopPropagation()}>
                <div className={`bg-black/40 border border-white/20 rounded-2xl p-8 transition-all duration-300 shadow-lg ${
                  currentAudioStep === 'training' 
                    ? 'bg-blue-500/20 border-blue-400/30 scale-105' 
                    : 'bg-black/40'
                }`}>
                  <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
                    {targetLanguage}
                    {currentAudioStep === 'training' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-white text-2xl font-medium">{getCurrentContent().sourceWord}</p>
                  {settings.showPhonetics && phonetics[currentWordIndex]?.target && (
                    <p className="text-white/50 text-sm italic mt-2">/{phonetics[currentWordIndex].target}/</p>
                  )}
                </div>
                <div className={`bg-black/40 border border-white/20 rounded-2xl p-8 transition-all duration-300 shadow-lg ${
                  currentAudioStep === 'main' 
                    ? 'bg-blue-500/20 border-blue-400/30 scale-105' 
                    : 'bg-black/40'
                }`}>
                  <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
                    {nativeLanguage}
                    {currentAudioStep === 'main' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-white text-2xl font-medium">{getCurrentContent().targetWord}</p>
                  {settings.showPhonetics && phonetics[currentWordIndex]?.native && (
                    <p className="text-white/50 text-sm italic mt-2">/{phonetics[currentWordIndex].native}/</p>
                  )}
                </div>
              </div>

              {vocabulary.length === 0 && !isLoading ? (
                <div className="text-center mb-8">
                  <Button
                    onClick={handleBackToTopics}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-medium rounded-2xl h-12 px-8"
                  >
                    Try Different Topic or Languages
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={handlePrevious}
                    className="w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110"
                    disabled={vocabulary.length === 0}
                  >
                    <ChevronLeft className="w-7 h-7 text-white/80" />
                  </button>

                  <button
                    onClick={handlePlay}
                    className={`w-16 h-16 border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                      isPlaying || autoPlayActive
                        ? 'bg-red-500/30 hover:bg-red-500/40' 
                        : currentAudioStep === 'training'
                        ? 'bg-blue-500/30 hover:bg-blue-500/40'
                        : currentAudioStep === 'main'
                        ? 'bg-blue-500/30 hover:bg-blue-500/40'
                        : 'bg-black/40 hover:bg-black/50'
                    }`}
                    disabled={vocabulary.length === 0}
                  >
                    {isPlaying || autoPlayActive ? (
                      <Square className="w-8 h-8 text-white/80" />
                    ) : (
                      <Play className="w-8 h-8 text-white/80 ml-1" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    className="w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110"
                    disabled={vocabulary.length === 0}
                  >
                    <ChevronRight className="w-7 h-7 text-white/80" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single interface - only text changes */}
        {currentPage !== "confirmation" && currentPage !== "learning" && (
          <div className={`text-center mb-12 transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
            <h1 className="text-3xl font-normal text-white mb-8 transition-all duration-500">{questionText}</h1>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/40 border border-white/20 rounded-2xl h-12 text-white placeholder:text-white/60 focus:border-white/30 focus:ring-0 pl-12 text-base shadow-lg"
                  placeholder="Search languages..."
                />
              </div>
            </div>

            {/* Language Grid */}
            <div className="max-h-96 overflow-y-auto mb-6 language-grid-container">
              <div className="grid grid-cols-3 gap-4">
                {filteredLanguages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageSelect(language)}
                    className="p-5 bg-black/40 border border-white/20 rounded-xl hover:bg-black/50 transition-all duration-300 transform hover:scale-[1.02] text-center min-h-[75px] flex flex-col items-center justify-center gap-2 shadow-lg"
                  >
                    <Icon icon={getFlagIcon(language.code)} className="w-7 h-7" />
                    <p className="text-white font-medium text-sm leading-tight">{language.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page 3: Confirmation */}
        {currentPage === "confirmation" && (
          <div className="text-center transition-all duration-500 ease-in-out h-full flex flex-col min-h-0">
            {/* iPhone-style sliding topics interface */}
            <div className="flex-1 mb-4 min-h-0 overflow-hidden">
              <TopicSlider 
                topics={topics}
                selectedTopic={selectedTopic}
                onTopicSelect={handleTopicSelect}
                TOPIC_ICONS={TOPIC_ICONS}
                getTopicDisplayName={getTopicDisplayName}
                isIOS={isIOS}
                user={user}
                signOut={signOut}
                nativeLanguage={nativeLanguage}
                nativeLanguageCode={nativeLanguageCode}
                targetLanguage={targetLanguage}
                targetLanguageCode={targetLanguageCode}
                handleSignOut={handleSignOut}
                getFlagIcon={getFlagIcon}
                completedTopicIds={completedTopicIds}
                currentSection={currentSection}
                setCurrentSection={setCurrentSection}
                lastTopicSectionRef={lastTopicSectionRef}
                userPlaylists={userPlaylists}
                isLoadingPlaylists={isLoadingPlaylists}
                onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
                renderTopicButton={renderTopicButton}
                isPremium={isPremium}
                setShowPaywall={setShowPaywall}
              />
            </div>

            {/* Language selector at bottom */}
            <div className="flex-shrink-0 px-3 pb-3">
              <div className="flex items-center justify-center gap-3 max-w-full">
                <button
                  onClick={() => handleConfirmationLanguageChange("native")}
                  className="bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 hover:bg-black/50 transition-all duration-300 shadow-lg min-w-0"
                >
                  <p className="text-white font-medium text-sm truncate">{nativeLanguage}</p>
                </button>
                <div className="flex items-center justify-center flex-shrink-0">
                  <Languages className="w-5 h-5 text-white/60" />
                </div>
                <button
                  onClick={() => handleConfirmationLanguageChange("target")}
                  className="bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 hover:bg-black/50 transition-all duration-300 shadow-lg min-w-0"
                >
                  <p className="text-white font-medium text-sm truncate">{targetLanguage}</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal - Outside main container to avoid background blur */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className={`bg-white/5 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 md:p-8 w-full max-w-md sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl ${isIOS ? 'ios-glass-override' : ''}`}>
            <div className="flex items-center justify-end mb-4 sm:mb-6 md:mb-8">
              <button
                onClick={handleSettingsClose}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-black/30 transition-all duration-300 flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Playback Options */}
              <div>
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/80 text-sm">Auto-play</p>
                      <p className="text-white/50 text-xs">Automatically play audio when words change</p>
                    </div>
                    <button
                      onClick={() => updateSetting("autoPlay", !settings.autoPlay)}
                      className={`w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                        settings.autoPlay 
                          ? "bg-blue-500" 
                          : "bg-black/30 border border-white/20"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                        settings.autoPlay ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/80 text-sm">Play target language only</p>
                      <p className="text-white/50 text-xs">Skip native language translation</p>
                    </div>
                    <button
                      onClick={() => updateSetting("playTargetOnly", !settings.playTargetOnly)}
                      className={`w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                        settings.playTargetOnly 
                          ? "bg-blue-500" 
                          : "bg-black/30 border border-white/20"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                        settings.playTargetOnly ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/80 text-sm">Show phonetic pronunciation</p>
                      <p className="text-white/50 text-xs">Display IPA pronunciation guide</p>
                    </div>
                    <button
                      onClick={() => updateSetting("showPhonetics", !settings.showPhonetics)}
                      className={`w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                        settings.showPhonetics 
                          ? "bg-blue-500" 
                          : "bg-black/30 border border-white/20"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                        settings.showPhonetics ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pace Section */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Pace</h3>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <p className="text-white/80 text-sm mb-2 sm:mb-3">Pronunciation Speed:</p>
                    <div className="flex gap-2 sm:gap-3">
                      {["Slow", "Normal", "Fast"].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            console.log(`Pronunciation speed button clicked: ${speed}`)
                            updateSetting("pronunciationSpeed", speed)
                          }}
                          className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all duration-300 ${
                            settings.pronunciationSpeed === speed
                              ? "bg-white/20 border border-white/30 text-white"
                              : "bg-black/20 border border-white/10 text-white/70 hover:bg-black/30"
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/80 text-sm mb-2 sm:mb-3">Pause Duration between translations:</p>
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                      <input
                        type="range"
                        min="0.2"
                        max="10"
                        step="0.1"
                        value={settings.pauseBetweenTranslations}
                        onChange={(e) => updateSetting("pauseBetweenTranslations", Number.parseFloat(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-white/60 text-xs mt-2">
                        <span>0.2s</span>
                        <span className="text-white font-medium">{settings.pauseBetweenTranslations}s</span>
                        <span>10s</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/80 text-sm mb-2 sm:mb-3">Pause Duration for the next word:</p>
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                      <input
                        type="range"
                        min="0.2"
                        max="10"
                        step="0.1"
                        value={settings.pauseForNextWord}
                        onChange={(e) => updateSetting("pauseForNextWord", Number.parseFloat(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-white/60 text-xs mt-2">
                        <span>0.2s</span>
                        <span className="text-white font-medium">{settings.pauseForNextWord}s</span>
                        <span>10s</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/80 text-sm mb-2 sm:mb-3">Repeat Target Language Word:</p>
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={settings.repeatTargetLanguage}
                        onChange={(e) => updateSetting("repeatTargetLanguage", Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-white/60 text-xs mt-2">
                        <span>1x</span>
                        <span className="text-white font-medium">{settings.repeatTargetLanguage}x</span>
                        <span>5x</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/80 text-sm mb-2 sm:mb-3">Repeat Main Language Word:</p>
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={settings.repeatMainLanguage}
                        onChange={(e) => updateSetting("repeatMainLanguage", Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-white/60 text-xs mt-2">
                        <span>1x</span>
                        <span className="text-white font-medium">{settings.repeatMainLanguage}x</span>
                        <span>5x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSettingsClose}
              className="w-full mt-6 sm:mt-8 bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 text-white font-medium rounded-xl sm:rounded-2xl h-11 sm:h-12"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Create New Playlist</h3>
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(false)
                  setNewPlaylistName("")
                }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <Icon icon="solar:close-circle-bold" width="20" height="20" className="text-white/60" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-white/60 text-sm mb-2">
                This playlist will be for <span className="text-blue-400">{nativeLanguage}</span> → <span className="text-green-400">{targetLanguage}</span>
              </p>
            </div>
            
            <div className="relative mb-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value.slice(0, 22))}
                placeholder="Enter playlist name..."
                maxLength={22}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-400/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    handleCreatePlaylist()
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                {newPlaylistName.length}/22
              </span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(false)
                  setNewPlaylistName("")
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || isCreatingPlaylist}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {isCreatingPlaylist ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Playlist'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall}
        onCloseAction={() => setShowPaywall(false)}
        onSuccessAction={() => {
          setShowPaywall(false)
          refreshSubscription()
        }}
        nativeLanguageCode={nativeLanguageCode}
        targetLanguageCode={targetLanguageCode}
      />
    </div>
  )
}

export default LanguageSelector
