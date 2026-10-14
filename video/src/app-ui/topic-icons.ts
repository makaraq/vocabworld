import { FALLBACK_TOPIC_ICON, PLAYLIST_TOPIC_ICON, TOPIC_ICON_NAMES } from '../generated/app-sections'

/** getTopicIcon from lib/icons/topic-icons.ts. */
export function getTopicIcon(topicId: number | undefined | null): string {
  if (topicId == null) return FALLBACK_TOPIC_ICON
  if (topicId === -2) return PLAYLIST_TOPIC_ICON
  return TOPIC_ICON_NAMES[topicId] ?? FALLBACK_TOPIC_ICON
}
