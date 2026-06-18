'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Capacitor } from '@capacitor/core'
import { createPortal } from 'react-dom'
import {
  subscribeTopicComplete,
  subscribeOpenBadgesGallery,
  TopicCompleteEvent,
} from '@/lib/achievements/engine'
import { TopicCompleteModal } from './topic-complete-modal'
import { BadgesModal } from './badges-modal'

type TopicChoiceHandler = (
  topicId: number,
  action: 'continue' | 'repeat' | 'quiz',
  nextTopicId: number | null,
) => void

interface AchievementContextValue {
  /** Learning surface registers a callback so the modal buttons can drive its state. */
  registerTopicChoiceHandler: (fn: TopicChoiceHandler | null) => void
}

const AchievementContext = createContext<AchievementContextValue | null>(null)

export function useAchievementContext(): AchievementContextValue {
  const ctx = useContext(AchievementContext)
  if (!ctx) {
    // Outside the provider — return a no-op so non-app pages don't crash.
    return { registerTopicChoiceHandler: () => {} }
  }
  return ctx
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [topicEvent, setTopicEvent] = useState<TopicCompleteEvent | null>(null)
  const [showBadges, setShowBadges] = useState(false)
  const [mounted, setMounted] = useState(false)
  const handlerRef = useRef<TopicChoiceHandler | null>(null)

  useEffect(() => setMounted(true), [])

  // Subscribe to topic-complete events.
  useEffect(() => {
    const off = subscribeTopicComplete((e) => setTopicEvent(e))
    return off
  }, [])

  // Listen for "open badges gallery" requests from anywhere in the app.
  useEffect(() => {
    const off = subscribeOpenBadgesGallery(() => setShowBadges(true))
    return off
  }, [])

  const registerTopicChoiceHandler = useCallback(
    (fn: TopicChoiceHandler | null) => {
      handlerRef.current = fn
    },
    [],
  )

  const requestAppReviewOnce = () => {
    if (
      !localStorage.getItem('vw_review_requested') &&
      Capacitor.isNativePlatform()
    ) {
      localStorage.setItem('vw_review_requested', 'true')
      import('capacitor-rate-app').then(({ RateApp }) => {
        RateApp.requestReview().catch(() => {})
      })
    }
  }

  const closeTopic = () => {
    requestAppReviewOnce()
    setTopicEvent(null)
  }

  const handleContinue = () => {
    if (!topicEvent) return
    handlerRef.current?.(
      topicEvent.topicId,
      'continue',
      topicEvent.nextTopic?.id ?? null,
    )
    requestAppReviewOnce()
    setTopicEvent(null)
  }

  const handleRepeat = () => {
    if (!topicEvent) return
    handlerRef.current?.(topicEvent.topicId, 'repeat', null)
    requestAppReviewOnce()
    setTopicEvent(null)
  }

  const handleQuiz = () => {
    if (!topicEvent) return
    handlerRef.current?.(topicEvent.topicId, 'quiz', null)
    requestAppReviewOnce()
    setTopicEvent(null)
  }

  // Portal all overlays to <body> so they always escape any parent stacking
  // context (the language-selector card uses transform + backdrop-filter,
  // which would otherwise trap fixed-position children).
  const overlays = mounted
    ? createPortal(
        <>
          <TopicCompleteModal
            open={!!topicEvent}
            topicName={topicEvent?.topicName || ''}
            nextTopic={topicEvent?.nextTopic ?? null}
            nextTopicIcon={topicEvent?.nextTopic?.icon}
            onContinueAction={handleContinue}
            onRepeatAction={handleRepeat}
            onQuizAction={handleQuiz}
            onCloseAction={closeTopic}
          />

          <BadgesModal open={showBadges} onCloseAction={() => setShowBadges(false)} />
        </>,
        document.body,
      )
    : null

  return (
    <AchievementContext.Provider value={{ registerTopicChoiceHandler }}>
      {children}
      {overlays}
    </AchievementContext.Provider>
  )
}
