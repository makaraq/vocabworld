"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePuterAI } from '@/hooks/use-puter-ai'
import { Loader2, Sparkles, Volume2, BookOpen, MessageSquare } from 'lucide-react'

interface VocabularyWord {
  id: number
  word: string
  translation: string
  language: string
}

interface EnhancedVocabularyCardProps {
  word: VocabularyWord
  className?: string
}

export function EnhancedVocabularyCard({ word, className }: EnhancedVocabularyCardProps) {
  const [aiExplanation, setAiExplanation] = useState<string>('')
  const [aiExamples, setAiExamples] = useState<string>('')
  const [showAiFeatures, setShowAiFeatures] = useState(false)
  const [pronunciationGuide, setPronunciationGuide] = useState<string>('')
  const [showPronunciation, setShowPronunciation] = useState(false)
  
  const { generateText, isLoading, error } = usePuterAI()

  const handleGetAiExplanation = async () => {
    try {
      const prompt = `Provide a detailed explanation for the ${word.language} word "${word.word}" which means "${word.translation}" in English. Include:
1. Pronunciation guide
2. Part of speech
3. Etymology if interesting
4. Cultural context
5. Common mistakes learners make
Keep it concise but informative.`
      
      const result = await generateText(prompt, 'gpt-4o')
      setAiExplanation(result)
    } catch (err) {
      console.error('Error getting AI explanation:', err)
    }
  }

  const handleGetAiExamples = async () => {
    try {
      const prompt = `Create 3 practical example sentences using the ${word.language} word "${word.word}":
1. A simple, beginner-friendly sentence
2. A conversational, everyday sentence  
3. A more complex or formal sentence

For each sentence, provide:
- The ${word.language} sentence
- English translation
- Brief note about the context/situation

Make the examples practical and memorable for language learners.`
      
      const result = await generateText(prompt, 'gpt-4o')
      setAiExamples(result)
    } catch (err) {
      console.error('Error getting AI examples:', err)
    }
  }

  const handlePronunciation = async () => {
    try {
      const prompt = `Provide a detailed pronunciation guide for the ${word.language} word "${word.word}":
1. IPA (International Phonetic Alphabet) notation
2. Simple phonetic spelling for English speakers
3. Syllable breakdown with stress marks
4. Common pronunciation mistakes to avoid
5. Audio description (like "sounds like...")

Be very specific and helpful for English speakers learning ${word.language}.`
      
      const result = await generateText(prompt, 'gpt-5-nano')
      setPronunciationGuide(result)
      setShowPronunciation(true)
    } catch (err) {
      console.error('Error getting pronunciation guide:', err)
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-blue-600">{word.word}</div>
            <div className="text-lg text-gray-600">{word.translation}</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePronunciation}
              disabled={isLoading}
              aria-label="Play pronunciation"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiFeatures(!showAiFeatures)}
              aria-label={showAiFeatures ? "Hide AI features" : "Show AI features"}
              aria-expanded={showAiFeatures}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {showAiFeatures && (
        <CardContent className="space-y-4">
          <Separator />
          
          {/* AI Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGetAiExplanation}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Get AI Explanation
            </Button>
            
            <Button
              onClick={handleGetAiExamples}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Get Examples
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* AI Explanation */}
          {aiExplanation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <BookOpen className="h-3 w-3 mr-1" />
                  AI Explanation
                </Badge>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{aiExplanation}</p>
              </div>
            </div>
          )}

          {/* AI Examples */}
          {aiExamples && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Example Sentences
                </Badge>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{aiExamples}</p>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 pt-2">
            Powered by Puter.js - Free AI without API keys
          </div>
        </CardContent>
      )}

      <Dialog open={showPronunciation} onOpenChange={setShowPronunciation}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pronunciation Guide: {word.word}</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{pronunciationGuide}</p>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
