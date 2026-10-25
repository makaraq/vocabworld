'use client'

// "Home-screen widget" section for the Manage Account modal: pick which words
// the flashcard widget shows (one topic, or random words) and how to add it.
// Native apps only, and only where the OS has the widget (iOS 17+).

import React, { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Icon } from '@iconify/react'
import { hapticsLight, hapticsMedium } from '@/lib/haptics'
import { useT } from '@/components/providers/translation-provider'
import {
  getWidgetSource, getWidgetStatus, isWidgetPlatform, requestPinWidget, syncHomeWidget,
  type WidgetSource, type WidgetStatus,
} from '@/lib/widget/home-widget'

interface TopicOption {
  id: number
  name: string
}

type SyncState = 'idle' | 'saving' | 'saved' | 'failed'

export function HomeWidgetSection() {
  const { t } = useT()
  const [status, setStatus] = useState<WidgetStatus | null>(null)
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [source, setSource] = useState<WidgetSource>('random')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [showHowTo, setShowHowTo] = useState(false)

  useEffect(() => {
    if (!isWidgetPlatform()) return
    let cancelled = false
    setSource(getWidgetSource() ?? 'random')
    getWidgetStatus().then(s => { if (!cancelled) setStatus(s) })

    const nativeCode = localStorage.getItem('nativeLanguageCode') || 'en'
    Promise.all([
      fetch('/api/topics').then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`/api/topic-translations?languageCode=${nativeCode}`)
        .then(r => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([list, translated]: [any, any]) => {
      if (cancelled || !Array.isArray(list)) return
      const names: Record<number, string> = translated?.translations || {}
      setTopics(
        list
          .filter((tp: any) => typeof tp?.id === 'number' && tp.id > 0)
          .map((tp: any) => ({ id: tp.id, name: names[tp.id] || tp.name }))
      )
    })

    // Back from the home screen after adding the widget: show it as added
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      getWidgetStatus().then(s => { if (!cancelled) setStatus(s) })
      // Fills a widget added before a choice was made
      syncHomeWidget().then(() => { if (!cancelled) setSource(getWidgetSource() ?? 'random') }).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!status?.supported) return null

  const choose = async (next: WidgetSource) => {
    hapticsLight()
    setSource(next)
    setSyncState('saving')
    try {
      const ok = await syncHomeWidget({ source: next, force: true })
      setSyncState(ok ? 'saved' : 'failed')
    } catch {
      setSyncState('failed')
    }
  }

  const addToHome = async () => {
    hapticsMedium()
    // Words first, so the widget isn't empty when it lands
    if (!getWidgetSource()) await choose(source)
    const requested = await requestPinWidget()
    if (!requested) setShowHowTo(true)
  }

  const added = status.installed > 0
  const steps = Capacitor.getPlatform() === 'ios'
    ? [t('widget.howTo.ios.1'), t('widget.howTo.ios.2'), t('widget.howTo.ios.3')]
    : [t('widget.howTo.android.1'), t('widget.howTo.android.2'), t('widget.howTo.android.3')]

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon icon="solar:widget-5-bold" width="18" className={added ? 'text-orange-400' : 'text-white/50'} />
          <div className="min-w-0">
            <span className="text-white font-medium text-sm block">{t('widget.title')}</span>
            <span className="text-white/45 text-xs">{t('widget.desc')}</span>
          </div>
        </div>
        {added && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-orange-500/20 text-orange-300 border border-orange-400/30">
            {t('widget.added')}
          </span>
        )}
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-white/70 text-xs flex-shrink-0">{t('widget.source')}</span>
        <div className="relative min-w-0 flex-1">
          <select
            value={String(source)}
            onChange={e => choose(e.target.value === 'random' ? 'random' : Number(e.target.value))}
            className="w-full appearance-none rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium py-2 pl-4 pr-9 truncate"
          >
            <option value="random" className="text-black">{t('widget.source.random')}</option>
            {topics.map(tp => (
              <option key={tp.id} value={tp.id} className="text-black">{tp.name}</option>
            ))}
          </select>
          <Icon icon="solar:alt-arrow-down-linear" width="16" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
        </div>
      </label>

      {syncState !== 'idle' && (
        <p className={`text-xs ${syncState === 'failed' ? 'text-red-300' : 'text-white/50'}`}>
          {syncState === 'saving' ? t('widget.updating') : syncState === 'saved' ? t('widget.updated') : t('widget.failed')}
        </p>
      )}

      {!added && status.canPin && (
        <button
          onClick={addToHome}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
        >
          <Icon icon="solar:add-square-bold" width="16" />
          {t('widget.addToHome')}
        </button>
      )}

      <button
        onClick={() => { hapticsLight(); setShowHowTo(v => !v) }}
        aria-expanded={showHowTo}
        className="w-full flex items-center justify-between text-white/70 text-xs font-medium"
      >
        <span>{t('widget.howTo.title')}</span>
        <Icon icon={showHowTo ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width="14" />
      </button>
      {showHowTo && (
        <ol className="space-y-1.5 text-white/60 text-xs list-decimal pl-4">
          {steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}
    </div>
  )
}
