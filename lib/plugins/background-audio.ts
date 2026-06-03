import { registerPlugin, PluginListenerHandle } from '@capacitor/core'

export interface BackgroundAudioWord {
  index: number
  targetUrl: string
  sourceUrl?: string
  targetWord: string
  sourceWord: string
  topicName: string
}

export interface StartQueueOptions {
  words: BackgroundAudioWord[]
  startIndex?: number
  repeatTarget: number
  repeatSource: number
  pauseBetweenMs: number
  pauseAfterMs: number
  playbackRate: number
  playTargetOnly: boolean
  authToken?: string
  rewindEnabled: boolean
  rewindAfterWords: number
}

export interface WordChangedEvent {
  index: number
  phase: 'target' | 'source' | 'pause'
}

export interface WordPlayedEvent {
  index: number
}

export interface BackgroundAudioPlugin {
  startQueue(options: StartQueueOptions): Promise<void>
  stop(): Promise<void>
  addListener(event: 'wordChanged', handler: (data: WordChangedEvent) => void): Promise<PluginListenerHandle>
  addListener(event: 'wordPlayed', handler: (data: WordPlayedEvent) => void): Promise<PluginListenerHandle>
  addListener(event: 'complete', handler: () => void): Promise<PluginListenerHandle>
  addListener(event: 'stopped', handler: () => void): Promise<PluginListenerHandle>
}

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio')

export default BackgroundAudio
