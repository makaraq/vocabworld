import React from 'react'
import { Lottie, type LottieAnimationData } from '@remotion/lottie'
import { TROPHY_ANIMATION } from '../generated/trophy-animation'
import { AppIcon } from './icons'

// The celebration when a topic is finished
// (components/achievements/topic-complete-modal.tsx): the trophy animation,
// the congratulations line, what's up next and the three ways on. The
// trophy plays from the frame the enclosing <Sequence> starts.

export const TopicCompleteModal: React.FC<{
  topicName: string
  congrats: string
  nextTopic: { name: string; icon: string }
  /** The modal's entrance, 0 → 1 (scale-95, translate-y-4, opacity). */
  shown: number
}> = ({ topicName, congrats, nextTopic, shown }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" style={{ opacity: shown }} />
    <div
      className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 max-w-sm w-full text-center shadow-2xl"
      style={{ opacity: shown, transform: `translateY(${(1 - shown) * 16}px) scale(${0.95 + 0.05 * shown})` }}
    >
      <div className="flex justify-center mb-5">
        <div className="w-40 h-40">
          <Lottie animationData={TROPHY_ANIMATION as unknown as LottieAnimationData} loop={false} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-wide drop-shadow-lg">Topic Complete!</h2>
      <p className="text-white/90 text-base mb-1 drop-shadow">{congrats}</p>
      <p className="text-white font-semibold text-lg mb-6 drop-shadow-lg">{topicName}</p>

      <div className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 mb-5">
        <div className="text-[11px] uppercase tracking-wider text-white/60 mb-0.5">Up next</div>
        <div className="flex items-center justify-center gap-2">
          <AppIcon icon={nextTopic.icon} width="20" height="20" className="text-white/80 flex-shrink-0" />
          <span className="text-white font-semibold text-base">{nextTopic.name}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <button className="w-full bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg">
          Continue to {nextTopic.name}
          <AppIcon icon="solar:arrow-right-bold" width="18" height="18" />
        </button>
        <button className="w-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-400/30 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2">
          <AppIcon icon="solar:question-circle-bold" width="16" height="16" />
          Take {topicName} Quiz
        </button>
        <button className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2">
          <AppIcon icon="solar:refresh-bold" width="16" height="16" />
          Practice {topicName} again
        </button>
      </div>
    </div>
  </div>
)
