'use client'

// "Offline Mode" section for the Manage Account modal.
// One compact row per language pair: the current pair first (download it for
// offline learning: words, pictures and audio in both languages), then any
// other downloaded packs. Each row shows a short status and its buttons.

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { getFlagIcon } from '@/utils/flags'
import { hapticsLight, hapticsMedium, hapticsWarning } from '@/lib/haptics'
import {
  offlineManager, packId, languageName, formatBytes,
  type OfflinePack,
} from '@/lib/offline/offline-manager'
import { useT } from '@/components/providers/translation-provider'
import { languageNamesTranslations } from '@/lib/i18n/language-names-translations'

// Rough size hint shown before a download starts (≈4100 words × 2 languages
// at ~21 KB per clip, measured)
const EST_PACK_LABEL = '≈200 MB'

// Progress of the step running now: the pictures, then the audio
function packPercent(pack: OfflinePack): number {
  if (pack.phase === 'images') {
    return pack.imagesTotal ? ((pack.imagesDone || 0) / pack.imagesTotal) * 100 : 0
  }
  return pack.audioTotal > 0 ? (pack.audioDone / pack.audioTotal) * 100 : 0
}

function PairFlags({ nativeCode, targetCode }: { nativeCode: string; targetCode: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <Icon icon={getFlagIcon(nativeCode)} className="w-6 h-6 rounded-full border border-white/20" />
      <Icon icon="solar:arrow-right-linear" width="13" className="text-white/40" />
      <Icon icon={getFlagIcon(targetCode)} className="w-6 h-6 rounded-full border border-white/20" />
    </div>
  )
}

const roundButton = 'w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 active:bg-white/20 transition-all disabled:opacity-40'
const pillButton = 'h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40'

export function OfflineDownloadsSection() {
  const { t, uiLang } = useT()
  const [packs, setPacks] = useState<OfflinePack[]>([])
  const [nativeCode, setNativeCode] = useState('')
  const [targetCode, setTargetCode] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNativeCode(localStorage.getItem('nativeLanguageCode') || '')
    setTargetCode(localStorage.getItem('targetLanguageCode') || '')
    setIsOnline(navigator.onLine)

    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    offlineManager.init()
    const unsubscribe = offlineManager.subscribe(setPacks)

    return () => {
      unsubscribe()
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])

  if (!offlineManager.isSupported() || !nativeCode || !targetCode || nativeCode === targetCode) {
    return null
  }

  const currentId = packId(nativeCode, targetCode)
  const currentPack = packs.find(p => p.id === currentId)
  const otherPacks = packs.filter(p => p.id !== currentId)

  // Language names localized to the UI language, falling back to English.
  const langName = (code: string) =>
    languageNamesTranslations[uiLang]?.[code] || languageName(code)

  // First tap arms the button, a second tap within 3.5s removes the pack
  const askDelete = (id: string) => {
    if (confirmDeleteId === id) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      setConfirmDeleteId(null)
      hapticsWarning()
      offlineManager.deletePack(id)
    } else {
      hapticsLight()
      setConfirmDeleteId(id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3500)
    }
  }

  const startDownload = (native: string, target: string, force = false) => {
    hapticsMedium()
    offlineManager.startDownload(native, target, { force }).catch(() => {})
  }

  // One line per language pair: flags, names, a short status, its buttons
  const renderRow = (native: string, target: string, pack?: OfflinePack) => {
    const id = packId(native, target)
    const status = pack?.status
    const idle = !pack || (status === 'error' && pack.audioTotal === 0)
    const percent = pack ? packPercent(pack) : 0
    const showBar = !idle && (status === 'downloading' || status === 'paused' || status === 'error')

    let subtitle: string
    let subtitleClass = 'text-white/45'
    if (idle) {
      subtitle = isOnline ? EST_PACK_LABEL : t('offline.connectToDownload')
    } else if (status === 'downloading') {
      subtitle = t('offline.other.downloadingPct', { pct: Math.round(percent) })
    } else if (status === 'complete') {
      subtitle = `${t('offline.status.downloaded')} · ${formatBytes(pack?.bytes || 0)}`
      subtitleClass = 'text-emerald-300/80'
    } else if (status === 'paused') {
      subtitle = t('offline.other.paused', { size: formatBytes(pack?.bytes || 0) })
    } else if (status === 'storage-warning') {
      subtitle = t('offline.other.waitingStorage')
      subtitleClass = 'text-yellow-300/80'
    } else {
      subtitle = t('offline.interrupted')
      subtitleClass = 'text-red-400/90'
    }

    const removeButton = confirmDeleteId === id ? (
      <button
        onClick={() => askDelete(id)}
        className={`${pillButton} bg-red-500/80 border-red-400 text-white`}
      >
        {t('offline.confirm')}
      </button>
    ) : (
      <button
        onClick={() => askDelete(id)}
        className={roundButton}
        aria-label={status === 'complete'
          ? t('offline.aria.deletePack', { from: langName(native), to: langName(target) })
          : t('offline.aria.cancel')}
      >
        <Icon icon={status === 'complete' ? 'solar:trash-bin-trash-bold' : 'solar:close-circle-bold'} width="14" />
      </button>
    )

    let actions: React.ReactNode
    if (idle) {
      actions = (
        <button
          onClick={() => startDownload(native, target)}
          disabled={!isOnline}
          className={`${pillButton} bg-blue-500/20 border-blue-400/30 text-blue-300 active:bg-blue-500/30`}
        >
          <Icon icon="solar:download-minimalistic-bold" width="14" />
          {t('offline.download')}
        </button>
      )
    } else if (status === 'downloading') {
      actions = (
        <>
          <button
            onClick={() => { hapticsLight(); offlineManager.pauseDownload(id) }}
            className={roundButton}
            aria-label={t('offline.aria.pause')}
          >
            <Icon icon="solar:pause-bold" width="13" />
          </button>
          {removeButton}
        </>
      )
    } else if (status === 'storage-warning') {
      actions = (
        <>
          <button
            onClick={() => startDownload(native, target, true)}
            className={`${pillButton} bg-yellow-500/20 border-yellow-400/30 text-yellow-300 active:bg-yellow-500/30`}
          >
            {t('offline.downloadAnyway')}
          </button>
          {removeButton}
        </>
      )
    } else if (status === 'complete') {
      actions = removeButton
    } else {
      actions = (
        <>
          <button
            onClick={() => startDownload(native, target)}
            disabled={!isOnline}
            className={`${roundButton} text-blue-300`}
            aria-label={t('offline.resume')}
          >
            <Icon icon="solar:play-bold" width="13" />
          </button>
          {removeButton}
        </>
      )
    }

    return (
      <div key={id} className="py-2.5">
        <div className="flex items-center gap-2.5">
          <PairFlags nativeCode={native} targetCode={target} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {langName(native)} → {langName(target)}
            </p>
            <p className={`${subtitleClass} text-[11px] tabular-nums truncate`}>{subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
        </div>
        {showBar && (
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${status === 'downloading' ? 'bg-gradient-to-r from-blue-400 to-violet-400' : 'bg-white/30'}`}
              style={{ width: `${Math.max(2, percent)}%`, transition: 'width 0.3s ease' }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 px-4 pt-3 pb-1">
      <div className="flex items-center gap-2.5">
        <Icon
          icon={currentPack?.status === 'complete' ? 'solar:cloud-check-bold' : 'solar:cloud-download-bold'}
          width="18"
          className={currentPack?.status === 'complete' ? 'text-emerald-400' : 'text-white/50'}
        />
        <span className="text-white font-medium text-sm">{t('offline.title')}</span>
      </div>
      <div className="divide-y divide-white/10">
        {renderRow(nativeCode, targetCode, currentPack)}
        {otherPacks.map(pack => renderRow(pack.nativeCode, pack.targetCode, pack))}
      </div>
    </div>
  )
}
