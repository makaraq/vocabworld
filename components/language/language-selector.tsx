"use client"
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Topic, VocabularyWord, VocabularyResponse, getTopics, getVocabularyForTopic } from "@/lib/database"
import { useAuth } from "@/contexts/auth-context"
import { ProgressStats } from "@/components/progress/progress-stats"
import { SearchWordLearning } from "@/components/learning/search-word-learning"
import { PaywallModal } from "@/components/paywall/paywall-modal"
import { ExampleSentencesModal, prefetchExampleSentences } from "@/components/learning/example-sentences-modal"
import { readCached, writeCached } from "@/lib/instant-cache"
import { idbGet, idbPut } from "@/lib/offline/offline-storage"
import { normalizeLangParam, vocabKey } from "@/lib/offline/offline-manager"
import { PlaylistSelectModal } from "@/components/learning/search-word-learning"
import { ManageAccountModal } from "@/components/account/manage-account-modal"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationPromptModal } from "@/components/notifications/notification-prompt-modal"
import { CoachMarkOverlay, type CoachMarkStep } from "@/components/tutorial/coach-mark-overlay"
import { hapticsLight, hapticsMedium, hapticsSuccess, hapticsWarning } from "@/lib/haptics"
import { BadgesCard } from "@/components/achievements/badges-card"
import { ReviewCard } from "@/components/review/review-card"
import { TopicQuizModal } from "@/components/quiz/topic-quiz-modal"
import { useAchievementContext } from "@/components/achievements/achievement-provider"
import {
  reportProgress,
  reportTopicComplete,
  evaluateTimeContext,
  findNextTopicAfter,
} from "@/lib/achievements/engine"
import { useT } from "@/components/providers/translation-provider"
import type { UiKey, UiVars } from "@/lib/i18n/ui-strings"

type TFn = (key: UiKey, vars?: UiVars) => string

// Coach-mark content comes from the ui-strings catalog so tours follow the
// user's main language. Built per-render via useMemo(getTutorialSteps(t), [t]).
function getTutorialSteps(t: TFn): CoachMarkStep[] {
  return [
    {
      selector: '[data-tour="topic-grid"] > button:first-child',
      title: t('tutorial.topics.1.title'),
      body: t('tutorial.topics.1.body'),
      padding: 4,
    },
    {
      selector: '[data-tour="section-nav"]',
      title: t('tutorial.topics.2.title'),
      body: t('tutorial.topics.2.body'),
      placement: 'top',
      padding: 8,
    },
    {
      selector: '[data-tour="language-switcher"]',
      title: t('tutorial.topics.3.title'),
      body: t('tutorial.topics.3.body'),
      placement: 'top',
      padding: 6,
    },
  ]
}

function getLearningTutorialSteps(t: TFn): CoachMarkStep[] {
  return [
    {
      selector: '[data-tour="learning-flashcards"]',
      title: t('tutorial.learning.1.title'),
      body: t('tutorial.learning.1.body'),
      placement: 'bottom',
      padding: 6,
    },
    {
      selector: '[data-tour="learning-controls"]',
      title: t('tutorial.learning.2.title'),
      body: t('tutorial.learning.2.body'),
      placement: 'top',
      padding: 10,
    },
    {
      selector: '[data-tour="learning-settings"]',
      title: t('tutorial.learning.3.title'),
      body: t('tutorial.learning.3.body'),
      placement: 'bottom',
      padding: 6,
    },
  ]
}

declare global {
  interface Window {
    // Reserved for future use
  }
}
import { Icon } from '@iconify/react'
import { Capacitor } from '@capacitor/core'
import { getFlagIcon } from '@/utils/flags'
import { PROGRESS_SYNCED_EVENT } from '@/lib/offline/progress-queue'
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

// One mdi set for every topic, so no page shows a different icon style than
// its neighbours.
import { getTopicIcon } from "@/lib/icons/topic-icons"

// Question text translations for "Choose the language you want to learn"
const QUESTION_TEXT_TRANSLATIONS: Record<string, string> = {
  'ar': 'اختر اللغة التي تريد تعلمها',
  'bg': 'Изберете езика, който искате да научите',
  'bn': 'আপনি যে ভাষা শিখতে চান তা নির্বাচন করুন',
  'ca': 'Trieu l\'idioma que voleu aprendre',
  'cs': 'Vyberte jazyk, který se chcete naučit',
  'cy': 'Dewiswch yr iaith rydych chi am ei dysgu',
  'da': 'Vælg det sprog, du vil lære',
  'de': 'Wählen Sie die Sprache aus, die Sie lernen möchten',
  'el': 'Επιλέξτε τη γλώσσα που θέλετε να μάθετε',
  'en': 'Choose the language you want to learn',
  'es': 'Elige el idioma que quieres aprender',
  'et': 'Valige keel, mida soovite õppida',
  'eu': 'Aukeratu ikasi nahi duzun hizkuntza',
  'fa': 'زبانی که می‌خواهید یاد بگیرید را انتخاب کنید',
  'fi': 'Valitse kieli, jonka haluat oppia',
  'fr': 'Choisissez la langue que vous souhaitez apprendre',
  'ga': 'Roghnaigh an teanga ar mhaith leat a fhoghlaim',
  'gu': 'તમે જે ભાષા શીખવા માંગો છો તે પસંદ કરો',
  'he': 'בחר את השפה שאתה רוצה ללמוד',
  'hi': 'वह भाषा चुनें जो आप सीखना चाहते हैं',
  'hr': 'Odaberite jezik koji želite naučiti',
  'hu': 'Válassza ki a nyelvet, amelyet tanulni szeretne',
  'id': 'Pilih bahasa yang ingin Anda pelajari',
  'is': 'Veldu tungumálið sem þú vilt læra',
  'it': 'Scegli la lingua che vuoi imparare',
  'ja': '学びたい言語を選んでください',
  'ko': '배우고 싶은 언어를 선택하세요',
  'lt': 'Pasirinkite kalbą, kurios norite mokytis',
  'lv': 'Izvēlieties valodu, kuru vēlaties apgūt',
  'mk': 'Изберете го јазикот што сакате да го научите',
  'ml': 'നിങ്ങൾ പഠിക്കാൻ ആഗ്രഹിക്കുന്ന ഭാഷ തിരഞ്ഞെടുക്കുക',
  'mr': 'तुम्हाला जी भाषा शिकायची आहे ती निवडा',
  'mt': 'Agħżel il-lingwa li trid titgħallem',
  'nl': 'Kies de taal die je wilt leren',
  'no': 'Velg språket du vil lære',
  'pl': 'Wybierz język, którego chcesz się nauczyć',
  'pt': 'Escolha o idioma que você deseja aprender',
  'ro': 'Alege limba pe care vrei să o înveți',
  'ru': 'Выберите язык, который хотите выучить',
  'sk': 'Vyberte jazyk, ktorý sa chcete naučiť',
  'sl': 'Izberite jezik, ki se ga želite naučiti',
  'sv': 'Välj det språk du vill lära dig',
  'ta': 'நீங்கள் கற்க விரும்பும் மொழியைத் தேர்ந்தெடுக்கவும்',
  'te': 'మీరు నేర్చుకోవాలనుకునే భాషను ఎంచుకోండి',
  'th': 'เลือกภาษาที่คุณต้องการเรียนรู้',
  'tr': 'Öğrenmek istediğiniz dili seçin',
  'uk': 'Виберіть мову, яку хочете вивчити',
  'ur': 'وہ زبان منتخب کریں جو آپ سیکھنا چاہتے ہیں',
  'vi': 'Chọn ngôn ngữ bạn muốn học',
  'zh': '选择您想学习的语言'
}

// iPhone-style Topic Slider Component
interface TopicSliderProps {
  topics: Topic[]
  selectedTopic: Topic | null
  onTopicSelect: (topic: Topic) => void
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
  setShowManageAccount: (show: boolean) => void
  sections: Array<{
    name: string
    icon: string
    topics: Topic[]
    gridCols: number
    isAccount?: boolean
    isDefault?: boolean
    isMyWords?: boolean
  }>
}

const TopicSlider: React.FC<TopicSliderProps> = ({ 
  topics, 
  selectedTopic, 
  onTopicSelect,
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
  setShowPaywall,
  setShowManageAccount,
  sections
}) => {
  const { t, tPlural } = useT()

  // ── Ref-based drag state (no re-renders during drag → 60 fps) ──
  const sliderRef = useRef<HTMLDivElement | null>(null)

  // Always-current section value for the ref callback (avoids stale closure)
  const currentSectionForRefCallback = useRef(currentSection)
  currentSectionForRefCallback.current = currentSection

  // Ref callback fires synchronously when the DOM element is created — before
  // useLayoutEffect and before the browser paints — so the slider is already at
  // the correct position on the very first frame. This prevents the flash of the
  // Account section (index 0) that appeared when TopicSlider remounted after
  // leaving the learning page.
  const sliderRefCallback = useCallback((el: HTMLDivElement | null) => {
    sliderRef.current = el
    if (el) {
      el.style.transform = `translateX(${-currentSectionForRefCallback.current * 100}%)`
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useRef({
    startX: 0,
    currentX: 0,
    offset: 0,
    dragging: false,
    transitioning: false,
    screenW: 0,
    raf: 0,
  })
  const dots = useRef({
    startX: null as number | null,
    endX: null as number | null,
    dragging: false,
  })
  
  // Use a stable container ref that persists across re-renders
  const iconContainerRef = useRef<HTMLDivElement>(null)
  const renderedIconsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  
  // Create or retrieve icon element for current section
  useEffect(() => {
    if (!iconContainerRef.current) return
    
    // Get or create icon element for this section
    let iconDiv = renderedIconsRef.current.get(currentSection)
    
    if (!iconDiv) {
      // Create new icon element
      iconDiv = document.createElement('div')
      iconDiv.innerHTML = sections[currentSection].icon
      iconDiv.className = 'w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center'
      iconDiv.style.color = 'currentColor'
      
      renderedIconsRef.current.set(currentSection, iconDiv)
      
      // After animation completes, set final values and remove animation elements
      setTimeout(() => {
        if (!iconDiv) return
        
        // Set stroke-dashoffset to 0 (final state)
        const pathsWithDash = iconDiv.querySelectorAll('[stroke-dashoffset]')
        pathsWithDash.forEach(el => {
          el.setAttribute('stroke-dashoffset', '0')
        })
        
        // Set fill-opacity to full opacity (1)
        const pathsWithFillOpacity = iconDiv.querySelectorAll('[fill-opacity="0"]')
        pathsWithFillOpacity.forEach(el => {
          el.setAttribute('fill-opacity', '1')
        })
        
        // Now remove animation elements
        const animateElements = iconDiv.querySelectorAll('animate, animateMotion, animateTransform')
        animateElements.forEach(el => el.remove())
      }, 2000)
    }
    
    // Mount the icon (move it to the container, don't clone)
    if (iconContainerRef.current && iconDiv) {
      iconContainerRef.current.innerHTML = ''
      iconContainerRef.current.appendChild(iconDiv)
    }
    
    // Cleanup: when section changes, we detach but don't destroy (kept in Map)
    return () => {
      // Don't remove from DOM here - will be reattached when we come back
    }
  }, [currentSection])

  // ── Direct-DOM drag helpers (no setState → no re-renders → 60 fps) ──
  const applyTransform = (section: number, offset: number) => {
    if (!sliderRef.current) return
    const pct = -section * 100 + (offset / drag.current.screenW) * 100
    sliderRef.current.style.transform = `translateX(${pct}%)`
  }

  const snapTo = (section: number) => {
    if (!sliderRef.current) return
    sliderRef.current.style.transition = 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)'
    sliderRef.current.style.transform = `translateX(${-section * 100}%)`
  }

  // Set initial position before first paint to prevent flash of section 0 (Account) on remount
  useLayoutEffect(() => {
    if (!sliderRef.current) return
    sliderRef.current.style.transform = `translateX(${-currentSection * 100}%)`
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync slider position whenever currentSection changes externally (dots, keyboard)
  useEffect(() => {
    snapTo(currentSection)
  }, [currentSection])

  // Clean up transition class after animation ends
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    const handler = () => {
      el.style.transition = ''
      drag.current.transitioning = false
    }
    el.addEventListener('transitionend', handler)
    return () => el.removeEventListener('transitionend', handler)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (drag.current.transitioning) return
    const d = drag.current
    d.startX = e.targetTouches[0].clientX
    d.currentX = d.startX
    d.dragging = false
    d.offset = 0
    d.screenW = window.innerWidth
    if (sliderRef.current) sliderRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (drag.current.transitioning) return
    const d = drag.current
    d.currentX = e.targetTouches[0].clientX
    d.dragging = true
    let diff = d.currentX - d.startX
    // Rubber-band at edges
    if ((currentSection === 0 && diff > 0) || (currentSection === sections.length - 1 && diff < 0)) {
      diff *= 0.3
    }
    d.offset = Math.max(-d.screenW * 0.8, Math.min(d.screenW * 0.8, diff))
    cancelAnimationFrame(d.raf)
    d.raf = requestAnimationFrame(() => applyTransform(currentSection, d.offset))
  }

  const handleTouchEnd = () => {
    const d = drag.current
    cancelAnimationFrame(d.raf)
    if (!d.dragging) return

    const distance = d.startX - d.currentX
    const threshold = Math.min(50, d.screenW * 0.15)
    const dragPct = Math.abs(d.offset) / d.screenW

    let next = currentSection
    if ((distance > threshold || (distance > 0 && dragPct > 0.3)) && currentSection < sections.length - 1) {
      next = currentSection + 1
    } else if ((distance < -threshold || (distance < 0 && dragPct > 0.3)) && currentSection > 0) {
      next = currentSection - 1
    }

    d.dragging = false
    d.offset = 0
    d.transitioning = true
    snapTo(next)
    if (next !== currentSection) setCurrentSection(next)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drag.current.transitioning) return
    const d = drag.current
    d.startX = e.clientX
    d.currentX = d.startX
    d.dragging = false
    d.offset = 0
    d.screenW = window.innerWidth
    if (sliderRef.current) sliderRef.current.style.transition = 'none'

    const onMove = (me: MouseEvent) => {
      if (d.transitioning) return
      d.currentX = me.clientX
      d.dragging = true
      let diff = d.currentX - d.startX
      if ((currentSection === 0 && diff > 0) || (currentSection === sections.length - 1 && diff < 0)) diff *= 0.3
      d.offset = Math.max(-d.screenW * 0.8, Math.min(d.screenW * 0.8, diff))
      cancelAnimationFrame(d.raf)
      d.raf = requestAnimationFrame(() => applyTransform(currentSection, d.offset))
    }

    const onUp = () => {
      cancelAnimationFrame(d.raf)
      if (d.dragging) {
        const distance = d.startX - d.currentX
        const threshold = Math.min(50, d.screenW * 0.15)
        const dragPct = Math.abs(d.offset) / d.screenW
        let next = currentSection
        if ((distance > threshold || (distance > 0 && dragPct > 0.3)) && currentSection < sections.length - 1) next = currentSection + 1
        else if ((distance < -threshold || (distance < 0 && dragPct > 0.3)) && currentSection > 0) next = currentSection - 1
        d.transitioning = true
        snapTo(next)
        if (next !== currentSection) setCurrentSection(next)
      }
      d.dragging = false
      d.offset = 0
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const currentSectionData = sections[currentSection]

  return (
    <div className="h-full flex flex-col">
      {/* Section title */}
      <div className="mb-2 px-3 py-1 flex-shrink-0">
        <h2 className="font-medium flex items-center justify-center gap-2.5 text-white">
          <div ref={iconContainerRef} />
          <span className="text-lg xs:text-xl sm:text-2xl tracking-wide leading-none">{currentSectionData.name}</span>
        </h2>
      </div>

      {/* Sliding container with drag support */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={sliderRefCallback}
          className="flex h-full"
          style={{ willChange: 'transform', cursor: 'grab' }}
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="w-full h-full flex-shrink-0 px-2">
              {/* Account section special content */}
              {section.isAccount ? (
                <div className="h-full flex flex-col space-y-2.5 xs:space-y-3 sm:space-y-3">
                  {/* Progress Section with Real Data */}
                  {targetLanguageCode && (
                    <ProgressStats 
                      targetLanguageCode={targetLanguageCode}
                      targetLanguageName={targetLanguage}
                      nativeLanguageCode={nativeLanguageCode}
                    />
                  )}

                  {/* Daily Reminder & Goal Cards */}
                  <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-3">
                    <ReviewCard userId={user?.id} targetLanguageCode={targetLanguageCode} nativeLanguageCode={nativeLanguageCode} />
                    <BadgesCard />
                  </div>

                  {/* Manage Account Button */}
                  <button
                    onClick={() => setShowManageAccount(true)}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 xs:py-3.5 px-4 rounded-2xl font-semibold text-sm hover:bg-white/15 transition-all flex items-center justify-center space-x-2"
                  >
                    <Icon icon="solar:user-circle-bold" width="18" height="18" className="text-white/70" />
                    <span>{t('accountSection.manageAccount')}</span>
                    <Icon icon="solar:alt-arrow-right-bold" width="16" height="16" className="text-white/40 ml-auto" />
                  </button>
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
                    className="flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center hover:bg-white/15 transition-colors duration-300 shadow-lg relative"
                    aria-label={t('myWords.searchWord.aria')}
                  >

                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Icon icon="solar:magnifer-bold" width="32" height="32" className="sm:w-10 sm:h-10 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-lg sm:text-xl font-semibold">{t('myWords.searchWord')}</p>
                        <p className="text-white/60 text-sm mt-1">{t('myWords.searchWordDesc')}</p>
                      </div>
                    </div>
                  </button>

                  {/* My Playlists Section - show 5 items then scroll */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-5 border border-white/20 flex flex-col overflow-hidden max-h-[340px] lg:max-h-[480px] min-h-[100px]">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 className="text-white font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Icon icon="solar:playlist-bold" width="20" height="20" className="text-blue-400" />
                        {t('myWords.myPlaylists')}
                      </h3>
                      <button
                        onClick={onCreatePlaylist}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                        aria-label={t('myWords.createPlaylist.aria')}
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
                          <p className="text-white/50 text-sm">{t('myWords.loadingPlaylists')}</p>
                        </div>
                      )}
                      
                      {/* Empty state */}
                      {!isLoadingPlaylists && userPlaylists.length === 0 && (
                        <div className="text-center py-6">
                          <Icon icon="solar:folder-with-files-bold-duotone" width="48" height="48" className="text-white/30 mx-auto mb-3" />
                          <p className="text-white/50 text-sm">{t('myWords.noPlaylists')}</p>
                          <p className="text-white/40 text-xs mt-1">{t('myWords.noPlaylistsHint')}</p>
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
                              <Icon icon={playlist.icon || "solar:playlist-minimalistic-2-linear"} width="22" height="22" className="text-blue-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{playlist.name}</p>
                                <p className="text-white/50 text-xs">{tPlural('myWords.wordCount', playlist.word_count || 0)}</p>
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
                  data-tour={currentSection === sectionIndex ? "topic-grid" : undefined}
                  className={`grid gap-2.5 sm:gap-3 lg:gap-4 h-full content-start ${
                    section.gridCols === 3 ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {section.topics.map(renderTopicButton)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation dots - iPhone-style draggable indicators */}
      <nav
        data-tour="section-nav"
        className="flex justify-center gap-3 mt-3 pb-2 pt-2 px-4 flex-shrink-0 cursor-grab active:cursor-grabbing"
        role="tablist"
        aria-label={t('sections.aria.nav')}
        onTouchStart={(e) => {
          e.preventDefault()
          dots.current = { startX: e.touches[0].clientX, endX: null, dragging: false }
        }}
        onTouchMove={(e) => {
          const dt = dots.current
          if (dt.startX === null) return
          e.preventDefault()
          dt.endX = e.touches[0].clientX
          if (Math.abs(dt.endX - dt.startX) > 10) dt.dragging = true
        }}
        onTouchEnd={(e) => {
          const dt = dots.current
          if (dt.startX === null) { dots.current = { startX: null, endX: null, dragging: false }; return }

          if (dt.endX !== null) {
            const distance = dt.startX - dt.endX
            if (Math.abs(distance) > 50) {
              e.stopPropagation()
              if (distance > 0 && currentSection < sections.length - 1) {
                drag.current.transitioning = true; setCurrentSection(currentSection + 1)
              } else if (distance < 0 && currentSection > 0) {
                drag.current.transitioning = true; setCurrentSection(currentSection - 1)
              }
              dots.current = { startX: null, endX: null, dragging: false }
              return
            }
          }

          if (!dt.dragging || dt.endX === null) {
            const touch = e.changedTouches[0]
            const el = document.elementFromPoint(touch.clientX, touch.clientY)
            const btn = el?.closest('button[role="tab"]')
            const tabId = btn?.getAttribute('id')
            const idx = tabId ? parseInt(tabId.replace('section-tab-', ''), 10) : -1
            if (idx >= 0 && idx < sections.length && idx !== currentSection) {
              drag.current.transitioning = true; setCurrentSection(idx)
            }
          }
          dots.current = { startX: null, endX: null, dragging: false }
        }}
        onMouseDown={(e) => {
          const dt = dots.current
          dt.startX = e.clientX; dt.endX = null; dt.dragging = false

          const onMove = (me: MouseEvent) => {
            dt.endX = me.clientX
            if (dt.startX !== null && Math.abs(me.clientX - dt.startX) > 10) dt.dragging = true
          }
          const onUp = (ue: MouseEvent) => {
            if (dt.startX !== null && dt.endX !== null) {
              const distance = dt.startX - dt.endX
              if (Math.abs(distance) > 50) {
                if (distance > 0 && currentSection < sections.length - 1) {
                  drag.current.transitioning = true; setCurrentSection(currentSection + 1)
                } else if (distance < 0 && currentSection > 0) {
                  drag.current.transitioning = true; setCurrentSection(currentSection - 1)
                }
              } else if (!dt.dragging) {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ue.clientX - rect.left
                const idx = Math.floor(x / (rect.width / sections.length))
                if (idx >= 0 && idx < sections.length && idx !== currentSection) {
                  drag.current.transitioning = true; setCurrentSection(idx)
                }
              }
            }
            dots.current = { startX: null, endX: null, dragging: false }
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }}
      >
        {sections.map((section, index) => {
          return (
            <button
              key={index}
              role="tab"
              aria-selected={index === currentSection}
              aria-controls={`section-panel-${index}`}
              aria-label={t('sections.aria.navigateTo', { section: section.name })}
              id={`section-tab-${index}`}
              onClick={() => {
                if (!drag.current.dragging && !drag.current.transitioning && !dots.current.dragging) {
                  drag.current.transitioning = true
                  setCurrentSection(index)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!drag.current.dragging && !drag.current.transitioning) {
                    drag.current.transitioning = true
                    setCurrentSection(index)
                  }
                }
                if (e.key === 'ArrowRight' && index < sections.length - 1) {
                  e.preventDefault()
                  document.getElementById(`section-tab-${index + 1}`)?.focus()
                }
                if (e.key === 'ArrowLeft' && index > 0) {
                  e.preventDefault()
                  document.getElementById(`section-tab-${index - 1}`)?.focus()
                }
              }}
              className={`relative focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent ${
                index === currentSection 
                  ? 'w-3 h-3 bg-white rounded-full shadow-lg' 
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60 rounded-full'
              }`}
              title={section.name}
            >
              {/* Show the section name only for the active dot to avoid overlap */}
              {index === currentSection && (index === 0 || index === 1) && (
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/80 whitespace-nowrap">
                  {index === 0 ? t('sections.dot.account') : t('sections.dot.firstAid')}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

type PageState = "native" | "target" | "confirmation" | "learning"

export function LanguageSelector() {
  const { t, tPlural, setUiLanguage } = useT()
  const tutorialSteps = useMemo(() => getTutorialSteps(t), [t])
  const learningTutorialSteps = useMemo(() => getLearningTutorialSteps(t), [t])

  // Custom sign out handler that resets to first page
  const handleSignOut = async () => {
    try {
      
      // First, reset all local state immediately to prevent UI issues
      setCurrentPage("native")
      setCurrentSection(1) // Back to FIRST AID KIT so re-login doesn't strand the user on ACCOUNT
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
      
      
      // The welcome overlay will automatically appear due to the auth context
    } catch (error) {
      console.error('Sign out failed:', error)
      // Even if sign out fails, reset the local state
      setCurrentPage("native")
      setCurrentSection(1)
      setQuestionText("What language do you speak?")
    }
  }

  const { user, signOut, signInWithGoogle, isPremium, subscriptionStatus, canAccessTopic, refreshSubscription, loading } = useAuth()
  const [showPaywall, setShowPaywall] = useState(false)
  const [showManageAccount, setShowManageAccount] = useState(false)
  const [openNotificationsInAccount, setOpenNotificationsInAccount] = useState(false)
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false)
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)
  const [notifPromptVariant, setNotifPromptVariant] = useState<'enable' | 'settings'>('settings')
  const [showTutorial, setShowTutorial] = useState(false)
  const [showLearningTutorial, setShowLearningTutorial] = useState(false)

  const handleNotifPromptDismiss = () => {
    localStorage.setItem('vw_notif_prompted', 'true')
    setShowNotifPrompt(false)
  }

  const handleOpenAppSettings = async () => {
    const { openAppSettings } = await import('@/lib/notifications')
    openAppSettings()
  }

  // Refresh subscription data from RC every time the account modal opens
  // so that renewal dates are always current (especially important in sandbox
  // where webhook delivery to localhost is not reliable).
  useEffect(() => {
    if (!showManageAccount) return
    fetch('/api/subscription/sync-rc', { method: 'POST' })
      .then(() => refreshSubscription())
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showManageAccount])

  // Load leaderboard opt-in state when account modal opens
  useEffect(() => {
    if (!showManageAccount || !user?.id) return
    fetch(`/api/leaderboard/opt-in?userId=${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setShowOnLeaderboard(data.showOnLeaderboard) })
      .catch(() => {})
  }, [showManageAccount, user?.id])

  const handleLeaderboardToggle = async (enabled: boolean) => {
    setShowOnLeaderboard(enabled)
    try {
      await fetch('/api/leaderboard/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, showOnLeaderboard: enabled }),
      })
    } catch {
      setShowOnLeaderboard(!enabled)
    }
  }

  // Debug auth state
  useEffect(() => {
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
  const [uiTranslations, setUiTranslations] = useState<Record<string, string>>({})
  const [topicTranslations, setTopicTranslations] = useState<Record<number, string>>({})
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, string>>({})
  const [languageTranslations, setLanguageTranslations] = useState<Record<string, string>>({}) // Available for future use
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
  
  // Track if settings have been loaded from database
  const settingsLoadedRef = useRef(false)
  const [settingsInitialized, setSettingsInitialized] = useState(false)
  
  // Default settings
  const defaultSettings = {
    autoPlay: true, // Auto-play enabled by default as requested
    trainingLanguageVoice: "Male" as "Female" | "Male", // Changed to Male
    mainLanguageVoice: "Male" as "Female" | "Male",
    pronunciationSpeed: "Normal" as "Slow" | "Normal" | "Fast",
    pauseBetweenTranslations: 0.2, // 0.2 seconds by default
    pauseForNextWord: 0.2, // 0.2 seconds by default
    repeatTargetLanguage: 1, // 1x by default
    repeatMainLanguage: 1, // 1x by default
    playTargetOnly: false, // Play only target language (skip native translation)
    showPhonetics: false, // Show IPA phonetic pronunciations below words
    rewindEnabled: false, // Loop back to start word after N words
    rewindAfterWords: 5, // Number of words before rewinding
  }
  
  const [settings, setSettings] = useState(defaultSettings)

  // Load user settings from database
  useEffect(() => {
    
    const loadUserSettings = async () => {
      if (!user?.id) {
        if (!settingsInitialized) {
          setSettingsInitialized(true)
          settingsLoadedRef.current = true // Mark as "loaded" so we don't prevent saves
        }
        return
      }
      
      try {
        const response = await fetch('/api/settings')
        
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setSettings(data.settings)
            notificationsHook.loadPrefsFromSettings(data.settings)
            settingsLoadedRef.current = true
            setSettingsInitialized(true)
          }
        } else {
          console.error('⚠️ Failed to load settings - HTTP', response.status)
          // Still mark as initialized so user can save changes
          settingsLoadedRef.current = true
          setSettingsInitialized(true)
        }
      } catch (error) {
        console.error('❌ Error loading user settings:', error)
        // Still mark as initialized
        settingsLoadedRef.current = true
        setSettingsInitialized(true)
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
        document.documentElement.classList.add('ios-device');
      }
    };
    
    detectIOS();
  }, []);

  // 💾 Persist language selection so the app reopens on the topic page
  useEffect(() => {
    if (nativeLanguageCode) {
      localStorage.setItem('nativeLanguageCode', nativeLanguageCode)
      // Keep the UI-string language in sync with the chosen main language
      // (fires on both manual selection and cold-start restore).
      void setUiLanguage(nativeLanguageCode)
    }
    if (targetLanguageCode) localStorage.setItem('targetLanguageCode', targetLanguageCode)
  }, [nativeLanguageCode, targetLanguageCode, setUiLanguage])

  // 🔄 Restore last language selection on every cold start (and after payment)
  useEffect(() => {
    // Clean up any payment-specific flags
    localStorage.removeItem('restoreLanguages')
    localStorage.removeItem('restoreToTopicView')

    const savedNativeCode = localStorage.getItem('nativeLanguageCode')
    const savedTargetCode = localStorage.getItem('targetLanguageCode')

    if (savedNativeCode && savedTargetCode) {
      // Language names are resolved later by the full getLanguageName defined below;
      // for now store the code as a temporary display name — it will be overwritten
      // on the first render that has access to getLanguageName via normal state flow.
      setNativeLanguageCode(savedNativeCode)
      setNativeLanguage(savedNativeCode)
      setTargetLanguageCode(savedTargetCode)
      setTargetLanguage(savedTargetCode)
      setCurrentPage('confirmation')
    }
  }, [])

  // 📊 Set global variables for progress tracking in audio service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__vocaWorldUserId = user?.id || null;
      (window as any).__vocaWorldTargetLangCode = targetLanguageCode || null;
    }
  }, [user?.id, targetLanguageCode]);

  // 📋 Fetch playlists function - can be called from child components.
  // The last known playlists paint immediately from localStorage and the
  // fetch refreshes them silently — the loading state only exists for the
  // very first load on a device.
  const refreshPlaylists = useCallback(async () => {
    if (!user?.id || !nativeLanguageCode || !targetLanguageCode) return

    const cacheKey = `playlists:${user.id}:${nativeLanguageCode}:${targetLanguageCode}`
    const cached = readCached<any[]>(cacheKey)
    if (cached) {
      setUserPlaylists(cached)
    } else {
      setIsLoadingPlaylists(true)
    }
    try {
      const response = await fetch(
        `/api/playlists?userId=${user.id}&sourceLanguageCode=${nativeLanguageCode}&targetLanguageCode=${targetLanguageCode}`
      )
      if (response.ok) {
        const data = await response.json()
        setUserPlaylists(data.playlists || [])
        writeCached(cacheKey, data.playlists || [])
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }, [user?.id, nativeLanguageCode, targetLanguageCode])

  // 📋 Prefetch playlists as soon as user + languages are known so the
  // MY WORDS section is already populated before the user swipes to it.
  useEffect(() => {
    refreshPlaylists()
  }, [refreshPlaylists])

  // 📋 Refresh (silently) whenever the MY WORDS section becomes visible
  useEffect(() => {
    // MY WORDS section is index 7 (8th section, 0-based)
    const MY_WORDS_SECTION_INDEX = 7
    if (currentSection !== MY_WORDS_SECTION_INDEX) return

    refreshPlaylists()
  }, [currentSection, refreshPlaylists]);

  // 🌍 Fetch UI translations for section names
  useEffect(() => {
    const fetchUiTranslations = async () => {
      if (!nativeLanguageCode) {
        setUiTranslations({})
        return
      }
      
      try {
        const response = await fetch(`/api/ui-translations?languageCode=${nativeLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setUiTranslations(data.translations || {})
        }
      } catch (error) {
        console.error('Error fetching UI translations:', error)
      }
    }
    
    fetchUiTranslations()
  }, [nativeLanguageCode])

  // 🌍 Fetch topic translations
  useEffect(() => {
    const fetchTopicTranslations = async () => {
      if (!nativeLanguageCode) {
        setTopicTranslations({})
        return
      }
      
      try {
        const response = await fetch(`/api/topic-translations?languageCode=${nativeLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setTopicTranslations(data.translations || {})
        }
      } catch (error) {
        console.error('Error fetching topic translations:', error)
      }
    }
    
    fetchTopicTranslations()
  }, [nativeLanguageCode])

  // 🏷️ Fetch category translations
  useEffect(() => {
    const fetchCategoryTranslations = async () => {
      if (!nativeLanguageCode) {
        setCategoryTranslations({})
        return
      }
      
      try {
        const response = await fetch(`/api/category-translations?languageCode=${nativeLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setCategoryTranslations(data)
        }
      } catch (error) {
        console.error('Error fetching category translations:', error)
      }
    }
    
    fetchCategoryTranslations()
  }, [nativeLanguageCode])

  // 🌍 Fetch language name translations (available for future use)
  useEffect(() => {
    const fetchLanguageTranslations = async () => {
      if (!nativeLanguageCode) {
        setLanguageTranslations({})
        return
      }
      
      try {
        const response = await fetch(`/api/language-translations?languageCode=${nativeLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setLanguageTranslations(data)
        }
      } catch (error) {
        console.error('Error fetching language translations:', error)
      }
    }
    
    fetchLanguageTranslations()
  }, [nativeLanguageCode])

  // Helper function to get translated section name
  const getTranslatedSectionName = (key: string, fallback: string) => {
    return uiTranslations[key] || fallback
  }

  // Database state
  const [topics, setTopics] = useState<Topic[]>([])
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([])
  const [totalWords, setTotalWords] = useState<number>(0)
  const [currentOffset, setCurrentOffset] = useState<number>(0)
  const [hasMoreWords, setHasMoreWords] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [completedTopicIds, setCompletedTopicIds] = useState<number[]>([])
  const [topicCompletionCounts, setTopicCompletionCounts] = useState<Record<number, number>>({})

  // Define the 7 sections with their topics and metadata (Account first, but FIRST AID KIT is default)
  // Sections with dynamic translations
  const sections = useMemo(() => [
    {
      name: getTranslatedSectionName('PROFILE', 'ACCOUNT'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" fill-opacity="0" stroke-dasharray="20" stroke-dashoffset="20" d="M12 12c2.21 0 4 -1.79 4 -4c0 -2.21 -1.79 -4 -4 -4c-2.21 0 -4 1.79 -4 4c0 2.21 1.79 4 4 4Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="20;0"/></path><path stroke-dasharray="36" stroke-dashoffset="36" d="M20 20c0 -4.42 -3.58 -8 -8 -8c-4.42 0 -8 3.58 -8 8"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.4s" values="36;0"/></path></g></svg>',
      topics: [], // No topics, this is a special page
      gridCols: 1,
      isAccount: true // Special flag for account page
    },
    {
      name: getTranslatedSectionName('FIRST_AID_KIT', 'FIRST AID KIT'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGDmnSdctG"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M9 7h11c0.55 0 1 0.45 1 1v11c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11c0 -0.55 0.45 -1 1 -1Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.9s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke-dasharray="16" stroke-dashoffset="16" d="M9 7v-3c0 -0.55 0.45 -1 1 -1h4c0.55 0 1 0.45 1 1v3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="16;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M12 11v6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="8;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M9 14h6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="8;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGDmnSdctG)"/></svg>',
      topics: topics.slice(0, 6), // 6 topics: Greetings, Numbers, Time, Emergency, Directions, Travel
      gridCols: 2,
      isDefault: true // This will be the default page
    },
    {
      name: getTranslatedSectionName('DAILY_LIFE', 'DAILY LIFE'), 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" d="M17 14v4c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-4Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"/></path><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="48" stroke-dashoffset="48" d="M17 9v9c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-9Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="48;0"/></path><path stroke-dasharray="14" stroke-dashoffset="14" d="M17 9h3c0.55 0 1 0.45 1 1v3c0 0.55 -0.45 1 -1 1h-3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="14;0"/></path><mask id="SVGnGEayvOG"><path stroke="#fff" d="M8 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M12 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M16 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4"><animateMotion calcMode="linear" dur="3s" path="M0 0v-8" repeatCount="indefinite"/></path></mask><rect width="24" height="0" y="7" fill="currentColor" mask="url(#SVGnGEayvOG)"><animate fill="freeze" attributeName="y" begin="0.8s" dur="0.6s" values="7;2"/><animate fill="freeze" attributeName="height" begin="0.8s" dur="0.6s" values="0;5"/></rect></g></svg>',
      topics: topics.slice(6, 14), // 8 topics: Shopping, Food, Health, Home, Family, Personal Style, Weather & Nature, Places
      gridCols: 2
    },
    {
      name: getTranslatedSectionName('WORK_AND_SCHOOL', 'WORK & SCHOOL'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="20" stroke-dashoffset="20" d="M3 21h18"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"/></path><path fill="currentColor" fill-opacity="0" stroke-dasharray="48" stroke-dashoffset="48" d="M7 17v-4l10 -10l4 4l-10 10h-4"><animate fill="freeze" attributeName="fill-opacity" begin="1.1s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.6s" values="48;0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M14 6l4 4"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="8;0"/></path></g></svg>',
      topics: topics.slice(20, 28), // 8 topics: Professions, Education, History & Culture, Science, Technology, Arts, Mathematics, Colors
      gridCols: 2
    },
    {
      name: getTranslatedSectionName('PERSONAL_AND_SOCIAL_LIFE', 'PERSONAL & SOCIAL LIFE'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGydZajcRT"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M9 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.2s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M15 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="12" stroke-dashoffset="12" d="M8 14c0.5 1.5 1.79 3 4 3c2.21 0 3.5 -1.5 4 -3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="12;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGydZajcRT)"/></svg>',
      topics: topics.slice(14, 20), // 6 topics: Emotions & Feelings, Personality, Actions, Hobbies, Sports, Adjectives
      gridCols: 2
    },
    {
      name: getTranslatedSectionName('CULTURE_AND_SOCIETY', 'CULTURE & SOCIETY'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-dasharray="80" stroke-dashoffset="80" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.47 5.94c1.83 1.37 3.81 4.14 4.53 5.63c0.72 -1.49 2.7 -4.26 4.53 -5.63c1.33 -0.99 3.47 -1.75 3.47 0.68c0 0.49 -0.28 4.08 -0.45 4.66c-0.57 2.03 -2.65 2.55 -4.5 2.23c3.24 0.55 4.06 2.36 2.28 4.17c-3.38 3.44 -4.85 -0.87 -5.23 -1.97c-0.07 -0.2 -0.1 -0.3 -0.1 -0.22c-0 -0.08 -0.03 0.02 -0.1 0.22c-0.38 1.1 -1.86 5.41 -5.23 1.97c-1.78 -1.81 -0.96 -3.63 2.28 -4.17c-1.85 0.31 -3.93 -0.21 -4.5 -2.23c-0.17 -0.58 -0.45 -4.18 -0.45 -4.66c0 -2.43 2.14 -1.67 3.47 -0.68Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="80;0"/></path></svg>',
      topics: topics.slice(28, 36), // 8 topics: Business & Economics, Politics & Law, Religion & Philosophy, Cultural Integration, Environment, Media, Mythology & Fantasy, Celebrations & Holidays
      gridCols: 2
    },
    {
      name: getTranslatedSectionName('PROFESSIONAL', 'PROFESSIONAL'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="64" stroke-dashoffset="64" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l-9 3.5v6.5c0 3.5 3.5 9 8 10c4.5 -1 8 -6.5 8 -10v-6.5l-8 -3.5Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path></svg>',
      topics: topics.slice(36, 43), // 7 topics: Common Collocations, Modern Expressions, Formal Language, Verbs, Daily Language, Essential Words, Example Sentences
      gridCols: 2
    },
    {
      name: getTranslatedSectionName('MY_WORDS', 'MY WORDS'),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3v18h18V3zm16 16H5V5h14zm-7-2h5v-2h-5zm0-4h5V9h-5zm-6 4h4v-6H6zm0-8h10V7H6z"/></svg>',
      topics: [], // No predefined topics - this is for custom word search
      gridCols: 1,
      isMyWords: true // Special flag for My Words section
    }
  ], [uiTranslations, topics])

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
  
  // B2 Audio service state
  const [activeAudioService, setActiveAudioService] = useState<string>("None")
  const [alnilamService, setAlnilamService] = useState<any>(null)
  const alnilamServiceRef = useRef<any>(null)

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

  // Speech speed mapping - using conservative values to minimize pitch distortion
  // Even with preservesPitch, extreme values can still sound unnatural
  const getSpeedRate = (speed: string): number => {
    let rate: number
    switch (speed) {
      case 'Slow': rate = 0.9; break  // 10% slower — minimal time-stretch artifacts
      case 'Fast': rate = 1.1; break  // 10% faster — minimal time-stretch artifacts
      default: rate = 1.0 // Normal
    }
    return rate
  }

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
      } catch (e) {
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
      }
      
      // Create and play a short silent buffer to fully unlock
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      
      audioUnlockedRef.current = true
      return true
    } catch (error) {
      return false
    }
  }
  
  // 🔊 Play audio through Web Audio API for reliable mobile playback
  // Note: Web Audio API's playbackRate changes pitch along with speed.
  // For true pitch preservation, we would need time-stretching algorithms (WSOLA, Phase Vocoder)
  // However, for language learning, slight pitch change can actually help differentiate speeds
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
        
        
      } catch (error) {
        console.error('Web Audio playback error:', error)
        reject(error)
      }
    })
  }
  
  // Fallback: regular HTML Audio element playback WITH pitch preservation
  const playAudioFallback = (url: string, playbackRate: number = 1.0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.crossOrigin = 'anonymous'
      
      // Set pitch preservation BEFORE playbackRate so the browser initialises
      // its time-stretching algorithm in pitch-preserving mode from the start.
      // Must try all vendor-prefixed variants for Capacitor (iOS/Android WebViews).
      try {
        if ('preservesPitch' in audio) {
          (audio as any).preservesPitch = true
        }
        if ('webkitPreservesPitch' in audio) {
          (audio as any).webkitPreservesPitch = true
        }
        if ('mozPreservesPitch' in audio) {
          (audio as any).mozPreservesPitch = true
        }
      } catch (e) {
        console.warn('⚠️ Could not set pitch preservation:', e)
      }
      
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
  
  // Combined audio player - PRIORITIZES pitch preservation when speed != 1.0
  const playAudioUniversal = async (url: string, playbackRate: number = 1.0): Promise<void> => {
    // STRATEGY: When speed adjustment is needed (not 1.0x), prefer HTML Audio with preservesPitch
    // This gives true pitch preservation instead of the distortion from Web Audio API
    
    if (playbackRate !== 1.0) {
      // Use HTML Audio for speed adjustments (better pitch preservation)
      try {
        await playAudioFallback(url, playbackRate)
        return
      } catch (error) {
        // Fall back to Web Audio if HTML Audio fails
        if (audioContextRef.current && audioUnlockedRef.current) {
          await playAudioWithWebAudio(url, playbackRate)
        } else {
          throw error
        }
      }
    }
    
    // 🔒 LOCK SCREEN FIX: Always prefer HTML Audio (<audio> element) over Web Audio API.
    // The iOS Media Session (lock screen controls) only activates for <audio> elements —
    // AudioContext / Web Audio API is invisible to the OS media session on iOS.
    // HTML Audio is also perfectly reliable for normal-speed playback.
    try {
      await playAudioFallback(url, playbackRate)
      return
    } catch (error) {
    }
    
    // Last resort: Web Audio API
    if (audioContextRef.current && audioUnlockedRef.current) {
      await playAudioWithWebAudio(url, playbackRate)
    }
  }
  
  // Silent audio pause — plays a short silent WAV through an HTML <audio> element
  // to create the gap between words during autoplay. The app is foreground-only
  // (no background audio mode is declared), so autoplay naturally stops when the
  // app is backgrounded or the screen locks.
  const getSilentWavUrl = (durationMs: number): string => {
    const sampleRate = 22050
    const numSamples = Math.ceil(sampleRate * durationMs / 1000)
    const dataSize = numSamples * 2
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
    w(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); w(8, 'WAVE'); w(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); w(36, 'data'); view.setUint32(40, dataSize, true)
    const blob = new Blob([buffer], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  }

  const playSilence = (durationMs: number, signal?: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (signal?.aborted || stopRequestedRef.current) {
        reject(new DOMException('Silence aborted', 'AbortError'))
        return
      }
      const url = getSilentWavUrl(durationMs)
      const audio = new Audio(url)
      audioElementsRef.current.push(audio)
      const cleanup = () => {
        audio.pause()
        audio.removeAttribute('src')
        audioElementsRef.current = audioElementsRef.current.filter(a => a !== audio)
        URL.revokeObjectURL(url)
      }
      audio.onended = () => { cleanup(); resolve() }
      audio.onerror = () => { cleanup(); resolve() }
      const onAbort = () => { cleanup(); reject(new DOMException('Silence aborted', 'AbortError')) }
      if (signal) signal.addEventListener('abort', onAbort, { once: true })
      const stopCheck = setInterval(() => {
        if (stopRequestedRef.current || signal?.aborted) { clearInterval(stopCheck); onAbort() }
      }, 100)
      audio.addEventListener('ended', () => clearInterval(stopCheck), { once: true })
      audio.addEventListener('error', () => clearInterval(stopCheck), { once: true })
      audio.play().catch(() => { clearInterval(stopCheck); cleanup(); resolve() })
    })
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
        
        // Create service directly with all needed methods
        const alnilamAudioService = {
          async playWordSequence(sourceWord: string, targetWord: string, settings: any, wordId: string, sourceLanguage: string, targetLanguage: string, englishWord?: string) {

            // Get abort signal from the current autoplay session
            const abortSignal = autoplayAbortController.current?.signal;

            try {
              // Check abort at entry
              if (abortSignal?.aborted || stopRequestedRef.current) {
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


              // Interruptible pause that keeps iOS audio session alive in background
              const abortableSleep = (ms: number): Promise<void> => {
                return playSilence(ms, abortSignal || undefined);
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
                    audio.play().catch((playError) => {
                      // 🔊 MOBILE FIX: If play fails, try to recover
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
                if (abortSignal?.aborted || stopRequestedRef.current) {
                  throw new DOMException('Audio playback aborted', 'AbortError');
                }

                // Prefer HTML <audio> — it's the only path iOS keeps alive in
                // background (lock screen). Web Audio API is invisible to the
                // OS media session and will cause the process to be suspended.
                const audio = new Audio(url);
                audio.crossOrigin = 'anonymous';
                audio.preload = 'auto';
                audioElementsRef.current.push(audio);

                try {
                  await playAudioWithAbort(audio, description, playbackRate);
                } catch (error: any) {
                  if (error.name === 'AbortError') throw error;
                  // Last-resort fallback to Web Audio API (foreground only)
                  if (audioContextRef.current && audioUnlockedRef.current) {
                    await playAudioWithWebAudio(url, playbackRate);
                  } else {
                    throw error;
                  }
                }
              };

              // CRITICAL: Enable audio context for autoplay policy
              try {
                // Try to resume AudioContext if it's suspended (autoplay policy)
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  await audioContextRef.current.resume();
                }
              } catch (audioContextError) {
              }

              // 🔧 UNIVERSAL AUDIO ROUTING - Supports all 47 Azure languages + Alnilam
              // Now includes optional 'word' parameter for Verbs topic word-based lookup
              // Also includes 'targetWord' parameter for cy/ga/mt Common Phrases lookup
              const getAudioUrl = (wordId: string | number, languageCode: string, englishWord?: string, targetWordForAudio?: string) => {
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
                        resolve();
                        return;
                      }
                      
                      
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

              // Track whether any audio segment actually played
              let audioDidPlay = false;

              // FIXED ORDER: Play TARGET language first (what user is learning)
              // Note: sourceWord actually contains the LEARNING language translation (inverted naming in vocabulary API)
              if (wordId && targetLangCode) {
                const targetUrl = getAudioUrl(wordId, targetLangCode, englishWord, sourceWord);

                // Set visual indicator for target language
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('training');
                }

                // FIXED MAPPING: Target language repeats (what user is learning)
                const targetRepeats = settings?.repeatTargetLanguage || 1;
                for (let i = 0; i < targetRepeats; i++) {
                  // Check if stop was requested or aborted
                  if (abortSignal?.aborted || stopRequestedRef.current) {
                    throw new DOMException('Target audio aborted', 'AbortError');
                  }

                  try {
                    // 🔊 MOBILE FIX V3: Use Web Audio API for reliable playback
                    const speedRate = getSpeedRate(settings.pronunciationSpeed || 'Normal');

                    await playAudioUrl(targetUrl, `TARGET ${targetWord} - Repeat ${i + 1}`, speedRate);
                    audioDidPlay = true;

                    // Small pause between repeats (except after last repeat)
                    if (i < targetRepeats - 1) {
                      await abortableSleep(300);
                    }
                  } catch (error: any) {
                    if (error.name === 'AbortError') {
                      throw error; // Re-throw to exit the loop
                    }
                    await abortableSleep(500); // Brief pause before retry
                  }
                }

                // Pause between translations
                if (settings?.pauseBetweenTranslations) {
                  const pauseStartTime = performance.now();
                  const expectedPauseDuration = settings.pauseBetweenTranslations * 1000;

                  await abortableSleep(expectedPauseDuration);

                  const actualPauseDuration = performance.now() - pauseStartTime;
                  const difference = actualPauseDuration - expectedPauseDuration;
                }
              }

              // If no audio played at all, return false early
              if (!audioDidPlay) {
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('idle');
                }
                return false;
              }

              // Check if stop was requested between target and source
              if (abortSignal?.aborted || stopRequestedRef.current) {
                throw new DOMException('Playback aborted between languages', 'AbortError');
              }

              // FIXED ORDER: Play SOURCE language second (native/main language)
              // Note: targetWord actually contains the NATIVE language translation (inverted naming in vocabulary API)
              // Skip source audio if playTargetOnly is enabled
              if (settings?.playTargetOnly) {
              } else if (wordId && sourceLangCode) {
                const sourceUrl = getAudioUrl(wordId, sourceLangCode, englishWord, targetWord);

                // Set visual indicator for source language
                if (settings?.setCurrentAudioStep) {
                  settings.setCurrentAudioStep('main');
                }

                // FIXED MAPPING: Source language repeats (main/native language)
                const sourceRepeats = settings?.repeatMainLanguage || 1;
                for (let i = 0; i < sourceRepeats; i++) {
                  // Check if stop was requested or aborted
                  if (abortSignal?.aborted || stopRequestedRef.current) {
                    throw new DOMException('Source audio aborted', 'AbortError');
                  }

                  try {
                    // 🔊 MOBILE FIX V3: Use Web Audio API for reliable playback
                    const speedRate = getSpeedRate(settings.pronunciationSpeed || 'Normal');

                    await playAudioUrl(sourceUrl, `SOURCE ${sourceWord} - Repeat ${i + 1}`, speedRate);

                    // Small pause between repeats (except after last repeat)
                    if (i < sourceRepeats - 1) {
                      await abortableSleep(300);
                    }
                  } catch (error: any) {
                    if (error.name === 'AbortError') {
                      throw error; // Re-throw to exit the loop
                    }
                    await abortableSleep(500); // Brief pause before retry
                  }
                }
              }

              
              // Increment persistent words-played counter (used for notification prompt timing)
              const prevCount = parseInt(localStorage.getItem('vw_words_played_count') || '0', 10)
              localStorage.setItem('vw_words_played_count', String(prevCount + 1))

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

                    // 🏆 Real-time achievement evaluation for word/streak/today
                    // metrics. Only fires on new-word events (server returned
                    // fresh stats). Time-of-day eval is gated on actual
                    // learning activity so it never pops on app load.
                    if (data.stats) {
                      reportProgress({
                        userId,
                        wordsLearned: data.stats.wordsLearned,
                        currentStreak: data.stats.dailyLoginStreak,
                        wordsToday: data.stats.wordsLearnedToday,
                        topicsCompleted: data.stats.topicsCompleted,
                        targetLanguageCode: userTargetLangCode || undefined,
                      });
                      evaluateTimeContext(userId);
                    }

                    if (data.topicCompletionCounts) {
                      setTopicCompletionCounts(data.topicCompletionCounts)
                    }

                    // Update completed topics immediately from API response
                    if (data.completedTopicIds) {
                      setCompletedTopicIds((prev) => {
                        const next: number[] = data.completedTopicIds;
                        // First-ever topic completion → ask for a store review (once only)
                        // Any newly completed topic → success haptic
                        if (next.length > prev.length) {
                          hapticsSuccess()

                          // 🏆 Pop the topic-complete celebration modal.
                          const fresh = next.filter((id) => !prev.includes(id));
                          const newId = fresh[fresh.length - 1];
                          const finished = topicsRef.current.find((t) => t.id === newId);
                          if (finished) {
                            // Stop the autoplay loop so the modal isn't drowned
                            // out by the next word starting to play.
                            try { stopAudioRef.current?.(); } catch {}

                            const nextTopic = findNextTopicAfter(
                              topicsRef.current,
                              finished.id,
                              next,
                            );
                            const displayName = topicDisplayNameRef.current;
                            const nextIcon = nextTopic ? getTopicIcon(nextTopic.id) : undefined;
                            reportTopicComplete(
                              userId,
                              finished.id,
                              displayName(finished.id, finished.name),
                              nextTopic
                                ? { id: nextTopic.id, name: displayName(nextTopic.id, nextTopic.name), icon: typeof nextIcon === 'string' ? nextIcon : undefined }
                                : null,
                            );
                          }
                        }

                        return next;
                      });
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

        alnilamServiceRef.current = alnilamAudioService; // Store in ref for immediate access
        setAlnilamService(alnilamAudioService);
        setActiveAudioService("B2 Audio");
        
        // IMMEDIATE TEST: Try calling the service right after initialization
        
      } catch (error) {
        console.error('❌ Failed to initialize Alnilam service:', error);
      }
    }
    
    initAlnilam()
  }, [targetLanguageCode, nativeLanguageCode]) // Re-initialize when languages change

  // Main audio playback function - Algenib Enhanced
  const playAudio = async (word: any, autoPlay = false) => {
    const now = Date.now();
    
    // CRITICAL: Check abort signal first (highest priority)
    if (autoplayAbortController.current?.signal.aborted) {
      return;
    }
    
    // CRITICAL: Check if stop was requested - exit immediately if true
    if (stopRequestedRef.current) {
      return;
    }
    
    // Prevent rapid consecutive calls (less than 100ms apart)
    if (audioCallInProgress.current) {
      return;
    }
    
    if (now - lastAudioCallTime.current < 100) {
      return;
    }
    
    if (!word || isPlaying) {
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
      const englishWord = word.english_word || word.word_en || ''
      const isCustomWord = word.isCustomWord || false // Check if this is a playlist/custom word

      if (!sourceWord || typeof sourceWord !== 'string' || sourceWord.trim().length === 0) {
        console.warn('No valid source word found in:', word)
        return
      }
      if (!targetWord || typeof targetWord !== 'string' || targetWord.trim().length === 0) {
        console.warn('No valid target word found in:', word)
        return
      }


      if (autoPlay) {
        setAutoPlayActive(true)
      }
      setIsPlaying(true)
      
      // For custom/playlist words, use TTS fallback instead of B2 audio
      if (isCustomWord) {
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
          }
          
          await playSilence((settings.pauseBetweenTranslations || 1) * 1000, autoplayAbortController.current?.signal || undefined)

          if (stopRequestedRef.current) {
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }

          setCurrentAudioStep('main')
          const nativeAudioUrl = `/api/custom-audio?text=${encodeURIComponent(targetWord)}&languageCode=${nativeLangCode}`
          
          try {
            await playAudioUniversal(nativeAudioUrl, 1.0);
          } catch (e) {
          }
          
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
      
      
      // CRITICAL DEBUG: Check if Alnilam service is available
      if (!alnilamService) {
        console.error('🚨 CRITICAL: Alnilam service is null/undefined!');
      }
      
      if (!wordId) {
        console.error('🚨 CRITICAL: wordId is missing!', { wordId });
      }
      
      // Priority 1: Try Alnilam Multilingual Audio first (54,738 files)
      const currentAlnilamService = alnilamServiceRef.current;
      if (currentAlnilamService && wordId) {
        setActiveAudioService("Alnilam")
        
        
        try {
          const alnilamSuccess = await currentAlnilamService.playWordSequence(
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
          
          
          // Check abort signal first (highest priority)
          if (autoplayAbortController.current?.signal.aborted) {
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }
          
          // Check if stop was requested during playback - EXIT IMMEDIATELY
          if (stopRequestedRef.current) {
            setCurrentAudioStep('idle')
            setIsPlaying(false)
            audioCallInProgress.current = false
            return
          }
          
          if (alnilamSuccess) {

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
                // Cancel today's streak notification and refresh review reminder
                fetch('/api/notifications/context')
                  .then(r => r.ok ? r.json() : null)
                  .then(ctx => ctx && notificationsHook.onWordPlayed(ctx))
                  .catch(() => {})
              } catch (error) {
                console.error('Failed to track progress:', error)
              }
            }

            setCurrentAudioStep('idle')
            setIsPlaying(false)
            return
          }
        } catch (error) {
          console.error('❌ Audio service error:', error)
        }
      }

      // TTS fallback for playlist words when B2 audio is unavailable
      if (word.isPlaylistWord) {
        setActiveAudioService("TTS")
        try {
          const languageMappingsFallback: Record<string, string> = {
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
          const targetLangCodeFb = languageMappingsFallback[targetLanguage] || targetLanguageCode || 'en'
          const nativeLangCodeFb = languageMappingsFallback[nativeLanguage] || nativeLanguageCode || 'en'

          setCurrentAudioStep('training')
          try { await playAudioUniversal(`/api/custom-audio?text=${encodeURIComponent(sourceWord)}&languageCode=${targetLangCodeFb}`, 1.0); } catch (e) {}

          await playSilence((settings.pauseBetweenTranslations || 1) * 1000, autoplayAbortController.current?.signal || undefined)
          if (stopRequestedRef.current) { setCurrentAudioStep('idle'); setIsPlaying(false); audioCallInProgress.current = false; return }

          setCurrentAudioStep('main')
          try { await playAudioUniversal(`/api/custom-audio?text=${encodeURIComponent(targetWord)}&languageCode=${nativeLangCodeFb}`, 1.0); } catch (e) {}

          setCurrentAudioStep('idle')
          setIsPlaying(false)
          audioCallInProgress.current = false
          return
        } catch (error) {
          console.error('❌ TTS fallback error:', error)
        }
      }

      setCurrentAudioStep('idle')
      setIsPlaying(false)

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
    
    // Abort any ongoing autoplay loop immediately
    if (autoplayAbortController.current) {
      autoplayAbortController.current.abort();
      autoplayAbortController.current = null;
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
      } catch (error) {
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

  }

  // Expose stopAudio via ref so the audio-init closure (which captures stale
  // function references) can halt playback when the topic-complete modal opens.
  useEffect(() => {
    stopAudioRef.current = stopAudio
  })

  // Prefetch current word's audio to eliminate first-play cold-start delay.
  // Warms the server (CSV index, B2 auth token) and seeds the browser HTTP
  // cache so the user's first click on play has nothing left to wait on.
  useEffect(() => {
    const word: any = vocabulary[currentWordIndex]
    if (!word?.id || !targetLanguageCode) return
    if (word.isCustomWord) return // playlists use /api/custom-audio (TTS)

    let url = `/api/universal-audio?wordId=${word.id}&languageCode=${targetLanguageCode}`
    const englishWord = word.english_word || word.word_en || ''
    if (englishWord) url += `&word=${encodeURIComponent(englishWord)}`
    const targetWordForAudio = word.targetWord || ''
    if (targetWordForAudio) url += `&targetWord=${encodeURIComponent(targetWordForAudio)}`

    const controller = new AbortController()
    fetch(url, { method: 'GET', cache: 'force-cache', signal: controller.signal })
      .catch(() => {}) // fire-and-forget; ignore failures
    return () => controller.abort()
  }, [vocabulary, currentWordIndex, targetLanguageCode])

  // Example sentences modal state
  const [showExampleModal, setShowExampleModal] = useState(false)
  const [exampleModalData, setExampleModalData] = useState<{
    vocabularyId: number
    sourceWord: string
    targetWord: string
    englishWord: string
  } | null>(null)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [holdingCardIndex, setHoldingCardIndex] = useState<number | null>(null)
  const pressedTileRef = useRef<{ el: HTMLElement | null; timer: number | null }>({ el: null, timer: null })
  const releasePressedTile = () => {
    const { el, timer } = pressedTileRef.current
    if (timer) clearTimeout(timer)
    if (el) el.style.transform = ''
    pressedTileRef.current = { el: null, timer: null }
  }
  const [quizTopic, setQuizTopic] = useState<{ id: number; name: string } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const [holdingLanguageCode, setHoldingLanguageCode] = useState<string | null>(null)
  const [holdingSwapButton, setHoldingSwapButton] = useState<'native' | 'target' | null>(null)
  const [holdingNavButton, setHoldingNavButton] = useState<'back' | 'settings' | 'previous' | 'play' | 'next' | null>(null)

  // Smart preloading cache - load everything invisibly in background
  const [dataCache, setDataCache] = useState<{
    topics: Topic[]
    vocabularyCache: { [key: string]: VocabularyWord[] }
  }>({
    topics: [],
    vocabularyCache: {}
  })

  // Load data from JSON file (reordered topics) on mount.
  // The last known topics list paints immediately from localStorage; the
  // network fetch below just refreshes it silently, so after the very first
  // launch the topic grid never shows a loading state.
  useEffect(() => {
    const applyTopics = (topicsData: Topic[]) => {
      setTopics(topicsData)
      setDataCache(prev => ({
        ...prev,
        topics: topicsData
      }))
    }

    const cachedTopics = readCached<Topic[]>('topics')
    const hasCache = Array.isArray(cachedTopics) && cachedTopics.length > 0
    if (hasCache) applyTopics(cachedTopics!)

    const loadData = async () => {
      if (!hasCache) setIsLoading(true)
      try {
        // Load topics from API endpoint to ensure it works in production
        const topicsResponse = await fetch('/api/topics')
        const topicsData = await topicsResponse.json()
        applyTopics(topicsData)
        writeCached('topics', topicsData)
      } catch (error) {
        console.error('Failed to load data:', error)
        // Fallback to database if JSON file fails
        try {
          const topicsData = await getTopics()
          applyTopics(topicsData)
          writeCached('topics', topicsData)
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
        const response = await fetch(`/api/progress/topics?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setCompletedTopicIds(data.completedTopicIds || [])
          if (data.topicCompletionCounts) {
            setTopicCompletionCounts(data.topicCompletionCounts)
          }
        } else {
          console.error('Failed to fetch completed topics:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch completed topics:', error)
      }
    }
    
    fetchCompletedTopics()
  }, [user?.id, targetLanguageCode])

  // After an offline-progress flush, reconcile borders/tiers to server truth
  // for the language currently on screen (the queue replay emits this event).
  useEffect(() => {
    const onSynced = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.targetLanguageCode !== targetLanguageCode) return
      if (Array.isArray(detail.completedTopicIds)) setCompletedTopicIds(detail.completedTopicIds)
      if (detail.topicCompletionCounts) setTopicCompletionCounts(detail.topicCompletionCounts)
    }
    window.addEventListener(PROGRESS_SYNCED_EVENT, onSynced)
    return () => window.removeEventListener(PROGRESS_SYNCED_EVENT, onSynced)
  }, [targetLanguageCode])

  // 🏆 Achievement bridge: re-evaluate section/topic-count achievements
  // any time the completed list changes (initial load + user actions).
  // The actual celebration modal is fired from the audio-track callback so
  // it never pops on initial page load.
  const { registerTopicChoiceHandler } = useAchievementContext()
  useEffect(() => {
    reportProgress({
      userId: user?.id || null,
      topicsCompleted: completedTopicIds.length,
      completedTopicIds,
      targetLanguageCode: targetLanguageCode || undefined,
    })
  }, [completedTopicIds, targetLanguageCode, user?.id])

  // Topics ref so the audio-track callback (captured at init) can read the
  // current topic list for next-topic lookup.
  const topicsRef = useRef<Topic[]>([])
  useEffect(() => {
    topicsRef.current = topics
  }, [topics])
  const topicDisplayNameRef = useRef<(id: number, name: string) => string>(
    (_id, name) => name,
  )
  // Ref to stopAudio so audio-init closures can stop autoplay when the
  // topic-complete modal pops without depending on stale closure state.
  const stopAudioRef = useRef<(() => void) | null>(null)

  // 🏆 Topic-complete modal button handlers — drive learning navigation.
  // Use a ref to dodge stale closures: handleTopicSelect is recreated each render.
  const topicChoiceCtxRef = useRef<{
    topics: Topic[]
    handleTopicSelect: (t: Topic) => void
    setCurrentPage: typeof setCurrentPage
    setCurrentWordIndex: typeof setCurrentWordIndex
    canAccessTopic: (id: number) => boolean
    setShowPaywall: typeof setShowPaywall
  }>({
    topics,
    handleTopicSelect: () => {},
    setCurrentPage,
    setCurrentWordIndex,
    canAccessTopic: () => true,
    setShowPaywall,
  })
  useEffect(() => {
    topicChoiceCtxRef.current = {
      topics,
      handleTopicSelect,
      setCurrentPage,
      setCurrentWordIndex,
      canAccessTopic,
      setShowPaywall,
    }
  })
  useEffect(() => {
    registerTopicChoiceHandler((topicId, action, nextTopicId) => {
      const ctx = topicChoiceCtxRef.current
      if (action === 'continue' && nextTopicId != null) {
        const next = ctx.topics.find((t) => t.id === nextTopicId)
        if (!next) return
        // Honor subscription gating — Continue must not bypass the paywall.
        if (!ctx.canAccessTopic(next.id)) {
          hapticsWarning()
          ctx.setShowPaywall(true)
          return
        }
        ctx.handleTopicSelect(next)
        return
      }
      if (action === 'quiz') {
        const cur = ctx.topics.find((t) => t.id === topicId)
        if (!cur) return
        setQuizTopic({ id: cur.id, name: cur.name })
        return
      }
      if (action === 'repeat') {
        const cur = ctx.topics.find((t) => t.id === topicId)
        if (!cur) return
        const userId = (window as any).__vocaWorldUserId
        const langCode = (window as any).__vocaWorldTargetLangCode
        // Reset server-side resume position so handleTopicSelect starts at 0.
        const resetThenOpen = async () => {
          if (userId && langCode) {
            // Reset the local mirror first — handleTopicSelect reads it.
            writeCached(`pos:${userId}:${cur.id}:${langCode}`, 0)
            try {
              await fetch('/api/progress/position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  topicId: cur.id,
                  targetLanguageCode: langCode,
                  currentWordIndex: 0,
                  totalWords: 0,
                }),
              })
            } catch {}
          }
          ctx.setCurrentWordIndex(0)
          ctx.handleTopicSelect(cur)
        }
        resetThenOpen()
      }
    })
    return () => registerTopicChoiceHandler(null)
  }, [registerTopicChoiceHandler])

  // 💾 Auto-save position when word index changes (debounced)
  useEffect(() => {
    if (!user?.id || !selectedTopic || !targetLanguageCode || vocabulary.length === 0) {
      return
    }

    // Mirror the position locally right away (synchronous) — this is what
    // lets handleTopicSelect resume instantly without asking the server.
    writeCached(`pos:${user.id}:${selectedTopic.id}:${targetLanguageCode}`, currentWordIndex)

    // Clear any existing timeout
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current)
    }

    // Debounce save for 1 second to avoid excessive API calls while still being responsive
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
      } catch (error) {
        console.error('Failed to auto-save position:', error)
      }
    }, 1000) // Reduced from 2000ms to 1000ms for faster saves

    // Cleanup on unmount - execute any pending save immediately
    return () => {
      if (savePositionTimeoutRef.current) {
        clearTimeout(savePositionTimeoutRef.current)
        // Immediately save position on unmount/navigation
        if (user?.id && selectedTopic && targetLanguageCode && vocabulary.length > 0) {
          fetch('/api/progress/position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              topicId: selectedTopic.id,
              targetLanguageCode: targetLanguageCode,
              currentWordIndex: currentWordIndex,
              totalWords: vocabulary.length
            })
          }).then(() => {
          }).catch(error => {
            console.error('Failed to cleanup-save position:', error)
          })
        }
      }
    }
  }, [currentWordIndex, user?.id, selectedTopic, targetLanguageCode, vocabulary.length])

  // Fetch phonetics for vocabulary words
  const fetchPhonetics = async (vocab: VocabularyWord[], targetLangCode: string, nativeLangCode: string) => {
    if (!vocab || vocab.length === 0) {
      return
    }
    
    try {
      
      // Get vocabulary IDs from the vocab array
      const vocabIds = vocab
        .map(v => v.id)
        .filter((id): id is number => id !== undefined && id !== null)
      
      
      if (vocabIds.length === 0) {
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
        setPhonetics(data.phonetics || {})
      } else {
        const errorText = await response.text()
      }
    } catch (error) {
      console.error('❌ Error fetching phonetics:', error)
    }
  }

  // Fetch phonetics when settings load with showPhonetics=true OR when vocabulary/languages change
  useEffect(() => {
    if (settingsInitialized && settings.showPhonetics && vocabulary.length > 0) {
      fetchPhonetics(vocabulary, targetLanguageCode, nativeLanguageCode)
    }
  }, [settingsInitialized, settings.showPhonetics, vocabulary.length, targetLanguageCode, nativeLanguageCode, selectedTopic?.id])

  // 📖 Warm the example-sentences cache for the word on screen so the modal
  // opens instantly with no loading state. Debounced slightly so flipping
  // quickly through words doesn't fire a request per word.
  useEffect(() => {
    if (currentPage !== 'learning' || vocabulary.length === 0) return
    const word = vocabulary[currentWordIndex]
    if (!word?.id || !nativeLanguageCode || !targetLanguageCode) return
    const timer = setTimeout(() => {
      prefetchExampleSentences(word.id, targetLanguageCode, nativeLanguageCode)
    }, 250)
    return () => clearTimeout(timer)
  }, [currentPage, vocabulary, currentWordIndex, nativeLanguageCode, targetLanguageCode])

  // Smart background preloading - invisible to user.
  // Downloads every topic's full vocabulary into IndexedDB (same keys/shape
  // as the offline pack "words" phase), so opening any topic reads locally
  // and never shows a loading state. Topics already stored are skipped, so
  // after the first session this loop is pure cache hits and no network.
  const preloadedPairRef = useRef<string | null>(null)
  const preloadVocabularyInBackground = async (nativeLang: string, targetLang: string) => {
    if (!dataCache.topics.length) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const learnCode = normalizeLangParam(targetLang)
    const natCode = normalizeLangParam(nativeLang)
    const pairKey = `${natCode}>${learnCode}`
    if (preloadedPairRef.current === pairKey) return
    preloadedPairRef.current = pairKey

    for (const topic of dataCache.topics) {
      if (typeof topic.id !== 'number' || topic.id <= 0) continue
      try {
        const existing = await idbGet<{ json: any }>('data', vocabKey(topic.id, learnCode, natCode))
        if (Array.isArray(existing?.json?.vocabulary) && existing.json.vocabulary.length > 0) continue

        const vocabularyResponse = await getVocabularyForTopic(
          topic.id,
          targetLang,
          nativeLang,
          1000, // Full topic, same params as the learn flow and offline packs
          0
        )
        await idbPut('data', {
          key: vocabKey(topic.id, learnCode, natCode),
          json: vocabularyResponse,
          savedAt: Date.now(),
        })

        // Space requests out so preloading never competes with the UI
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        // Network dropped or storage full — stop and let a later call retry
        console.error(`Failed to preload vocabulary for topic ${topic.id}:`, error)
        preloadedPairRef.current = null
        return
      }
    }
  }

  // Kick off preloading whenever the topic grid is reachable with a chosen
  // language pair (covers both fresh selection and cold-start restore).
  useEffect(() => {
    if (currentPage !== 'confirmation' && currentPage !== 'learning') return
    if (!nativeLanguage || !targetLanguage || !dataCache.topics.length) return
    preloadVocabularyInBackground(nativeLanguage, targetLanguage)
  }, [currentPage, nativeLanguage, targetLanguage, dataCache.topics.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // Vocabulary is now preloaded in handleTopicSelect before page transition
  /*
  useEffect(() => {
    const loadVocabulary = async () => {
      
      if (selectedTopic && nativeLanguageCode && targetLanguageCode) {
        
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
          
          if (vocabularyResponse.vocabulary.length > 0) {
          }
          setVocabulary(vocabularyResponse.vocabulary)
          setTotalWords(vocabularyResponse.totalWords)
          setCurrentOffset(vocabularyResponse.vocabulary.length) // Set offset to loaded words count
          setHasMoreWords(false) // No more words to load since we loaded everything
          setCurrentWordIndex(0)
          
          // Audio system removed - placeholder for new TTS implementation
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
      
      const vocabularyResponse = await getVocabularyForTopic(
        selectedTopic.id,
        targetLanguageCode,
        nativeLanguageCode,
        50,
        currentOffset
      )
      
      if (vocabularyResponse.vocabulary && vocabularyResponse.vocabulary.length > 0) {
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
      return;
    }
    
    // Prevent multiple simultaneous autoplay instances
    if (isAutoplayActive.current) {
      return;
    }
    
    
    // Create new AbortController for this autoplay session
    autoplayAbortController.current = new AbortController();
    const { signal } = autoplayAbortController.current;
    
    // Set state flags
    isAutoplayActive.current = true;
    autoPlayRef.current = true;
    stopRequestedRef.current = false;
    setAutoPlayActive(true);
    
    // Capture the rewind anchor — where autoplay was started from
    const loopStartIndex = currentWordIndex;
    let wordCount = 0;

    try {
      let i = currentWordIndex;
      while (true) {
        // Check abort signal FIRST - highest priority check
        if (signal.aborted) {
          throw new DOMException('Autoplay aborted', 'AbortError');
        }

        // End of word list reached
        if (i >= vocabulary.length) {
          if (settings.rewindEnabled) {
            i = loopStartIndex;
            wordCount = 0;
            continue;
          } else {
            // Natural completion
            break;
          }
        }
        
        const word = vocabulary[i];
        if (!word || !word.sourceWord || !word.targetWord) {
          i++;
          continue;
        }
        
        
        // Update display ONLY if not aborted
        if (!signal.aborted) {
          setCurrentWordIndex(i);
        }
        
        // Check abort BEFORE playing
        if (signal.aborted) {
          throw new DOMException('Autoplay aborted', 'AbortError');
        }
        
        // Play the word - this is async and may take time
        await playAudio(word, false);
        
        // Check abort AFTER playing
        if (signal.aborted) {
          throw new DOMException('Autoplay aborted', 'AbortError');
        }

        wordCount++;

        // Rewind check: did we just complete the N-word cycle?
        const rewindNow = settings.rewindEnabled && wordCount >= (settings.rewindAfterWords || 5);

        // Determine whether there's a "next" step to pause before
        const hasNext = rewindNow || i < vocabulary.length - 1;

        // Pause before next word / before rewind
        if (hasNext) {
          setCurrentAudioStep('pause');
          await playSilence(settings.pauseForNextWord * 1000, signal);
        }

        // Check abort after pause
        if (signal.aborted) throw new DOMException('Autoplay aborted', 'AbortError');

        if (rewindNow) {
          hapticsMedium()
          i = loopStartIndex;
          wordCount = 0;
        } else {
          i++;
        }
      }
      
      // Natural completion (not aborted)
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
      } else {
        console.error('❌ Autoplay error:', error);
      }
    } finally {
      // Always clean up state
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
      startAutoPlay()
    } else if (autoPlayActive && !hasUserInteracted) {
      setAutoPlayActive(false) // Reset autoplay since user hasn't interacted
    }
  }, [autoPlayActive, hasUserInteracted])

  // Initialize B2 audio system
  useEffect(() => {
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
    
    // Always return English name
    return nameMap[languageCode] || languageCode.toUpperCase()
  }

  // Resolve display names after cold-start restore (codes are stored temporarily as names)
  useEffect(() => {
    if (nativeLanguageCode && nativeLanguage === nativeLanguageCode) {
      setNativeLanguage(getLanguageName(nativeLanguageCode))
    }
    if (targetLanguageCode && targetLanguage === targetLanguageCode) {
      setTargetLanguage(getLanguageName(targetLanguageCode))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeLanguageCode, targetLanguageCode])

  // Get translated language name (for lists, displays, etc.) - buttons stay in English
  const getTranslatedLanguageName = (languageCode: string): string => {
    const englishName = getLanguageName(languageCode)
    
    // If we have a translation, return it
    if (languageTranslations[englishName]) {
      return languageTranslations[englishName]
    }
    
    // Otherwise return English name
    return englishName
  }

  // Get translated question text based on native language
  const getQuestionText = (languageCode?: string): string => {
    const code = languageCode || nativeLanguageCode
    if (code && QUESTION_TEXT_TRANSLATIONS[code]) {
      return QUESTION_TEXT_TRANSLATIONS[code]
    }
    return 'Choose the language you want to learn'
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
    
    // If we're on native language selection, exclude the target language
    if (currentPage === "native" && targetLanguageCode) {
      return matchesSearch && lang.code !== targetLanguageCode
    }
    
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
    // First check if we have a translation for this topic in the user's native language
    if (topicTranslations[topicId]) {
      return topicTranslations[topicId]
    }
    
    // Fallback: Custom name mappings for English shortened names
    const nameMapping: { [key: number]: string } = {
      8: "Health", // Health & Body Parts → Health
      11: "Weather", // Weather & Nature → Weather
      12: "Family", // Family & Relationships → Family
      17: "City", // Places Around Town → City
      18: "Travel", // Travel & Tourism → Travel
    }
    
    return nameMapping[topicId] || originalName
  }

  // Keep a ref pointing at the latest display-name function so closures
  // captured at audio-init time (achievements bridge) get localized names.
  useEffect(() => {
    topicDisplayNameRef.current = getTopicDisplayName
  })

  const handleLanguageSelect = (language: { code: string; name: string }) => {
    hapticsLight()

    // Reset scroll position to top of the container
    const languageGrid = document.querySelector('.language-grid-container')
    if (languageGrid) {
      languageGrid.scrollTop = 0
    }
    
    if (currentPage === "native") {
      setNativeLanguage(language.name)
      setNativeLanguageCode(language.code)
      
      // Start fade animation
      setIsTransitioning(true)
      
      // If we already have a target language selected, go back to confirmation
      // Otherwise go to target language selection
      setTimeout(() => {
        if (targetLanguage && targetLanguageCode) {
          setCurrentPage("confirmation")
        } else {
          setQuestionText(getQuestionText(language.code))
          setCurrentPage("target")
        }
        setIsTransitioning(false)
      }, 200)
    } else if (currentPage === "target") {
      setTargetLanguage(language.name)
      setTargetLanguageCode(language.code)
      
      // Start background preloading immediately (invisible to user)
      preloadVocabularyInBackground(nativeLanguage, language.name)
      
      // Normal transition - no visible loading
      setIsTransitioning(true)
      
      setTimeout(() => {
        setCurrentPage("confirmation")
        setIsTransitioning(false)
      }, 200)
    }
    setSearchQuery("")
  }

  const handleContinue = () => {
    if (currentPage === "confirmation") {
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
        setQuestionText(getQuestionText())
        // Don't clear the language - we want to show current selection
      }
      setSearchQuery("")
      setIsTransitioning(false)
    }, 200)
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
        setQuestionText(getQuestionText())
        // Clear the target language so it can be reselected
        setTargetLanguage("")
        setTargetLanguageCode("")
      }
      setSearchQuery("")
      setIsTransitioning(false)
    }, 200)
  }

  // 🎬 Same dip-and-recover transition as the flag picker (handleLanguageSelect):
  // 200ms scale/opacity dip, page swapped at the same 200ms mark. Used for
  // topic open ↔ back-to-menu so pages never pop abruptly.
  // beginPageFade() can be called early (on tap) so data loading overlaps the
  // dip instead of delaying it; transitionToPage() then only waits out
  // whatever remains of the FADE_MS window before swapping.
  const FADE_MS = 200
  const fadeOutStartRef = useRef(0)
  const beginPageFade = () => {
    fadeOutStartRef.current = Date.now()
    setIsTransitioning(true)
  }
  const transitionToPage = (page: "learning" | "confirmation") => {
    if (!fadeOutStartRef.current) beginPageFade()
    const remaining = Math.max(0, FADE_MS - (Date.now() - fadeOutStartRef.current))
    setTimeout(() => {
      fadeOutStartRef.current = 0
      setCurrentPage(page)
      setIsTransitioning(false)
    }, remaining)
  }

  const handleTopicSelect = async (topic: Topic) => {
    
    // Special case: Playlist learning - topic id -2
    if (topic.id === -2) {
      const playlistId = (topic as any).playlistId
      
      // Require authentication for playlists
      if (!user) {
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
          
          
          const vocabId = dictWord?.vocabulary_id
          return {
            id: vocabId || dictWord?.id,
            sourceWord: sourceWord,
            targetWord: targetWord,
            word_en: dictWord?.word_en,
            english_word: dictWord?.word_en,
            isCustomWord: !vocabId,
            isPlaylistWord: true
          }
        })
        
        
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
        
        // Navigate to learning page with a fade
        transitionToPage("learning")
      } catch (error) {
        console.error('Error loading playlist:', error)
      }
      return
    }
    
    // Special case: Search Word (My Words feature) - topic id -1
    if (topic.id === -1) {
      
      // Require authentication for search
      if (!user) {
        return
      }
      
      // Allow search access
      setSelectedTopic(topic)
      transitionToPage("learning")
      return
    }
    
    // Access check already done in handleTopicClick, proceed with loading topic
    // Note: For regular topics called directly (e.g., from post-payment flow), 
    // we trust that the caller has verified access

    // User has access, proceed with topic selection.
    // Start fading the topic grid out right away — the cache/position reads
    // below run while the fade plays, so the transition never feels stalled.
    beginPageFade()
    const cacheKey = `${topic.id}-${targetLanguage}-${nativeLanguage}`
    const learnCode = normalizeLangParam(targetLanguage)
    const natCode = normalizeLangParam(nativeLanguage)

    // Resume position: the local mirror (written on every position save)
    // answers synchronously, so opening a topic never waits on the network
    // for it. The server is only asked the first time a topic is opened on
    // this device — and then in parallel with the vocabulary load.
    const posKey = user?.id && targetLanguageCode
      ? `pos:${user.id}:${topic.id}:${targetLanguageCode}`
      : null
    const mirroredPosition = posKey ? readCached<number>(posKey) : null
    const fetchSavedPosition = async (): Promise<number> => {
      if (mirroredPosition != null) return mirroredPosition
      if (!posKey || !user?.id) return 0
      try {
        const positionResponse = await fetch(`/api/progress/position?userId=${user.id}&topicId=${topic.id}&targetLanguageCode=${targetLanguageCode}`)
        if (positionResponse.ok) {
          const positionData = await positionResponse.json()
          const position = positionData.currentWordIndex || 0
          writeCached(posKey, position)
          return position
        }
      } catch (error) {
        console.error('Failed to load saved position:', error)
      }
      return 0
    }

    // Shared open path once vocabulary + resume position are known
    const openTopic = (vocab: VocabularyWord[], totalWordCount: number, savedPosition: number) => {
      setVocabulary(vocab)
      setTotalWords(totalWordCount)
      setCurrentOffset(vocab.length)
      setHasMoreWords(false)
      setCurrentWordIndex(savedPosition < vocab.length ? savedPosition : 0) // Resume from saved position
      setSelectedTopic(topic)

      // Reset audio states
      setIsPlaying(false)
      setCurrentAudioStep('idle')
      setAutoPlayActive(false)
      autoPlayRef.current = false

      // Fade over to the learning page
      transitionToPage("learning")
    }

    // 1) In-memory cache (topics already opened this session) — instant
    const inMemoryVocab = dataCache.vocabularyCache[cacheKey]
    if (inMemoryVocab && inMemoryVocab.length > 0) {
      openTopic(inMemoryVocab, inMemoryVocab.length, await fetchSavedPosition())
      return
    }

    // 2) IndexedDB (background preload / offline pack / earlier session) —
    // reads locally in a few ms, so this is instant too
    try {
      const stored = await idbGet<{ json: any }>('data', vocabKey(topic.id, learnCode, natCode))
      const storedVocab: VocabularyWord[] | undefined = stored?.json?.vocabulary
      if (Array.isArray(storedVocab) && storedVocab.length > 0) {
        setDataCache(prev => ({
          ...prev,
          vocabularyCache: {
            ...prev.vocabularyCache,
            [cacheKey]: storedVocab
          }
        }))
        setPhonetics({})
        openTopic(storedVocab, stored?.json?.totalWords ?? storedVocab.length, await fetchSavedPosition())
        return
      }
    } catch {}

    // 3) Network — only the very first open of a topic on this device, and
    // the position lookup runs in parallel instead of blocking beforehand
    setIsLoading(true)

    try {
      const [vocabularyResponse, savedPosition] = await Promise.all([
        getVocabularyForTopic(
          topic.id,
          targetLanguage,
          nativeLanguage,
          1000, // Increased to handle larger topics like Common Phrases (838 words)
          0
        ),
        fetchSavedPosition(),
      ])

      const fetchedVocab = vocabularyResponse.vocabulary || []

      // Cache for future use (memory + IndexedDB so it stays instant across sessions)
      setDataCache(prev => ({
        ...prev,
        vocabularyCache: {
          ...prev.vocabularyCache,
          [cacheKey]: fetchedVocab
        }
      }))
      idbPut('data', {
        key: vocabKey(topic.id, learnCode, natCode),
        json: vocabularyResponse,
        savedAt: Date.now(),
      }).catch(() => {})

      // Clear and refetch phonetics for new vocabulary
      setPhonetics({})
      if (settings.showPhonetics) {
        fetchPhonetics(fetchedVocab, targetLanguageCode, nativeLanguageCode)
      }

      openTopic(fetchedVocab, vocabularyResponse.totalWords || 0, savedPosition)
      setIsLoading(false)

    } catch (error) {
      console.error('Failed to load vocabulary:', error)
      setIsLoading(false)
      setSelectedTopic(topic)
      transitionToPage("learning")
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
    }
    
    // Format category: Use translation if available, otherwise format English version
    const formatCategory = (cat: string) => {
      if (!cat) return ''
      
      let displayText = ''
      
      // First check if we have a translation for this category
      if (categoryTranslations[cat]) {
        displayText = categoryTranslations[cat]
      } else {
        // Fallback: Replace underscores with spaces
        displayText = cat.replace(/_/g, ' ')
      }
      
      // Remove dash and everything after it (e.g., "basic greetings - greetings" -> "basic greetings")
      const dashIndex = displayText.indexOf(' - ')
      if (dashIndex !== -1) {
        displayText = displayText.substring(0, dashIndex)
      }
      
      // Make uppercase
      return displayText.toUpperCase()
    }
    
    return {
      sourceWord: currentWord.sourceWord?.toLowerCase() || '', // Training language word (what user wants to learn) - displayed in lowercase
      targetWord: currentWord.targetWord?.toLowerCase() || '',  // Main language translation (user's native language) - displayed in lowercase
      category: formatCategory(currentWord.context || '') // Category for verb grouping display (use context not category)
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
    hapticsLight()
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
    hapticsLight()
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
    hapticsMedium()
    // Mark that user has interacted (prevents auto-play on page load)
    setHasUserInteracted(true)

    // 🔓 MOBILE FIX: Unlock audio on user gesture before any playback
    await unlockAudio()
    
    if (isPlaying || autoPlayActive) {
      stopAudio()
    } else {
      const currentWord = vocabulary[currentWordIndex]
      if (currentWord) {
        if (settings.autoPlay) {
          // Start auto-play sequence from current word
          autoPlayRef.current = true
          setAutoPlayActive(true)
        } else {
          // Just play the current word once
          stopRequestedRef.current = false
          audioCallInProgress.current = false
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
        alert(error.error || t('playlistSelect.createFailed'))
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert(t('playlistSelect.createFailed'))
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleBackToTopics = async () => {
    hapticsLight()
    // Save current position before going back — fire-and-forget so the back
    // navigation never waits on the network (the local mirror written by the
    // auto-save effect already has the position for instant resume).
    if (user?.id && selectedTopic && targetLanguageCode && vocabulary.length > 0) {
      fetch('/api/progress/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          topicId: selectedTopic.id,
          targetLanguageCode: targetLanguageCode,
          currentWordIndex: currentWordIndex,
          totalWords: vocabulary.length
        })
      }).catch(error => {
        console.error('Failed to save position:', error)
      })
    }

    // Restore the section where the topic was selected from
    setCurrentSection(lastTopicSectionRef.current)

    // Stop any currently playing audio when navigating back
    stopAudio()
    transitionToPage("confirmation")
  }

  // 🔒 LOCK SCREEN & BACKGROUND PLAYBACK
  // Web Media Session API — shows controls on the phone lock screen and in the
  // notification/control-center tray when audio is playing.
  // HTML <audio> elements already continue playing when the screen locks;
  // the Media Session API just wires up the OS controls so the user can
  // pause / skip without unlocking the phone.

  // Always-current handler refs — avoids stale closures inside the Media Session callbacks
  const _mediaSessionRef = useRef({ stopAudio, handleNext, handlePrevious, handlePlay })
  _mediaSessionRef.current = { stopAudio, handleNext, handlePrevious, handlePlay }

  // Register action handlers once on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const ms = navigator.mediaSession
    ms.setActionHandler('play',          () => _mediaSessionRef.current.handlePlay())
    ms.setActionHandler('pause',         () => _mediaSessionRef.current.stopAudio())
    ms.setActionHandler('stop',          () => _mediaSessionRef.current.stopAudio())
    ms.setActionHandler('nexttrack',     () => _mediaSessionRef.current.handleNext())
    ms.setActionHandler('previoustrack', () => _mediaSessionRef.current.handlePrevious())

    return () => {
      const actions = ['play', 'pause', 'stop', 'nexttrack', 'previoustrack'] as MediaSessionAction[]
      actions.forEach(action => { try { ms.setActionHandler(action, null) } catch {} })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep lock-screen metadata and playback state in sync with the current word
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const isActive = isPlaying || autoPlayActive
    const currentWord = vocabulary[currentWordIndex]

    if (isActive && currentWord) {
      const wordInTarget = (currentWord as any).targetWord || (currentWord as any).main_word || ''
      const wordInNative = (currentWord as any).sourceWord || (currentWord as any).training_word || ''
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:  wordInTarget,
          artist: `${wordInNative}  ·  ${targetLanguage} ← ${nativeLanguage}`,
          album:  `Sprind${selectedTopic ? ' · ' + selectedTopic.name : ''}`,
          artwork: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        })
        navigator.mediaSession.playbackState = 'playing'
      } catch {}
    } else {
      try { navigator.mediaSession.playbackState = 'paused' } catch {}
    }
  }, [isPlaying, autoPlayActive, currentWordIndex, vocabulary, selectedTopic, targetLanguage, nativeLanguage])

  // Arrow key navigation for words — blocked during playback
  const _arrowNavRef = useRef({ handlePrevious, handleNext, isPlaying, autoPlayActive, currentPage })
  _arrowNavRef.current = { handlePrevious, handleNext, isPlaying, autoPlayActive, currentPage }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { handlePrevious, handleNext, isPlaying, autoPlayActive, currentPage } = _arrowNavRef.current
      if (currentPage !== 'learning') return
      if (isPlaying || autoPlayActive) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hold gesture handlers for flashcard example sentences.
  // The timer lives in a ref (not a render-scoped `let`) so it survives the
  // re-render triggered by setHoldingCardIndex — otherwise a quick tap could
  // never clear it and the example modal would open on every tap.
  const flashcardHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFlashcardHoldStart = (cardIndex: number) => {
    const currentWord = vocabulary[currentWordIndex]
    if (!currentWord || !currentWord.id || currentWord.isPlaylistWord) return

    if (flashcardHoldTimerRef.current) clearTimeout(flashcardHoldTimerRef.current)
    setHoldingCardIndex(cardIndex)
    flashcardHoldTimerRef.current = setTimeout(() => {
      hapticsMedium() // confirm the long-press revealed the example sentences
      setExampleModalData({
        vocabularyId: currentWord.id,
        sourceWord: getCurrentContent().sourceWord,
        targetWord: getCurrentContent().targetWord,
        englishWord: currentWord.english_word || currentWord.word_en || ''
      })
      setShowExampleModal(true)
      setHoldingCardIndex(null)
      flashcardHoldTimerRef.current = null
    }, 450) // 450ms hold time
  }

  const handleFlashcardHoldEnd = () => {
    setHoldingCardIndex(null)
    if (flashcardHoldTimerRef.current) {
      clearTimeout(flashcardHoldTimerRef.current)
      flashcardHoldTimerRef.current = null
    }
  }

  const handleAddToPlaylist = () => {
    // Close example modal and show playlist modal
    setShowExampleModal(false)
    setShowPlaylistModal(true)
  }

  const handleSettingsClick = () => {
    setShowSettings(true)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
  }

  const updateSetting = async (key: string, value: any) => {
    
    // If phonetics toggle is turned on and we have vocabulary, fetch phonetics
    if (key === 'showPhonetics' && value === true && vocabulary.length > 0) {
      fetchPhonetics(vocabulary, targetLanguageCode, nativeLanguageCode)
    }
    
    // Don't save if settings haven't loaded yet (prevents saving defaults)
    if (!settingsLoadedRef.current && user?.id) {
      setSettings((prev) => ({ ...prev, [key]: value }))
      return
    }
    
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value }
      
      // Save immediately to database
      if (user?.id) {
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings })
        })
          .then(response => {
            if (response.ok) {
              return response.json()
            } else {
              console.error('❌ Failed to save settings - HTTP', response.status)
              throw new Error(`HTTP ${response.status}`)
            }
          })
          .then(data => {
          })
          .catch(error => {
            console.error('❌ Error saving settings:', error)
          })
      } else {
      }
      
      return newSettings
    })
  }

  // ── Notifications ────────────────────────────────────────────────────────
  // Pass updateSetting directly — the hook's internal persistPrefsRef always
  // captures the latest version, so no stale-closure issue here.
  const notificationsHook = useNotifications(updateSetting)

  const handleNotifPromptPrimary = async () => {
    if (notifPromptVariant === 'enable') {
      // Trigger the OS permission dialog. If denied, switch this same modal to
      // the 'settings' variant so the next CTA opens iOS Settings.
      localStorage.setItem('vw_notif_prompted', 'true')
      const granted = await notificationsHook.setEnabled(true)
      if (granted) {
        setShowNotifPrompt(false)
      } else {
        setNotifPromptVariant('settings')
      }
    } else {
      handleOpenAppSettings()
      handleNotifPromptDismiss()
    }
  }

  // First-time tutorial: fires first when the user lands on the confirmation page.
  useEffect(() => {
    if (
      currentPage === 'confirmation' &&
      user &&
      !localStorage.getItem('vw_tutorial_shown')
    ) {
      const t = setTimeout(() => setShowTutorial(true), 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, user])

  // Notification setup: fires when the user returns to the main menu (topics page)
  // AFTER playing at least 10 words — never interrupts an active study session.
  useEffect(() => {
    if (
      currentPage === 'confirmation' &&
      user &&
      Capacitor.isNativePlatform() &&
      !showTutorial &&
      localStorage.getItem('vw_tutorial_shown') &&
      !localStorage.getItem('vw_notif_prompted') &&
      parseInt(localStorage.getItem('vw_words_played_count') || '0', 10) >= 10
    ) {
      const t = setTimeout(() => { setNotifPromptVariant('enable'); setShowNotifPrompt(true) }, 500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, user, showTutorial])

  const handleTutorialDone = () => {
    setShowTutorial(false)
    localStorage.setItem('vw_tutorial_shown', 'true')
  }

  // First-time learning-view tutorial: fires the first time the user opens a topic.
  // Skipped for the search/playlist views (id -1, -2) and only when vocabulary is loaded
  // so the flashcards target actually exists in the DOM.
  useEffect(() => {
    if (
      currentPage === 'learning' &&
      selectedTopic &&
      selectedTopic.id !== -1 &&
      selectedTopic.id !== -2 &&
      vocabulary.length > 0 &&
      !localStorage.getItem('vw_learning_tutorial_shown')
    ) {
      const t = setTimeout(() => setShowLearningTutorial(true), 800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedTopic, vocabulary.length])

  const handleLearningTutorialDone = () => {
    setShowLearningTutorial(false)
    localStorage.setItem('vw_learning_tutorial_shown', 'true')
  }

  // Re-check notification permission when the app returns to foreground.
  // Catches the case where the user went to iOS Settings and enabled notifications.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        notificationsHook.refreshPermissionState()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsHook.refreshPermissionState])

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
      handleBackToTopics()
    }
  }



  // Topic click handler with subscription check
  const handleTopicClick = async (topic: Topic) => {

    // Check if user can access this topic
    if (!canAccessTopic(topic.id)) {
      hapticsWarning()
      setShowPaywall(true)
      return
    }

    // User has access, proceed
    hapticsLight()
    lastTopicSectionRef.current = currentSection
    handleTopicSelect(topic)
  }

  // renderTopicButton function - defined after handleTopicClick to access it
  const renderTopicButton = (topic: Topic) => {
    const isCompleted = completedTopicIds.includes(topic.id)
    const completionCount = topicCompletionCounts[topic.id] || 0
    const hideCompletionBorder = user?.email === 'screenshots@sprind.uk'

    const completionBorderClass = hideCompletionBorder ? '' : completionCount >= 5
      ? 'border-2 border-purple-400'
      : completionCount === 4
      ? 'border-2 border-red-400'
      : completionCount === 3
      ? 'border-2 border-orange-400'
      : completionCount === 2
      ? 'border-2 border-green-400'
      : completionCount === 1
      ? 'border-2 border-white/80'
      : isCompleted
      ? 'border-2 border-white/80'
      : ''

    const handleTopicHoldStart = (e: React.TouchEvent) => {
      releasePressedTile()
      longPressFiredRef.current = false
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      const btn = e.currentTarget as HTMLElement
      pressedTileRef.current.timer = window.setTimeout(() => {
        btn.style.transform = 'scale(0.97)'
        pressedTileRef.current = { el: btn, timer: null }
      }, 60)
      if (isCompleted) {
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true
          longPressTimerRef.current = null
          hapticsMedium()
          setQuizTopic({ id: topic.id, name: getTopicDisplayName(topic.id, topic.name) })
          releasePressedTile()
        }, 500)
      }
    }

    const handleTopicHoldMove = (e: React.TouchEvent) => {
      if (!touchStartPos.current) return
      const dx = e.touches[0].clientX - touchStartPos.current.x
      const dy = e.touches[0].clientY - touchStartPos.current.y
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        releasePressedTile()
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
        touchStartPos.current = null
      }
    }

    const handleTopicHoldEnd = () => {
      releasePressedTile()
      touchStartPos.current = null
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    return (
      <button
        key={topic.id}
        onClick={async () => {
          if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
          await handleTopicClick(topic)
        }}
        onTouchStart={(e) => handleTopicHoldStart(e)}
        onTouchMove={(e) => handleTopicHoldMove(e)}
        onTouchEnd={() => handleTopicHoldEnd()}
        onTouchCancel={() => handleTopicHoldEnd()}
        aria-label={isCompleted ? t('learning.aria.topicCompleted', { topic: getTopicDisplayName(topic.id, topic.name) }) : t('learning.aria.topic', { topic: getTopicDisplayName(topic.id, topic.name) })}
        aria-pressed={selectedTopic?.id === topic.id}
        className={`bg-black/40 rounded-xl xs:rounded-2xl sm:rounded-2xl p-3 xs:p-4 sm:p-5 text-center hover:bg-black/50 h-32 xs:h-36 sm:h-40 shadow-lg scale-100 transition-[transform,background-color] duration-150 ease-out ${
          !hideCompletionBorder && selectedTopic?.id === topic.id ? "bg-black/60 shadow-xl" : ""
        } ${completionBorderClass}`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            <Icon icon={getTopicIcon(topic.id)} className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 mx-auto" style={{ color: 'rgba(255,255,255,0.8)' }} />
          </div>
          <p className="text-white/90 text-base xs:text-lg sm:text-xl font-medium leading-tight px-1 text-center w-full">{getTopicDisplayName(topic.id, topic.name)}</p>
        </div>
      </button>
    )
  }

  // Don't render until auth is initialized
  if (loading) {
    return null
  }

  return (
    <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-2 sm:px-3 h-full max-h-[95vh] flex items-center">
      <div className={`bg-white/5 backdrop-blur-3xl border border-white/15 rounded-2xl sm:rounded-3xl px-3 sm:px-5 md:px-7 py-4 sm:py-5 md:py-6 shadow-2xl w-full max-h-full overflow-hidden ${isTransitioning ? 'bg-white/10' : 'bg-white/5'}`}>
        {currentPage === "learning" && selectedTopic?.id === -1 && (
          /* Search Word Learning - Custom word search mode */
          <div
            className={`transition-all duration-200 ease-in-out ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
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
            className={`text-center transition-all duration-200 ease-in-out ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8 gap-2">
                <button
                  onClick={handleBackToTopics}
                  onTouchStart={() => setHoldingNavButton('back')}
                  onTouchEnd={() => setHoldingNavButton(null)}
                  onTouchCancel={() => setHoldingNavButton(null)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/15 shadow-lg flex-shrink-0 ${
                    holdingNavButton === 'back' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-110'
                  }`}
                >
                  <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
                </button>

                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center">
                  {/* Topic Icon */}
                  <Icon
                    icon={getTopicIcon(selectedTopic?.id)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-white text-center truncate">
                    {selectedTopic ? getTopicDisplayName(selectedTopic.id, selectedTopic.name) : ''}
                  </h1>
                </div>
                
                <button
                  data-tour="learning-settings"
                  onClick={handleSettingsClick}
                  onTouchStart={() => setHoldingNavButton('settings')}
                  onTouchEnd={() => setHoldingNavButton(null)}
                  onTouchCancel={() => setHoldingNavButton(null)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/15 shadow-lg flex-shrink-0 ${
                    holdingNavButton === 'settings' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-110'
                  }`}
                >
                  <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
                </button>
              </div>

              {/* Progress indicator */}
              {vocabulary.length > 0 && (
                <div className="mb-6 text-center">
                    <p className="text-white/60 text-sm">
                      {(() => {
                        const progress = getCategoryProgress()
                        return t('learning.wordsProgress', { current: progress.current, total: progress.total })
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
                      title={t('learning.aria.prevCategory')}
                    >
                      <ChevronLeft className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-white/70 text-xs font-medium tracking-wider">
                    {getCurrentContent().category}
                  </span>
                  {/* Navigation arrows only for Verbs and Common Phrases */}
                  {(selectedTopic?.id === 41 || selectedTopic?.id === 42) && (
                    <button
                      onClick={handleNextCategory}
                      className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-200 transform hover:scale-110"
                      disabled={vocabulary.length === 0}
                      aria-label={t('learning.aria.nextCategory')}
                    >
                      <ChevronRight className="w-4 h-4 text-white/60" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              <div
                data-tour="learning-flashcards"
                className="space-y-6 mb-12"
                onTouchStart={(e) => e.stopPropagation()}
                aria-live="polite"
                aria-atomic="true"
                aria-label={t('learning.aria.wordOf', { current: currentWordIndex + 1, total: vocabulary.length })}
              >
                <div
                  role="region"
                  aria-label={`${getTranslatedLanguageName(targetLanguageCode)}: ${getCurrentContent().sourceWord}`}
                  className={`bg-black/40 border border-white/20 rounded-2xl p-8 transition-all duration-300 shadow-lg ${
                    currentAudioStep === 'training'
                      ? 'bg-blue-500/20 border-blue-400/30 scale-105'
                      : holdingCardIndex === 0
                      ? 'scale-105'
                      : 'bg-black/40'
                  }`}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldStart(0)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldEnd()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldStart(0)
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldEnd()
                  }}
                  onMouseLeave={handleFlashcardHoldEnd}
                >
                  <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
                    {getTranslatedLanguageName(targetLanguageCode)}
                    {currentAudioStep === 'training' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-white text-2xl font-medium">{getCurrentContent().sourceWord}</p>
                  {settings.showPhonetics && phonetics[currentWordIndex]?.target && (
                    <p className="text-white/50 text-sm italic mt-2" aria-label={t('learning.aria.pronunciation', { ipa: phonetics[currentWordIndex].target })}>/{phonetics[currentWordIndex].target}/</p>
                  )}
                </div>
                <div
                  role="region"
                  aria-label={`${getTranslatedLanguageName(nativeLanguageCode)}: ${getCurrentContent().targetWord}`}
                  className={`bg-black/40 border border-white/20 rounded-2xl p-8 transition-all duration-300 shadow-lg ${
                    currentAudioStep === 'main'
                      ? 'bg-blue-500/20 border-blue-400/30 scale-105'
                      : holdingCardIndex === 1
                      ? 'scale-105'
                      : 'bg-black/40'
                  }`}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldStart(1)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldEnd()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldStart(1)
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    handleFlashcardHoldEnd()
                  }}
                  onMouseLeave={handleFlashcardHoldEnd}
                >
                  <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
                    {getTranslatedLanguageName(nativeLanguageCode)}
                    {currentAudioStep === 'main' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-white text-2xl font-medium">{getCurrentContent().targetWord}</p>
                </div>
              </div>

              {vocabulary.length === 0 && !isLoading ? (
                <div className="text-center mb-8">
                  <Button
                    onClick={handleBackToTopics}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-medium rounded-2xl h-12 px-8"
                  >
                    {t('learning.tryDifferent')}
                  </Button>
                </div>
              ) : (
                <div data-tour="learning-controls" className="flex items-center justify-center gap-8">
                  <button
                    onClick={handlePrevious}
                    onTouchStart={() => setHoldingNavButton('previous')}
                    onTouchEnd={() => setHoldingNavButton(null)}
                    onTouchCancel={() => setHoldingNavButton(null)}
                    aria-label={vocabulary.length > 0 ? t('learning.aria.prevWordNamed', { word: vocabulary[Math.max(0, currentWordIndex - 1)]?.targetWord ?? '' }) : t('learning.aria.prevWord')}
                    className={`w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                      holdingNavButton === 'previous' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-110'
                    } ${isPlaying || autoPlayActive ? 'opacity-30 cursor-not-allowed' : ''}`}
                    disabled={vocabulary.length === 0 || isPlaying || autoPlayActive}
                  >
                    <ChevronLeft className="w-7 h-7 text-white/80" aria-hidden="true" />
                  </button>

                  <button
                    onClick={handlePlay}
                    onTouchStart={() => setHoldingNavButton('play')}
                    onTouchEnd={() => setHoldingNavButton(null)}
                    onTouchCancel={() => setHoldingNavButton(null)}
                    aria-label={isPlaying || autoPlayActive ? t('learning.aria.stopAudio') : t('learning.aria.playWordIn', { word: vocabulary[currentWordIndex]?.targetWord || '', language: getTranslatedLanguageName(targetLanguageCode) })}
                    aria-pressed={isPlaying || autoPlayActive}
                    className={`w-16 h-16 border border-white/20 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                      isPlaying || autoPlayActive
                        ? 'bg-red-500/30 hover:bg-red-500/40' 
                        : currentAudioStep === 'training'
                        ? 'bg-blue-500/30 hover:bg-blue-500/40'
                        : currentAudioStep === 'main'
                        ? 'bg-blue-500/30 hover:bg-blue-500/40'
                        : 'bg-black/40 hover:bg-black/50'
                    } ${
                      holdingNavButton === 'play' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-110'
                    }`}
                    disabled={vocabulary.length === 0}
                  >
                    {isPlaying || autoPlayActive ? (
                      <Square className="w-8 h-8 text-white/80" aria-hidden="true" />
                    ) : (
                      <Play className="w-8 h-8 text-white/80 ml-1" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    onTouchStart={() => setHoldingNavButton('next')}
                    onTouchEnd={() => setHoldingNavButton(null)}
                    onTouchCancel={() => setHoldingNavButton(null)}
                    aria-label={vocabulary.length > 0 ? t('learning.aria.nextWordNamed', { word: vocabulary[Math.min(vocabulary.length - 1, currentWordIndex + 1)]?.targetWord ?? '' }) : t('learning.aria.nextWord')}
                    className={`w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                      holdingNavButton === 'next' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-110'
                    } ${isPlaying || autoPlayActive ? 'opacity-30 cursor-not-allowed' : ''}`}
                    disabled={vocabulary.length === 0 || isPlaying || autoPlayActive}
                  >
                    <ChevronRight className="w-7 h-7 text-white/80" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single interface - only text changes */}
        {currentPage !== "confirmation" && currentPage !== "learning" && (
          <div className={`text-center mb-12 transition-all duration-200 ease-in-out ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
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
                  placeholder={t('learning.searchLanguages')}
                />
              </div>
            </div>

            {/* Language Grid */}
            <div className="max-h-96 lg:max-h-[500px] overflow-y-auto mb-6 language-grid-container">
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredLanguages.map((language) => {
                  const handleLanguageHoldStart = (langCode: string) => {
                    setHoldingLanguageCode(langCode)
                  }

                  const handleLanguageHoldEnd = () => {
                    setHoldingLanguageCode(null)
                  }

                  return (
                    <button
                      key={language.code}
                      onClick={() => handleLanguageSelect(language)}
                      onTouchStart={() => handleLanguageHoldStart(language.code)}
                      onTouchEnd={() => handleLanguageHoldEnd()}
                      onTouchCancel={() => handleLanguageHoldEnd()}
                      className={`p-5 bg-black/40 border border-white/20 rounded-xl hover:bg-black/50 text-center min-h-[75px] flex flex-col items-center justify-center gap-2 shadow-lg ${
                        holdingLanguageCode === language.code ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300 hover:scale-[1.02]'
                      }`}
                    >
                      <Icon icon={getFlagIcon(language.code)} className="w-7 h-7" />
                      <p className="text-white font-medium text-sm leading-tight">{getTranslatedLanguageName(language.code)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Page 3: Confirmation */}
        {currentPage === "confirmation" && (
          <div className={`text-center transition-all duration-300 ease-in-out h-full flex flex-col min-h-0 ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
            {/* iPhone-style sliding topics interface */}
            <div className="flex-1 mb-4 min-h-0 overflow-hidden">
              <TopicSlider 
                topics={topics}
                selectedTopic={selectedTopic}
                onTopicSelect={handleTopicSelect}
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
                setShowManageAccount={setShowManageAccount}
                sections={sections}
              />
            </div>

            {/* Language selector at bottom */}
            <div className="flex-shrink-0 px-3 pb-3" data-tour="language-switcher">
              <div className="flex items-center justify-center gap-3 max-w-full">
                <button
                  onClick={() => handleConfirmationLanguageChange("native")}
                  onTouchStart={() => setHoldingSwapButton('native')}
                  onTouchEnd={() => setHoldingSwapButton(null)}
                  onTouchCancel={() => setHoldingSwapButton(null)}
                  className={`bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 hover:bg-black/50 shadow-lg min-w-0 ${
                    holdingSwapButton === 'native' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300'
                  }`}
                >
                  <p className="text-white font-medium text-sm truncate">{nativeLanguage}</p>
                </button>
                <div className="flex items-center justify-center flex-shrink-0">
                  <Languages className="w-5 h-5 text-white/60" />
                </div>
                <button
                  onClick={() => handleConfirmationLanguageChange("target")}
                  onTouchStart={() => setHoldingSwapButton('target')}
                  onTouchEnd={() => setHoldingSwapButton(null)}
                  onTouchCancel={() => setHoldingSwapButton(null)}
                  className={`bg-black/40 border border-white/20 rounded-xl p-2.5 flex-1 hover:bg-black/50 shadow-lg min-w-0 ${
                    holdingSwapButton === 'target' ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300'
                  }`}
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50" onClick={handleSettingsClose}>
          <div className={`bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 md:p-8 w-full max-w-md sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl ${isIOS ? 'ios-glass-override' : ''}`} onClick={(e) => e.stopPropagation()} style={{ WebkitTapHighlightColor: 'transparent' }}>
            <div className="flex items-center justify-end mb-4 sm:mb-6 md:mb-8">
              <button
                onClick={handleSettingsClose}
                className="w-10 h-10 sm:w-11 sm:h-11 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-black/30 transition-all duration-300 flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Playback Options */}
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">{t('settings.title')}</h3>
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:play-circle-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                        <p className="text-white text-base">{t('settings.autoplay.label')}</p>
                      </div>
                      <p className="text-white/50 text-sm mt-0.5">{t('settings.autoplay.desc')}</p>
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
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:volume-loud-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                        <p className="text-white text-base">{t('settings.targetOnly.label')}</p>
                      </div>
                      <p className="text-white/50 text-sm mt-0.5">{t('settings.targetOnly.desc')}</p>
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
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:text-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                        <p className="text-white text-base">{t('settings.phonetics.label')}</p>
                      </div>
                      <p className="text-white/50 text-sm mt-0.5">{t('settings.phonetics.desc')}</p>
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

              {/* Rewind Section */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:rewind-back-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base font-medium">{t('settings.rewind.label')}</p>
                    </div>
                    <p className="text-white/50 text-sm mt-0.5">{t('settings.rewind.desc')}</p>
                  </div>
                  <button
                    onClick={() => updateSetting("rewindEnabled", !settings.rewindEnabled)}
                    className={`w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      settings.rewindEnabled
                        ? "bg-blue-500"
                        : "bg-black/30 border border-white/20"
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                      settings.rewindEnabled ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
                {settings.rewindEnabled && (
                  <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="1"
                      value={settings.rewindAfterWords}
                      onChange={(e) => updateSetting("rewindAfterWords", Number.parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-white/60 text-sm mt-2">
                      <span>{tPlural('settings.words', 2)}</span>
                      <span className="text-white font-medium">{tPlural('settings.words', settings.rewindAfterWords)}</span>
                      <span>{tPlural('settings.words', 20)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pace Section */}
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">{t('settings.pace')}</h3>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Icon icon="solar:soundwave-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base">{t('settings.speed.label')}</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      {/* Stored value stays the English keyword — only the label is translated */}
                      {([["Slow", t('settings.speed.slow')], ["Normal", t('settings.speed.normal')], ["Fast", t('settings.speed.fast')]] as const).map(([speed, label]) => (
                        <button
                          key={speed}
                          onClick={() => {
                            updateSetting("pronunciationSpeed", speed)
                          }}
                          className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all duration-300 ${
                            settings.pronunciationSpeed === speed
                              ? "bg-white/20 border border-white/30 text-white"
                              : "bg-black/20 border border-white/10 text-white/70 hover:bg-black/30"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Icon icon="solar:pause-circle-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base">{t('settings.pauseTranslations.label')}</p>
                    </div>
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
                      <div className="flex justify-between text-white/60 text-sm mt-2">
                        <span>{t('settings.seconds', { n: 0.2 })}</span>
                        <span className="text-white font-medium">{t('settings.seconds', { n: settings.pauseBetweenTranslations })}</span>
                        <span>{t('settings.seconds', { n: 10 })}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Icon icon="solar:skip-next-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base">{t('settings.pauseNextWord.label')}</p>
                    </div>
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
                      <div className="flex justify-between text-white/60 text-sm mt-2">
                        <span>{t('settings.seconds', { n: 0.2 })}</span>
                        <span className="text-white font-medium">{t('settings.seconds', { n: settings.pauseForNextWord })}</span>
                        <span>{t('settings.seconds', { n: 10 })}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Icon icon="solar:repeat-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base">{t('settings.repeatTarget.label')}</p>
                    </div>
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
                      <div className="flex justify-between text-white/60 text-sm mt-2">
                        <span>{t('settings.times', { n: 1 })}</span>
                        <span className="text-white font-medium">{t('settings.times', { n: settings.repeatTargetLanguage })}</span>
                        <span>{t('settings.times', { n: 5 })}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Icon icon="solar:repeat-one-bold" width="20" height="20" className="text-white/60 flex-shrink-0" />
                      <p className="text-white text-base">{t('settings.repeatMain.label')}</p>
                    </div>
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
                      <div className="flex justify-between text-white/60 text-sm mt-2">
                        <span>{t('settings.times', { n: 1 })}</span>
                        <span className="text-white font-medium">{t('settings.times', { n: settings.repeatMainLanguage })}</span>
                        <span>{t('settings.times', { n: 5 })}</span>
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
              {t('common.done')}
            </Button>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">{t('createPlaylist.title')}</h3>
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
                {t('createPlaylist.forPair')} <span className="text-blue-400">{getTranslatedLanguageName(nativeLanguageCode)}</span> → <span className="text-green-400">{getTranslatedLanguageName(targetLanguageCode)}</span>
              </p>
            </div>
            
            <div className="relative mb-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value.slice(0, 22))}
                placeholder={t('createPlaylist.placeholder')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || isCreatingPlaylist}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {isCreatingPlaylist ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('createPlaylist.creating')}
                  </>
                ) : (
                  t('createPlaylist.create')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Example Sentences Modal */}
      {showExampleModal && exampleModalData && (
        <ExampleSentencesModal
          vocabularyId={exampleModalData.vocabularyId}
          sourceWord={exampleModalData.sourceWord}
          targetWord={exampleModalData.targetWord}
          nativeLanguageCode={nativeLanguageCode}
          targetLanguageCode={targetLanguageCode}
          userId={user?.id}
          onCloseAction={() => {
            setShowExampleModal(false)
            setExampleModalData(null)
          }}
          onAddToPlaylistAction={handleAddToPlaylist}
        />
      )}

      {/* Playlist Select Modal (opened from Add to Playlist button in Example Sentences) */}
      {showPlaylistModal && exampleModalData && user?.id && (
        <PlaylistSelectModal
          word={exampleModalData.englishWord || exampleModalData.targetWord}
          translation={exampleModalData.sourceWord}
          userId={user.id}
          translations={{
            [nativeLanguageCode]: exampleModalData.targetWord,
            [targetLanguageCode]: exampleModalData.sourceWord
          }}
          nativeLanguageCode={nativeLanguageCode}
          targetLanguageCode={targetLanguageCode}
          onClose={() => {
            setShowPlaylistModal(false)
            setExampleModalData(null)
          }}
          onSelect={() => {
            setShowPlaylistModal(false)
            setExampleModalData(null)
          }}
        />
      )}

      {/* Manage Account Modal */}
      <ManageAccountModal
        open={showManageAccount}
        onCloseAction={() => { setShowManageAccount(false); setOpenNotificationsInAccount(false) }}
        name={user?.app_metadata?.provider === 'email'
          ? (user?.email || 'User')
          : (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User')}
        email={user?.email || ''}
        avatarUrl={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
        isPremium={isPremium}
        planType={subscriptionStatus?.subscription?.planType ?? null}
        renewalDate={
          subscriptionStatus?.subscription?.currentPeriodEnd
            ? new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : undefined
        }
        onSignOutAction={handleSignOut}
        notifPermission={notificationsHook.permissionState}
        openNotifications={openNotificationsInAccount}
        showOnLeaderboard={showOnLeaderboard}
        onLeaderboardToggle={handleLeaderboardToggle}
        showLeaderboardOption={user?.app_metadata?.provider !== 'email'}
      />

      {/* Benefits prompt — variant 'enable' triggers the OS permission dialog;
          variant 'settings' opens iOS Settings (used after the OS dialog was denied). */}
      <NotificationPromptModal
        open={showNotifPrompt}
        variant={notifPromptVariant}
        onPrimary={handleNotifPromptPrimary}
        onDismiss={handleNotifPromptDismiss}
      />

      {/* First-time coach-mark tutorial (home / topic grid) */}
      <CoachMarkOverlay
        open={showTutorial}
        steps={tutorialSteps}
        onComplete={handleTutorialDone}
        onSkip={handleTutorialDone}
      />

      {/* First-time coach-mark tutorial (inside a topic) */}
      <CoachMarkOverlay
        open={showLearningTutorial}
        steps={learningTutorialSteps}
        onComplete={handleLearningTutorialDone}
        onSkip={handleLearningTutorialDone}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onCloseAction={() => setShowPaywall(false)}
        onSuccessAction={() => {
          setShowPaywall(false)
        }}
        nativeLanguageCode={nativeLanguageCode}
        targetLanguageCode={targetLanguageCode}
      />

      {quizTopic && user?.id && (
        <TopicQuizModal
          topicId={quizTopic.id}
          topicName={getTopicDisplayName(quizTopic.id, quizTopic.name)}
          userId={user.id}
          targetLanguageCode={targetLanguageCode}
          sourceLanguageCode={nativeLanguageCode}
          onClose={() => setQuizTopic(null)}
        />
      )}

    </div>
  )
}

export default LanguageSelector
