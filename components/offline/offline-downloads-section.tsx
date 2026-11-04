'use client'

// "Offline Mode" section for the Manage Account modal.
// One compact row per language pair: the current pair first (download it for
// offline learning: words, pictures and audio in both languages), then any
// other downloaded packs. Each row shows a short status and its buttons.
// useOfflinePacks holds the rules; the iPhone's native account sheet
// (components/account/native-account-sheet.tsx) draws the same rows.

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { getFlagIcon } from '@/utils/flags'
import { haptic } from '@/lib/haptics'
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

/** What a row's button does: download, pause, resume, download anyway, and
 *  remove (a downloaded pack) or cancel (one still coming), which turn into
 *  confirm for a second tap. */
export type OfflineActionId = 'download' | 'pause' | 'resume' | 'anyway' | 'remove' | 'cancel' | 'confirm'

export interface OfflineRow {
  id: string
  nativeCode: string
  targetCode: string
  title: string
  subtitle: string
  tone: 'muted' | 'good' | 'warn' | 'bad'
  /** Through the step running now, 0–100; null hides the bar. */
  percent: number | null
  /** Downloading now: a coloured bar rather than a grey one. */
  active: boolean
  actions: { id: OfflineActionId; label?: string; disabled?: boolean; aria?: string }[]
}

export function useOfflinePacks() {
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

  const visible = offlineManager.isSupported() && !!nativeCode && !!targetCode && nativeCode !== targetCode
  const currentId = packId(nativeCode, targetCode)
  const currentPack = packs.find(p => p.id === currentId)

  // Language names localized to the UI language, falling back to English.
  const langName = (code: string) =>
    languageNamesTranslations[uiLang]?.[code] || languageName(code)

  // One line per language pair: a short status and its buttons
  const rowFor = (native: string, target: string, pack?: OfflinePack): OfflineRow => {
    const id = packId(native, target)
    const status = pack?.status
    const idle = !pack || (status === 'error' && pack.audioTotal === 0)
    const percent = pack ? packPercent(pack) : 0
    const showBar = !idle && (status === 'downloading' || status === 'paused' || status === 'error')

    let subtitle: string
    let tone: OfflineRow['tone'] = 'muted'
    if (idle) {
      subtitle = isOnline ? EST_PACK_LABEL : t('offline.connectToDownload')
    } else if (status === 'downloading') {
      subtitle = t('offline.other.downloadingPct', { pct: Math.round(percent) })
    } else if (status === 'complete') {
      subtitle = `${t('offline.status.downloaded')} · ${formatBytes(pack?.bytes || 0)}`
      tone = 'good'
    } else if (status === 'paused') {
      subtitle = t('offline.other.paused', { size: formatBytes(pack?.bytes || 0) })
    } else if (status === 'storage-warning') {
      subtitle = t('offline.other.waitingStorage')
      tone = 'warn'
    } else {
      subtitle = t('offline.interrupted')
      tone = 'bad'
    }

    const remove: OfflineRow['actions'][number] = confirmDeleteId === id
      ? { id: 'confirm', label: t('offline.confirm') }
      : status === 'complete'
        ? { id: 'remove', aria: t('offline.aria.deletePack', { from: langName(native), to: langName(target) }) }
        : { id: 'cancel', aria: t('offline.aria.cancel') }

    let actions: OfflineRow['actions']
    if (idle) {
      actions = [{ id: 'download', label: t('offline.download'), disabled: !isOnline }]
    } else if (status === 'downloading') {
      actions = [{ id: 'pause', aria: t('offline.aria.pause') }, remove]
    } else if (status === 'storage-warning') {
      actions = [{ id: 'anyway', label: t('offline.downloadAnyway') }, remove]
    } else if (status === 'complete') {
      actions = [remove]
    } else {
      actions = [{ id: 'resume', aria: t('offline.resume'), disabled: !isOnline }, remove]
    }

    return {
      id,
      nativeCode: native,
      targetCode: target,
      title: `${langName(native)} → ${langName(target)}`,
      subtitle,
      tone,
      percent: showBar ? Math.max(2, percent) : null,
      active: status === 'downloading',
      actions,
    }
  }

  const rows: OfflineRow[] = visible
    ? [
        rowFor(nativeCode, targetCode, currentPack),
        ...packs.filter(p => p.id !== currentId).map(p => rowFor(p.nativeCode, p.targetCode, p)),
      ]
    : []

  // First tap on remove/cancel arms it, a second tap within 3.5s removes the pack
  const askDelete = (id: string) => {
    if (confirmDeleteId === id) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      setConfirmDeleteId(null)
      haptic.destructive()
      offlineManager.deletePack(id)
    } else {
      haptic.tap()
      setConfirmDeleteId(id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3500)
    }
  }

  const act = (action: OfflineActionId, rowId: string) => {
    const row = rows.find(r => r.id === rowId)
    if (!row) return
    switch (action) {
      case 'download':
      case 'resume':
      case 'anyway':
        haptic.action()
        offlineManager.startDownload(row.nativeCode, row.targetCode, { force: action === 'anyway' }).catch(() => {})
        break
      case 'pause':
        haptic.tap()
        offlineManager.pauseDownload(row.id)
        break
      case 'remove':
      case 'cancel':
      case 'confirm':
        askDelete(row.id)
        break
    }
  }

  return { visible, rows, done: currentPack?.status === 'complete', act }
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

const TONE_CLASS: Record<OfflineRow['tone'], string> = {
  muted: 'text-white/45',
  good: 'text-emerald-300/80',
  warn: 'text-yellow-300/80',
  bad: 'text-red-400/90',
}

export function OfflineDownloadsSection() {
  const { t } = useT()
  const { visible, rows, done, act } = useOfflinePacks()

  if (!visible) return null

  const renderAction = (row: OfflineRow, action: OfflineRow['actions'][number]) => {
    const onClick = () => act(action.id, row.id)
    switch (action.id) {
      case 'download':
        return (
          <button key={action.id} onClick={onClick} disabled={action.disabled}
            className={`${pillButton} bg-blue-500/20 border-blue-400/30 text-blue-300 active:bg-blue-500/30`}>
            <Icon icon="solar:download-minimalistic-bold" width="14" />
            {action.label}
          </button>
        )
      case 'anyway':
        return (
          <button key={action.id} onClick={onClick}
            className={`${pillButton} bg-yellow-500/20 border-yellow-400/30 text-yellow-300 active:bg-yellow-500/30`}>
            {action.label}
          </button>
        )
      case 'confirm':
        return (
          <button key={action.id} onClick={onClick} className={`${pillButton} bg-red-500/80 border-red-400 text-white`}>
            {action.label}
          </button>
        )
      case 'pause':
        return (
          <button key={action.id} onClick={onClick} className={roundButton} aria-label={action.aria}>
            <Icon icon="solar:pause-bold" width="13" />
          </button>
        )
      case 'resume':
        return (
          <button key={action.id} onClick={onClick} disabled={action.disabled} className={`${roundButton} text-blue-300`} aria-label={action.aria}>
            <Icon icon="solar:play-bold" width="13" />
          </button>
        )
      default:
        return (
          <button key={action.id} onClick={onClick} className={roundButton} aria-label={action.aria}>
            <Icon icon={action.id === 'remove' ? 'solar:trash-bin-trash-bold' : 'solar:close-circle-bold'} width="14" />
          </button>
        )
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 px-4 pt-3 pb-1">
      <div className="flex items-center gap-2.5">
        <Icon
          icon={done ? 'solar:cloud-check-bold' : 'solar:cloud-download-bold'}
          width="18"
          className={done ? 'text-emerald-400' : 'text-white/50'}
        />
        <span className="text-white font-medium text-sm">{t('offline.title')}</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map(row => (
          <div key={row.id} className="py-2.5">
            <div className="flex items-center gap-2.5">
              <PairFlags nativeCode={row.nativeCode} targetCode={row.targetCode} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{row.title}</p>
                <p className={`${TONE_CLASS[row.tone]} text-[11px] tabular-nums truncate`}>{row.subtitle}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {row.actions.map(action => renderAction(row, action))}
              </div>
            </div>
            {row.percent !== null && (
              <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.active ? 'bg-gradient-to-r from-blue-400 to-violet-400' : 'bg-white/30'}`}
                  style={{ width: `${row.percent}%`, transition: 'width 0.3s ease' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
