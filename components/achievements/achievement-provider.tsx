'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AchievementDef } from '@/lib/achievements/definitions'
import {
  subscribeUnlock,
  subscribeTopicComplete,
  subscribeOpenBadgesGallery,
  TopicCompleteEvent,
} from '@/lib/achievements/engine'
import { AchievementToast } from './achievement-toast'
import { TopicCompleteModal } from './topic-complete-modal'
import { BadgesModal } from './badges-modal'

interface QueuedToast {
  key: number
  achievement: AchievementDef
}

type TopicChoiceHandler = (
  topicId: number,
  action: 'continue' | 'repeat',
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
  const [toasts, setToasts] = useState<QueuedToast[]>([])
  const [topicEvent, setTopicEvent] = useState<TopicCompleteEvent | null>(null)
  const [showBadges, setShowBadges] = useState(false)
  const [mounted, setMounted] = useState(false)
  const handlerRef = useRef<TopicChoiceHandler | null>(null)
  const keyRef = useRef(0)

  useEffect(() => setMounted(true), [])

  // Subscribe to unlocks → push into the toast stack.
  useEffect(() => {
    const off = subscribeUnlock((e) => {
      keyRef.current += 1
      const queued: QueuedToast = { key: keyRef.current, achievement: e.achievement }
      setToasts((prev) => {
        // Cap the visible stack so we don't bury the screen.
        const next = [...prev, queued]
        return next.slice(-3)
      })
    })
    return off
  }, [])

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

  const dismissToast = (key: number) =>
    setToasts((prev) => prev.filter((t) => t.key !== key))

  const closeTopic = () => setTopicEvent(null)

  const handleContinue = () => {
    if (!topicEvent) return
    handlerRef.current?.(
      topicEvent.topicId,
      'continue',
      topicEvent.nextTopic?.id ?? null,
    )
    setTopicEvent(null)
  }

  const handleRepeat = () => {
    if (!topicEvent) return
    handlerRef.current?.(topicEvent.topicId, 'repeat', null)
    setTopicEvent(null)
  }

  // Portal all overlays to <body> so they always escape any parent stacking
  // context (the language-selector card uses transform + backdrop-filter,
  // which would otherwise trap fixed-position children).
  const overlays = mounted
    ? createPortal(
        <>
          <div
            className="fixed top-0 left-0 right-0 z-[90] pt-[max(env(safe-area-inset-top),12px)] px-3 flex flex-col items-center gap-2 pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <AchievementToast
                key={t.key}
                achievement={t.achievement}
                onDismissAction={() => dismissToast(t.key)}
              />
            ))}
          </div>

          <TopicCompleteModal
            open={!!topicEvent}
            topicName={topicEvent?.topicName || ''}
            nextTopic={topicEvent?.nextTopic ?? null}
            onContinueAction={handleContinue}
            onRepeatAction={handleRepeat}
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
