'use client'

/**
 * hooks/use-notifications.ts
 *
 * React hook that manages notification state and wires the scheduling
 * service into the app. Used by language-selector.tsx.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  type NotificationPreferences,
  type NotificationContext,
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPermission,
  requestNotificationPermission,
  rescheduleAllNotifications,
  cancelAllNotifications,
  cancelTodaysStreakNotification,
} from '@/lib/notifications'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'loading' | 'not-native'

export interface UseNotificationsReturn {
  prefs: NotificationPreferences
  permissionState: PermissionState
  /** Load saved prefs from the learning_settings object returned by /api/settings */
  loadPrefsFromSettings: (settings: Record<string, any>) => void
  /** Enable or disable all notifications. Requests OS permission on first enable. */
  setEnabled: (enabled: boolean) => Promise<void>
  /** Update one preference key, persist, and reschedule. */
  updatePref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>
  /** Call on every app open/foreground with fresh context from /api/notifications/context. */
  reschedule: (ctx: NotificationContext) => Promise<void>
  /** Call immediately after any word is played. Cancels today's streak notification. */
  onWordPlayed: (ctx: NotificationContext) => Promise<void>
}

export function useNotifications(
  persistPrefs: (key: string, value: NotificationPreferences) => void
): UseNotificationsReturn {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const [permissionState, setPermissionState] = useState<PermissionState>('loading')
  const ctxRef = useRef<NotificationContext | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setPermissionState('not-native')
      return
    }
    getNotificationPermission().then(setPermissionState)
  }, [])

  const loadPrefsFromSettings = useCallback((settings: Record<string, any>) => {
    const saved = settings?.notifications
    if (saved && typeof saved === 'object') {
      setPrefs(prev => ({ ...prev, ...saved }))
    }
  }, [])

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission()
      setPermissionState(granted ? 'granted' : 'denied')
      if (!granted) return
    }
    const newPrefs = { ...prefs, enabled }
    setPrefs(newPrefs)
    persistPrefs('notifications', newPrefs)
    if (!enabled) {
      await cancelAllNotifications()
    } else if (ctxRef.current) {
      await rescheduleAllNotifications(newPrefs, ctxRef.current)
    }
  }, [prefs, persistPrefs])

  const updatePref = useCallback(async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    persistPrefs('notifications', newPrefs)
    if (newPrefs.enabled && ctxRef.current) {
      await rescheduleAllNotifications(newPrefs, ctxRef.current)
    }
  }, [prefs, persistPrefs])

  const reschedule = useCallback(async (ctx: NotificationContext) => {
    ctxRef.current = ctx
    if (!prefs.enabled) return
    await rescheduleAllNotifications(prefs, ctx)
  }, [prefs])

  const onWordPlayed = useCallback(async (ctx: NotificationContext) => {
    ctxRef.current = ctx
    if (!prefs.enabled) return
    if (prefs.streakProtectionEnabled) {
      await cancelTodaysStreakNotification()
    }
    if (prefs.reviewReminderEnabled) {
      await rescheduleAllNotifications(prefs, ctx)
    }
  }, [prefs])

  return {
    prefs,
    permissionState,
    loadPrefsFromSettings,
    setEnabled,
    updatePref,
    reschedule,
    onWordPlayed,
  }
}
