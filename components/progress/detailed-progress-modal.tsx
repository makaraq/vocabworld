"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, BookOpen, CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Icon } from "@iconify/react"
import { getFlagIcon } from "@/utils/flags"

interface TopicProgress {
  topicId: number
  topicName: string
  totalWords: number
  learnedWords: number
  completionPercentage: number
  isCompleted: boolean
}

interface DetailedProgressModalProps {
  isOpen: boolean
  onCloseAction: () => void
  targetLanguageCode: string
  targetLanguageName: string
  nativeLanguageCode?: string
}

// Map language codes to flag icons (same as progress-stats)

export function DetailedProgressModal({ 
  isOpen, 
  onCloseAction, 
  targetLanguageCode, 
  targetLanguageName,
  nativeLanguageCode
}: DetailedProgressModalProps) {
  const { user } = useAuth()
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [topicsData, setTopicsData] = useState<any[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()) // All sections closed by default
  const [sections, setSections] = useState<Array<{name: string, topicIds: number[], icon: string}>>([])
  const [topicTranslations, setTopicTranslations] = useState<Record<number, string>>({})
  const [uiTranslations, setUiTranslations] = useState<Record<string, string>>({})

  // Map hardcoded English section names to their UI translation keys
  const SECTION_KEYS: Record<string, string> = {
    'FIRST AID KIT': 'FIRST_AID_KIT',
    'DAILY LIFE': 'DAILY_LIFE',
    'PERSONAL & SOCIAL LIFE': 'PERSONAL_AND_SOCIAL_LIFE',
    'WORK & SCHOOL': 'WORK_AND_SCHOOL',
    'CULTURE & SOCIETY': 'CULTURE_AND_SOCIETY',
    'PROFESSIONAL': 'PROFESSIONAL',
  }

  // Load sections structure from topics API - dynamically generated
  useEffect(() => {
    const loadSectionsFromTopics = async () => {
      try {
        const response = await fetch('/api/topics')
        if (response.ok) {
          const allTopics = await response.json()
          setTopicsData(allTopics)
          
          // Define sections based on the actual topics loaded from API
          // This matches the language-selector.tsx structure exactly
          const dynamicSections = [
            { 
              name: "FIRST AID KIT", 
              topicIds: allTopics.slice(0, 6).map((t: any) => t.id), // First 6 topics
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGDmnSdctG"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M9 7h11c0.55 0 1 0.45 1 1v11c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11c0 -0.55 0.45 -1 1 -1Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.9s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke-dasharray="16" stroke-dashoffset="16" d="M9 7v-3c0 -0.55 0.45 -1 1 -1h4c0.55 0 1 0.45 1 1v3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="16;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M12 11v6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="8;0"/></path><path stroke="#000" stroke-dasharray="8" stroke-dashoffset="8" d="M9 14h6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="8;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGDmnSdctG)"/></svg>'
            },
            { 
              name: "DAILY LIFE", 
              topicIds: allTopics.slice(6, 14).map((t: any) => t.id), // Topics 7-14 (8 topics)
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" d="M17 14v4c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-4Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"/></path><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="48" stroke-dashoffset="48" d="M17 9v9c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-9 Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="48;0"/></path><path stroke-dasharray="14" stroke-dashoffset="14" d="M17 9h3c0.55 0 1 0.45 1 1v3c0 0.55 -0.45 1 -1 1h-3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="14;0"/></path></g></svg>'
            },
            { 
              name: "PERSONAL & SOCIAL LIFE", 
              topicIds: allTopics.slice(14, 20).map((t: any) => t.id), // Topics 15-20 (6 topics)
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="SVGydZajcRT"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="#fff" fill-opacity="0" stroke-dasharray="64" stroke-dashoffset="64" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M9 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.2s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="2" stroke-dashoffset="2" d="M15 9v1"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.2s" values="2;0"/></path><path stroke="#000" stroke-dasharray="12" stroke-dashoffset="12" d="M8 14c0.5 1.5 1.79 3 4 3c2.21 0 3.5 -1.5 4 -3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.6s" dur="0.2s" values="12;0"/></path></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#SVGydZajcRT)"/></svg>'
            },
            { 
              name: "WORK & SCHOOL", 
              topicIds: allTopics.slice(20, 28).map((t: any) => t.id), // Topics 21-28 (8 topics)
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="20" stroke-dashoffset="20" d="M3 21h18"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"/></path><path fill="currentColor" fill-opacity="0" stroke-dasharray="48" stroke-dashoffset="48" d="M7 17v-4l10 -10l4 4l-10 10h-4"><animate fill="freeze" attributeName="fill-opacity" begin="1.1s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.6s" values="48;0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M14 6l4 4"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="8;0"/></path></g></svg>'
            },
            { 
              name: "CULTURE & SOCIETY", 
              topicIds: allTopics.slice(28, 36).map((t: any) => t.id), // Topics 29-36 (8 topics)
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-dasharray="80" stroke-dashoffset="80" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.47 5.94c1.83 1.37 3.81 4.14 4.53 5.63c0.72 -1.49 2.7 -4.26 4.53 -5.63c1.33 -0.99 3.47 -1.75 3.47 0.68c0 0.49 -0.28 4.08 -0.45 4.66c-0.57 2.03 -2.65 2.55 -4.5 2.23c3.24 0.55 4.06 2.36 2.28 4.17c-3.38 3.44 -4.85 -0.87 -5.23 -1.97c-0.07 -0.2 -0.1 -0.3 -0.1 -0.22c-0 -0.08 -0.03 0.02 -0.1 0.22c-0.38 1.1 -1.86 5.41 -5.23 1.97c-1.78 -1.81 -0.96 -3.63 2.28 -4.17c-1.85 0.31 -3.93 -0.21 -4.5 -2.23c-0.17 -0.58 -0.45 -4.18 -0.45 -4.66c0 -2.43 2.14 -1.67 3.47 -0.68Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="80;0"/></path></svg>'
            },
            { 
              name: "PROFESSIONAL", 
              topicIds: allTopics.slice(36, 44).map((t: any) => t.id), // Topics 37-44 (8 topics: Common Collocations, Modern Expressions, Formal Language, Verbs, Daily Language, Essential Words, Bad Words, Example Sentences)
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="64" stroke-dashoffset="64" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l-9 3.5v6.5c0 3.5 3.5 9 8 10c4.5 -1 8 -6.5 8 -10v-6.5l-8 -3.5 Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.15s" values="0;0.3"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path></svg>'
            }
          ]
          
          setSections(dynamicSections)
        }
      } catch (error) {
        console.error('Failed to load sections structure:', error)
      }
    }
    
    loadSectionsFromTopics()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!nativeLanguageCode || nativeLanguageCode === 'en') {
      setTopicTranslations({})
      return
    }
    fetch(`/api/topic-translations?languageCode=${nativeLanguageCode}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setTopicTranslations(data?.translations || {}))
      .catch(() => setTopicTranslations({}))

    fetch(`/api/ui-translations?languageCode=${nativeLanguageCode}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setUiTranslations(data?.translations || {}))
      .catch(() => setUiTranslations({}))
  }, [nativeLanguageCode])

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  const getSectionProgress = (topicIds: number[]) => {
    const sectionTopics = topicProgress.filter(topic => topicIds.includes(topic.topicId))
    if (sectionTopics.length === 0) return { completed: 0, total: 0, percentage: 0, learnedWords: 0, totalWords: 0 }
    
    const totalWords = sectionTopics.reduce((sum, topic) => sum + topic.totalWords, 0)
    const learnedWords = sectionTopics.reduce((sum, topic) => sum + topic.learnedWords, 0)
    const completedTopics = sectionTopics.filter(topic => topic.isCompleted).length
    
    return {
      completed: completedTopics,
      total: sectionTopics.length,
      percentage: totalWords > 0 ? (learnedWords / totalWords) * 100 : 0,
      learnedWords,
      totalWords
    }
  }

  // Custom SVG icons for topics that don't have them in the JSON
  const customSVGIcons: { [key: number]: string } = {
    11: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.74 5.47c2.36 1.03 3.61 3.56 3.18 5.99A6 6 0 0 1 18 16v.17a3 3 0 0 1 1-.17a3 3 0 0 1 3 3a3 3 0 0 1-3 3H6a4 4 0 0 1-4-4a4 4 0 0 1 4-4h.27C5 12.45 4.6 10.24 5.5 8.26a5.49 5.49 0 0 1 7.24-2.79m-.81 1.83c-1.77-.8-3.84.01-4.62 1.77c-.46 1.02-.38 2.15.1 3.06A5.99 5.99 0 0 1 12 10c.7 0 1.38.12 2 .34a3.51 3.51 0 0 0-2.07-3.04"/></svg>',
    18: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 6h2V4h-2zm1 6q-1.9 0-3.625-.788T5 9.45V8q0-.825.588-1.412T7 6h2V3q0-.425.288-.712T10 2h4q.425 0 .713.288T15 3v3h2q.825 0 1.413.588T19 8v1.45q-1.65.975-3.375 1.763T12 12m-5 9q-.825 0-1.412-.587T5 19v-7.3q1.4.85 2.888 1.45t3.112.8V14q0 .425.288.713T12 15t.713-.288T13 14v-.05q1.625-.2 3.113-.8T19 11.7V19q0 .825-.587 1.413T17 21q0 .425-.288.713T16 22q-.4 0-.562-.363T15 21H9q0 .425-.288.713T8 22q-.4 0-.562-.363T7 21"/></svg>'
  }

  // Get the correct icon for a topic (always returns SVG content)
  const getTopicIcon = (topic: TopicProgress) => {
    // First check if topic has an SVG icon from the topics.json data
    const topicData = topicsData.find(t => t.id === topic.topicId)
    if (topicData?.icon) {
      return { content: topicData.icon }
    }
    
    // Check custom SVG icons (same as topic slider)
    if (customSVGIcons[topic.topicId]) {
      return { content: customSVGIcons[topic.topicId] }
    }
    
    // Final fallback - default chat icon as SVG
    return { 
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'
    }
  }

  useEffect(() => {
    if (!isOpen || !user?.id || !targetLanguageCode) {
      setLoading(false)
      return
    }

    const fetchTopicProgress = async () => {
      try {
        setLoading(true)
        const url = `/api/progress/topics?userId=${user.id}&languageCode=${targetLanguageCode}&detailed=true`
        
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.topics && data.topics.length > 0) {
          }
          
          setTopicProgress(data.topics || [])
        } else {
          const errorData = await response.text()
          console.error('❌ Failed to fetch topic progress:', response.status, errorData)
          setTopicProgress([])
        }
      } catch (error) {
        console.error('❌ Error fetching topic progress:', error)
        setTopicProgress([])
      } finally {
        setLoading(false)
      }
    }

    fetchTopicProgress()
  }, [isOpen, user?.id, targetLanguageCode])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 mx-4 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon icon={getFlagIcon(targetLanguageCode)} className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  {targetLanguageName} Progress
                </h2>
                <p className="text-sm text-white/80 drop-shadow">
                  Topic completion details
                </p>
              </div>
            </div>
            <button
              onClick={onCloseAction}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {topicProgress.length === 0 ? (
                <div className="text-center py-8 text-white/70">
                  No progress data available yet. Start learning to see your progress!
                </div>
              ) : (
                <>
                  {sections.map((section) => {
                    const sectionProgress = getSectionProgress(section.topicIds)
                    const isExpanded = expandedSections.has(section.name)
                    const sectionTopics = topicProgress.filter(topic => section.topicIds.includes(topic.topicId))

                return (
                  <div key={section.name} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.name)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Section Icon */}
                      <div className="w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center flex-shrink-0">
                        <div dangerouslySetInnerHTML={{ __html: section.icon }} className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.8)' }} />
                      </div>

                      {/* Section Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white drop-shadow text-sm">{uiTranslations[SECTION_KEYS[section.name]] || section.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/70 drop-shadow">
                              {sectionProgress.completed}/{sectionProgress.total} topics • {Math.round(sectionProgress.percentage)}%
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-white/60" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-white/60" />
                            )}
                          </div>
                        </div>

                        {/* Section Progress Bar */}
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                            style={{ width: `${Math.min(sectionProgress.percentage, 100)}%` }}
                          />
                        </div>

                        {/* Section Stats */}
                        <div className="mt-1 text-xs text-white/60">
                          {sectionProgress.learnedWords} / {sectionProgress.totalWords} words
                        </div>
                      </div>
                    </button>

                    {/* Section Topics (Collapsible) */}
                    {isExpanded && (
                      <div className="border-t border-white/10">
                        <div className="p-2 space-y-2">
                          {sectionTopics.map((topic) => (
                            <div
                              key={topic.topicId}
                              className="bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-all duration-200"
                            >
                              <div className="flex items-center gap-3">
                                {/* Topic Icon */}
                                <div className={`w-8 h-8 ${topic.isCompleted ? 'bg-green-500/20 border-green-400/40' : 'bg-white/15 border-white/25'} border rounded-lg flex items-center justify-center flex-shrink-0`}>
                                  {(() => {
                                    const iconInfo = getTopicIcon(topic)
                                    return (
                                      <div 
                                        className="w-5 h-5 flex items-center justify-center" 
                                        style={{ color: 'rgba(255,255,255,0.8)' }}
                                        dangerouslySetInnerHTML={{ __html: iconInfo.content }}
                                      />
                                    )
                                  })()}
                                </div>

                                {/* Topic Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-white drop-shadow truncate">
                                      {topicTranslations[topic.topicId] || topic.topicName}
                                    </h4>
                                    <div className="flex items-center gap-1">
                                      {topic.isCompleted ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-white/40" />
                                      )}
                                      <span className="text-xs text-white/70">
                                        {Math.round(topic.completionPercentage)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Topic Progress Bar */}
                                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-1">
                                    <div 
                                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                                      style={{ width: `${Math.min(topic.completionPercentage, 100)}%` }}
                                    />
                                  </div>

                                  {/* Topic Stats */}
                                  <div className="text-xs text-white/60">
                                    {topic.learnedWords} / {topic.totalWords} words
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </>
            )}

            {topicProgress.length === 0 && !loading && (
              <div className="text-center py-12 text-white/70">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50 drop-shadow" />
                <p className="drop-shadow">No progress data available yet.</p>
                <p className="text-sm text-white/50 drop-shadow">Start learning to see your progress!</p>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}