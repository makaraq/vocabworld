'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import Lottie from 'lottie-react'
import { hapticsSuccess } from '@/lib/haptics'
import trophyAnim from '@/lib/animations/trophy.json'

const CONGRATS_LINES = [
  'Nice work — you finished',
  'You nailed it — you completed',
  'Way to go — you wrapped up',
  'Solid effort — you finished',
  'Great job — you conquered',
  'Well done — you completed',
  'Impressive — you mastered',
]

interface NextTopicInfo {
  id: number
  name: string
}

interface Props {
  open: boolean
  topicName: string
  nextTopic: NextTopicInfo | null
  nextTopicIcon?: string
  onContinueAction: () => void
  onRepeatAction: () => void
  onCloseAction: () => void
}

export function TopicCompleteModal({
  open,
  topicName,
  nextTopic,
  nextTopicIcon,
  onContinueAction,
  onRepeatAction,
  onCloseAction,
}: Props) {
  const [shown, setShown] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const congratsLine = useMemo(
    () => CONGRATS_LINES[Math.floor(Math.random() * CONGRATS_LINES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setShown(true))
      setAnimKey((k) => k + 1)
      hapticsSuccess()
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const isSvgIcon = nextTopicIcon?.startsWith('<svg')

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCloseAction}
      />

      {/* Modal */}
      <div
        className={`relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-sm w-full text-center shadow-2xl transition-all duration-300 ${
          shown ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
      >
        {/* Trophy Lottie */}
        <div className="flex justify-center mb-5">
          <div className="w-40 h-40">
            <Lottie
              key={animKey}
              animationData={trophyAnim}
              loop={false}
              autoplay
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide drop-shadow-lg">
          Topic Complete!
        </h2>
        <p className="text-white/90 text-base mb-1 drop-shadow">{congratsLine}</p>
        <p className="text-white font-semibold text-lg mb-6 drop-shadow-lg">{topicName}</p>

        {nextTopic ? (
          <>
            <div className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 mb-5">
              <div className="text-[11px] uppercase tracking-wider text-white/60 mb-0.5">
                Up next
              </div>
              <div className="flex items-center justify-center gap-2">
                {nextTopicIcon && (
                  isSvgIcon ? (
                    <span
                      className="w-5 h-5 text-white/80 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: nextTopicIcon }}
                    />
                  ) : (
                    <Icon
                      icon={nextTopicIcon}
                      width="20"
                      height="20"
                      className="text-white/80 flex-shrink-0"
                    />
                  )
                )}
                <span className="text-white font-semibold text-base">{nextTopic.name}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={onContinueAction}
                className="w-full bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-gray-50 transition-all transform hover:scale-[1.02]"
              >
                Continue to {nextTopic.name}
                <Icon icon="solar:arrow-right-bold" width="18" height="18" />
              </button>
              <button
                onClick={onRepeatAction}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-white/15 transition-all"
              >
                <Icon icon="solar:refresh-bold" width="16" height="16" />
                Practice {topicName} again
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 mb-5">
              <div className="text-white/90 text-sm">
                You've completed every topic. Legend status unlocked.
              </div>
            </div>
            <button
              onClick={onRepeatAction}
              className="w-full bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-gray-50 transition-all transform hover:scale-[1.02]"
            >
              <Icon icon="solar:refresh-bold" width="18" height="18" />
              Practice {topicName} again
            </button>
            <button
              onClick={onCloseAction}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/15 transition-all"
            >
              Back to topics
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
