import React from 'react'
import { topicDisplayName, type Topic } from './app-data'
import { AppIcon } from './icons'
import { getTopicIcon } from './topic-icons'
import { FocusRing, Touch } from './motion'

// A topic tile from the menu (renderTopicButton in language-selector.tsx):
// the topic's mdi icon over its name, on the black/40 tile Liquid Glass
// rounds to the 16px tile radius. Classes resolved for the 440pt width.

export interface TileState {
  topicId: number
  /** The app's hold feedback: scale(0.97) a moment after the finger lands. */
  pressed?: number
  /** 0 → 1, the film's focus ring and lift round the chosen tile. */
  focus?: number
  touch?: number
}

export const TopicCard: React.FC<{
  topic: Topic
  state?: TileState
  /** 0 → 1: this tile steps back while another one is chosen. */
  dim?: number
  /** 0 → 1: entrance. */
  reveal?: number
}> = ({ topic, state, dim = 0, reveal = 1 }) => {
  const mine = state?.topicId === topic.id
  const pressed = mine ? state?.pressed ?? 0 : 0
  const focus = mine ? state?.focus ?? 0 : 0
  const scale = (1 - 0.03 * pressed) * (1 + 0.03 * focus) * (0.94 + 0.06 * reveal)
  return (
    <button
      aria-label={`${topicDisplayName(topic)} topic`}
      className="bg-black/40 rounded-2xl p-4 text-center h-36 shadow-lg scale-100"
      style={{
        position: 'relative',
        transform: `translateY(${(1 - reveal) * 14}px) scale(${scale})`,
        opacity: reveal * (mine ? 1 : 1 - 0.55 * dim),
      }}
    >
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="flex-shrink-0 flex items-center justify-center">
          <AppIcon icon={getTopicIcon(topic.id)} className="w-14 h-14 mx-auto" style={{ color: 'rgba(255,255,255,0.8)' }} />
        </div>
        <p className="text-white/90 text-lg font-medium leading-tight px-1 text-center w-full">
          {topicDisplayName(topic)}
        </p>
      </div>
      <FocusRing p={focus} radius={16} />
      {mine && state?.touch !== undefined && <Touch t={state.touch} />}
    </button>
  )
}
