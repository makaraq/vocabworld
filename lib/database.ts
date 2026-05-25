export interface Language {
  code: string;
  name: string;
  wordCount: number;
}

export interface Topic {
  id: number;
  name: string;
  description: string;
  wordCount: number;
  icon?: string;
}

export interface VocabularyWord {
  id?: number;
  sourceWord: string;
  targetWord: string;
  confidenceScore: number;
  context?: string;
  category?: string; // Category for verb grouping (Basic, Daily Routine, etc.)
  partOfSpeech?: string;
  difficultyLevel?: string;
  exampleSentence?: string;
  learningOrder?: number;
  english_word?: string;
  turkish_word?: string;
  learning_order?: number;
  isCustomWord?: boolean;
  isPlaylistWord?: boolean;
  word_en?: string;
}

export interface VocabularyResponse {
  success?: boolean;
  vocabulary?: VocabularyWord[];
  totalWords?: number;
  currentBatch?: number;
  hasMore?: boolean;
  error?: string;
}

// Client-side API functions with centralized caching
import { apiCache } from './api-cache'

export async function getLanguages(): Promise<Language[]> {
  return apiCache.getCachedData(
    'languages',
    async () => {
      const response = await fetch('/api/languages');
      if (!response.ok) {
        throw new Error('Failed to fetch languages');
      }
      return response.json();
    },
    10 * 60 * 1000 // Cache for 10 minutes
  )
}

export async function getTopics(): Promise<Topic[]> {
  return apiCache.getCachedData(
    'topics',
    async () => {
      const response = await fetch('/api/topics');
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      return response.json();
    },
    10 * 60 * 1000 // Cache for 10 minutes
  )
}

export async function getVocabularyForTopic(
  topicId: number,
  sourceLanguage: string,
  targetLanguage: string,
  limit: number = 50,
  offset: number = 0
): Promise<VocabularyResponse> {
  const cacheKey = `vocabulary-${topicId}-${sourceLanguage}-${targetLanguage}-${limit}-${offset}`
  
  return apiCache.getCachedData(
    cacheKey,
    async () => {
      const params = new URLSearchParams({
        topicId: topicId.toString(),
        sourceLanguage,
        targetLanguage,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await fetch(`/api/vocabulary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vocabulary');
      }
      return response.json();
    },
    5 * 60 * 1000 // Cache vocabulary for 5 minutes
  )
}
