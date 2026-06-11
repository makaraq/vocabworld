'use client'

// "Offline Mode" section for the Manage Account modal.
// Lets the user download their chosen language pair (all words + audio in
// both languages) for offline learning, with live progress, storage warnings,
// pause/resume/cancel, and management of previously downloaded packs.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { getFlagIcon } from '@/utils/flags'
import { hapticsLight, hapticsMedium, hapticsWarning } from '@/lib/haptics'
import {
  offlineManager, packId, languageName, formatBytes,
  type OfflinePack, type StorageInfo,
} from '@/lib/offline/offline-manager'

// Rough size hint shown before a download starts (≈4100 words × 2 languages
// at ~21 KB per clip, measured)
const EST_PACK_LABEL = '≈200 MB'

function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  if (seconds < 90) return ' · under a minute left'
  return ` · ~${Math.round(seconds / 60)} min left`
}

function ProgressRing({ percent, indeterminate }: { percent: number; indeterminate?: boolean }) {
  const size = 58
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={indeterminate ? 'animate-spin' : '-rotate-90'} style={indeterminate ? { animationDuration: '1.2s' } : undefined}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <defs>
          <linearGradient id="vw-dl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#vw-dl-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={indeterminate ? c * 0.75 : c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
          style={indeterminate ? undefined : { transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {!indeterminate && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold tabular-nums">{Math.round(percent)}%</span>
        </div>
      )}
      {indeterminate && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon icon="solar:documents-bold" width="18" className="text-blue-300" />
        </div>
      )}
    </div>
  )
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

export function OfflineDownloadsSection() {
  const [packs, setPacks] = useState<OfflinePack[]>([])
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [nativeCode, setNativeCode] = useState('')
  const [targetCode, setTargetCode] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusSignature = useRef('')

  const refreshStorage = useCallback(() => {
    offlineManager.getStorageInfo().then(setStorage).catch(() => {})
  }, [])

  useEffect(() => {
    setNativeCode(localStorage.getItem('nativeLanguageCode') || '')
    setTargetCode(localStorage.getItem('targetLanguageCode') || '')
    setIsOnline(navigator.onLine)
    refreshStorage()

    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    offlineManager.init()
    const unsubscribe = offlineManager.subscribe((next) => {
      setPacks(next)
      // Re-read the storage estimate when a pack changes state (not on every
      // progress tick — that would spam the Storage API)
      const sig = next.map(p => `${p.id}:${p.status}`).join('|')
      if (sig !== statusSignature.current) {
        statusSignature.current = sig
        refreshStorage()
      }
    })

    return () => {
      unsubscribe()
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [refreshStorage])

  if (!offlineManager.isSupported() || !nativeCode || !targetCode || nativeCode === targetCode) {
    return null
  }

  const currentId = packId(nativeCode, targetCode)
  const currentPack = packs.find(p => p.id === currentId)
  const otherPacks = packs.filter(p => p.id !== currentId)

  const askDelete = (id: string, action: () => void) => {
    if (confirmDeleteId === id) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      setConfirmDeleteId(null)
      hapticsWarning()
      action()
    } else {
      hapticsLight()
      setConfirmDeleteId(id)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3500)
    }
  }

  const startDownload = (force = false) => {
    hapticsMedium()
    offlineManager.startDownload(nativeCode, targetCode, { force }).catch(() => {})
  }

  const percent = currentPack && currentPack.audioTotal > 0
    ? (currentPack.audioDone / currentPack.audioTotal) * 100
    : 0

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 overflow-hidden">
      <style>{`
        @keyframes vw-dl-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes vw-dl-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      <div className="px-4 py-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon
              icon={currentPack?.status === 'complete' ? 'solar:cloud-check-bold' : 'solar:cloud-download-bold'}
              width="18"
              className={currentPack?.status === 'complete' ? 'text-emerald-400' : currentPack?.status === 'downloading' ? 'text-blue-400' : 'text-white/50'}
            />
            <span className="text-white font-medium text-sm">Offline Mode</span>
          </div>
          {currentPack?.status === 'complete' && (
            <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-2 py-0.5 rounded-full">
              Downloaded
            </span>
          )}
          {currentPack?.status === 'downloading' && (
            <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/25 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Downloading
            </span>
          )}
          {currentPack?.status === 'paused' && (
            <span className="text-[11px] font-semibold bg-white/10 text-white/60 border border-white/15 px-2 py-0.5 rounded-full">
              Paused
            </span>
          )}
        </div>

        {/* Current pair */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2.5">
            <PairFlags nativeCode={nativeCode} targetCode={targetCode} />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {languageName(nativeCode)} → {languageName(targetCode)}
              </p>
              <p className="text-white/45 text-[11px]">Your current languages</p>
            </div>
          </div>

          {/* ── Idle: not downloaded yet ── */}
          {(!currentPack || (currentPack.status === 'error' && currentPack.audioTotal === 0)) && (
            <>
              <p className="text-white/50 text-xs leading-relaxed">
                Download every word and its audio in both languages to keep learning without internet. {EST_PACK_LABEL} of storage needed.
              </p>
              {currentPack?.error && (
                <p className="text-red-400 text-xs">{currentPack.error}</p>
              )}
              <button
                onClick={() => startDownload()}
                disabled={!isOnline}
                className="w-full bg-blue-500/20 border border-blue-400/30 text-blue-300 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-500/30 active:bg-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Icon icon="solar:download-minimalistic-bold" width="16" />
                {isOnline ? 'Download for Offline Use' : 'Connect to internet to download'}
              </button>
            </>
          )}

          {/* ── Downloading ── */}
          {currentPack?.status === 'downloading' && (
            <div className="flex items-center gap-3.5">
              <ProgressRing percent={percent} indeterminate={currentPack.phase === 'words'} />
              <div className="flex-1 min-w-0 space-y-1.5">
                {currentPack.phase === 'words' ? (
                  <>
                    <p className="text-white text-xs font-medium">
                      Preparing word lists…
                    </p>
                    <p className="text-white/50 text-[11px] tabular-nums">
                      Topic {currentPack.topicsDone}/{currentPack.topicsTotal || '…'} · {currentPack.wordCount.toLocaleString()} words found
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white text-xs font-medium flex items-center gap-1.5">
                      <Icon icon="solar:download-minimalistic-bold" width="13" className="text-blue-300" style={{ animation: 'vw-dl-bounce 1s ease-in-out infinite' }} />
                      Downloading audio
                    </p>
                    <p className="text-white/50 text-[11px] tabular-nums">
                      {currentPack.audioDone.toLocaleString()} / {currentPack.audioTotal.toLocaleString()} files · {formatBytes(currentPack.bytes)}
                      {formatEta(currentPack.etaSeconds)}
                    </p>
                    {/* Thin shimmer bar */}
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 relative overflow-hidden"
                        style={{ width: `${Math.max(2, percent)}%`, transition: 'width 0.3s ease' }}
                      >
                        <div
                          className="absolute inset-y-0 w-1/2 bg-white/30"
                          style={{ animation: 'vw-dl-shimmer 1.4s ease-in-out infinite', filter: 'blur(4px)' }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => { hapticsLight(); offlineManager.pauseDownload(currentId) }}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 active:bg-white/20 transition-all"
                  aria-label="Pause download"
                >
                  <Icon icon="solar:pause-bold" width="13" />
                </button>
                <button
                  onClick={() => askDelete(currentId, () => offlineManager.cancelDownload(currentId))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                    confirmDeleteId === currentId
                      ? 'bg-red-500/80 border-red-400 text-white'
                      : 'bg-white/10 border-white/15 text-white/70 active:bg-white/20'
                  }`}
                  aria-label="Cancel download"
                >
                  <Icon icon="solar:close-circle-bold" width="14" />
                </button>
              </div>
            </div>
          )}

          {/* ── Paused / failed mid-download ── */}
          {(currentPack?.status === 'paused' || (currentPack?.status === 'error' && currentPack.audioTotal > 0)) && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3.5">
                <ProgressRing percent={percent} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">
                    {currentPack.status === 'paused' ? 'Download paused' : 'Download interrupted'}
                  </p>
                  <p className="text-white/50 text-[11px] tabular-nums">
                    {currentPack.audioDone.toLocaleString()} / {currentPack.audioTotal.toLocaleString()} files · {formatBytes(currentPack.bytes)}
                  </p>
                  {currentPack.status === 'error' && currentPack.error && (
                    <p className="text-red-400 text-[11px] mt-1 leading-snug">{currentPack.error}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startDownload()}
                  disabled={!isOnline}
                  className="flex-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 py-2 rounded-xl font-medium text-xs active:bg-blue-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Icon icon="solar:play-bold" width="12" />
                  {isOnline ? 'Resume' : 'Offline — reconnect to resume'}
                </button>
                <button
                  onClick={() => askDelete(currentId, () => offlineManager.cancelDownload(currentId))}
                  className={`px-4 py-2 rounded-xl font-medium text-xs transition-all border ${
                    confirmDeleteId === currentId
                      ? 'bg-red-500/80 border-red-400 text-white'
                      : 'bg-white/10 border-white/15 text-white/60 active:bg-white/20'
                  }`}
                >
                  {confirmDeleteId === currentId ? 'Confirm' : 'Remove'}
                </button>
              </div>
            </div>
          )}

          {/* ── Storage warning ── */}
          {currentPack?.status === 'storage-warning' && (
            <div className="space-y-2.5">
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-2.5 flex items-start gap-2">
                <Icon icon="solar:danger-triangle-bold" width="16" className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-[11px] leading-relaxed">
                  Your device may not have enough free space. This download needs about{' '}
                  <strong>{formatBytes(currentPack.neededBytes || 0)}</strong>, but only{' '}
                  <strong>{formatBytes(currentPack.availableBytes || 0)}</strong> looks available.
                  Free up space, or continue anyway.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startDownload(true)}
                  className="flex-1 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 py-2 rounded-xl font-medium text-xs active:bg-yellow-500/30 transition-all"
                >
                  Download Anyway
                </button>
                <button
                  onClick={() => { hapticsLight(); offlineManager.cancelDownload(currentId) }}
                  className="px-4 py-2 rounded-xl font-medium text-xs bg-white/10 border border-white/15 text-white/60 active:bg-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Complete ── */}
          {currentPack?.status === 'complete' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:check-circle-bold" width="20" className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">Available offline</p>
                  <p className="text-white/50 text-[11px] tabular-nums">
                    {currentPack.wordCount.toLocaleString()} words · {formatBytes(currentPack.bytes)}
                    {currentPack.audioMissing > 0 && ` · ${currentPack.audioMissing} clips unavailable`}
                  </p>
                </div>
                <button
                  onClick={() => askDelete(currentId, () => offlineManager.deletePack(currentId))}
                  className={`h-8 rounded-full flex items-center justify-center transition-all border px-3 gap-1 text-[11px] font-medium ${
                    confirmDeleteId === currentId
                      ? 'bg-red-500/80 border-red-400 text-white'
                      : 'bg-white/10 border-white/15 text-white/60 active:bg-white/20'
                  }`}
                  aria-label="Delete download"
                >
                  <Icon icon="solar:trash-bin-trash-bold" width="13" />
                  {confirmDeleteId === currentId ? 'Confirm' : ''}
                </button>
              </div>
              <p className="text-white/40 text-[11px] leading-relaxed">
                You can learn {languageName(targetCode)} without internet — no offline warnings for these languages.
              </p>
            </div>
          )}
        </div>

        {/* Other downloaded packs */}
        {otherPacks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-white/40 text-[11px] font-medium uppercase tracking-wide px-0.5">Other downloads</p>
            {otherPacks.map(pack => (
              <div key={pack.id} className="bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                <PairFlags nativeCode={pack.nativeCode} targetCode={pack.targetCode} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {languageName(pack.nativeCode)} → {languageName(pack.targetCode)}
                  </p>
                  <p className="text-white/45 text-[11px] tabular-nums">
                    {pack.status === 'complete' && `${pack.wordCount.toLocaleString()} words · ${formatBytes(pack.bytes)}`}
                    {pack.status === 'downloading' && `Downloading ${pack.audioTotal ? Math.round((pack.audioDone / pack.audioTotal) * 100) : 0}%…`}
                    {(pack.status === 'paused' || pack.status === 'error') && `Paused · ${formatBytes(pack.bytes)}`}
                    {pack.status === 'storage-warning' && 'Waiting — low storage'}
                  </p>
                </div>
                <button
                  onClick={() => askDelete(pack.id, () => offlineManager.deletePack(pack.id))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border flex-shrink-0 ${
                    confirmDeleteId === pack.id
                      ? 'bg-red-500/80 border-red-400 text-white'
                      : 'bg-white/10 border-white/15 text-white/60 active:bg-white/20'
                  }`}
                  aria-label={`Delete ${languageName(pack.nativeCode)} to ${languageName(pack.targetCode)} download`}
                >
                  <Icon icon="solar:trash-bin-trash-bold" width="13" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Device storage */}
        {storage?.supported && storage.quotaBytes > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[11px] font-medium">Device storage for Sprind</span>
              <span className="text-white/40 text-[11px] tabular-nums">
                {formatBytes(storage.usageBytes)} of {formatBytes(storage.quotaBytes)}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storage.usageBytes / storage.quotaBytes > 0.85 ? 'bg-red-400' : 'bg-white/40'
                }`}
                style={{ width: `${Math.min(100, Math.max(1, (storage.usageBytes / storage.quotaBytes) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
