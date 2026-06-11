"use client"

/**
 * NotificationTester — hidden dev panel for verifying the notification
 * pipeline on a simulator or device.
 *
 * Unlock: tap the "Daily Reminder" title 5× in the account modal
 * (persists via localStorage key `vw_notif_debug`).
 *
 * What it can do:
 *   • Show OS permission state + request it
 *   • Fire one [TEST] notification of each type ~8s out (background the app!)
 *   • Run the REAL reschedule flow with live API context (stub fallback)
 *   • List every pending notification with its fire time
 *   • Cancel everything
 */

import React, { useState, useCallback } from "react"
import { Icon } from "@iconify/react"
import { Capacitor } from "@capacitor/core"
import {
  type NotificationPreferences,
  type NotificationContext,
  type PendingNotificationInfo,
  STUB_NOTIFICATION_CONTEXT,
  fetchNotificationContext,
  getNotificationPermission,
  requestNotificationPermission,
  rescheduleAllNotifications,
  cancelAllNotifications,
  scheduleTestNotifications,
  getPendingNotifications,
} from "@/lib/notifications"

const DEBUG_FLAG = 'vw_notif_debug'

export function isNotifDebugEnabled(): boolean {
  try { return localStorage.getItem(DEBUG_FLAG) === '1' } catch { return false }
}

export function setNotifDebugEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEBUG_FLAG, '1')
    else localStorage.removeItem(DEBUG_FLAG)
  } catch {}
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtWhen(p: PendingNotificationInfo): string {
  if (p.on) return p.on
  if (!p.at) return 'unknown'
  const d = new Date(p.at)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? `today ${fmtTime(d)}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

interface NotificationTesterProps {
  prefs: NotificationPreferences
}

export function NotificationTester({ prefs }: NotificationTesterProps) {
  const [log, setLog] = useState<string[]>([])
  const [pending, setPending] = useState<PendingNotificationInfo[] | null>(null)
  const [busy, setBusy] = useState(false)

  const addLog = useCallback((line: string) => {
    setLog(prev => [...prev.slice(-7), `${fmtTime(new Date())}  ${line}`])
  }, [])

  const getCtx = useCallback(async (): Promise<{ ctx: NotificationContext; live: boolean }> => {
    const live = await fetchNotificationContext()
    if (live) return { ctx: live, live: true }
    return { ctx: STUB_NOTIFICATION_CONTEXT, live: false }
  }, [])

  const refreshPending = useCallback(async () => {
    const list = await getPendingNotifications()
    setPending(list)
    addLog(`${list.length} pending notification(s)`)
  }, [addLog])

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e: any) {
      addLog(`❌ ${label}: ${e?.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }, [addLog])

  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-amber-200/80 text-xs">
        Notification tester only works in the native app (simulator or device).
      </div>
    )
  }

  const actions: { icon: string; label: string; onClick: () => void }[] = [
    {
      icon: 'solar:shield-check-bold',
      label: 'Check / request permission',
      onClick: () => run('permission', async () => {
        const before = await getNotificationPermission()
        addLog(`permission: ${before}`)
        if (before !== 'granted') {
          const granted = await requestNotificationPermission()
          addLog(granted ? '✅ granted' : '❌ not granted — enable in iOS Settings')
        }
      }),
    },
    {
      icon: 'solar:play-circle-bold',
      label: 'Fire 3 test notifications (~8s) — background the app!',
      onClick: () => run('test fire', async () => {
        const { ctx, live } = await getCtx()
        addLog(`context: ${live ? 'live API ✅' : 'API unreachable → stub ⚠️'}`)
        const fired = await scheduleTestNotifications(ctx)
        fired.forEach(f => addLog(`scheduled ${f.type} @ ${fmtTime(f.at)}`))
        addLog('→ background the app to see banners')
      }),
    },
    {
      icon: 'solar:refresh-circle-bold',
      label: 'Run REAL reschedule flow',
      onClick: () => run('reschedule', async () => {
        const { ctx, live } = await getCtx()
        addLog(`context: ${live ? 'live API ✅' : 'API unreachable → stub ⚠️'}`)
        addLog(`streak=${ctx.currentStreak} due=${ctx.dueReviewCount} enabled=${prefs.enabled}`)
        await rescheduleAllNotifications(prefs, ctx)
        await refreshPending()
      }),
    },
    {
      icon: 'solar:list-check-bold',
      label: 'List pending notifications',
      onClick: () => run('pending', refreshPending),
    },
    {
      icon: 'solar:trash-bin-trash-bold',
      label: 'Cancel all',
      onClick: () => run('cancel', async () => {
        await cancelAllNotifications()
        await refreshPending()
        addLog('🧹 canceled all app notifications')
      }),
    },
  ]

  return (
    <div className="bg-purple-500/10 border border-purple-400/25 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/10">
        <Icon icon="solar:bug-bold" width="15" className="text-purple-300" />
        <span className="text-purple-200 font-semibold text-xs uppercase tracking-wide">Notification Tester</span>
        <button
          onClick={() => { setNotifDebugEnabled(false); window.dispatchEvent(new Event('vw-notif-debug-off')) }}
          className="ml-auto text-white/40 text-[10px] underline"
        >
          hide
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {actions.map(a => (
          <button
            key={a.label}
            disabled={busy}
            onClick={a.onClick}
            className="w-full flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-left text-white/85 text-xs font-medium active:bg-white/20 disabled:opacity-40 transition-all"
          >
            <Icon icon={a.icon} width="14" className="text-purple-300 flex-shrink-0" />
            {a.label}
          </button>
        ))}

        {pending !== null && (
          <div className="bg-black/25 rounded-xl px-3 py-2 space-y-1">
            <div className="text-white/50 text-[10px] uppercase tracking-wide">Pending ({pending.length})</div>
            {pending.length === 0 && (
              <div className="text-white/40 text-[11px]">none — nothing is scheduled</div>
            )}
            {pending.map(p => (
              <div key={p.id} className="text-[11px] leading-tight">
                <span className="text-purple-300 tabular-nums">#{p.id}</span>{' '}
                <span className="text-white/80">{fmtWhen(p)}</span>
                <div className="text-white/45 truncate">{p.title}</div>
              </div>
            ))}
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-black/25 rounded-xl px-3 py-2">
            {log.map((l, i) => (
              <div key={i} className="text-white/55 text-[10px] font-mono leading-relaxed">{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
