'use client'

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
  loadPrefsFromSettings: (settings: Record<string, any>) => void
  setEnabled: (enabled: boolean) => Promise<void>
  updatePref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>
  refreshPermissionState: () => Promise<void>
  reschedule: (ctx: NotificationContext) => Promise<void>
  onWordPlayed: (ctx: NotificationContext) => Promise<void>
}

export function useNotifications(
  persistPrefs: (key: string, value: NotificationPreferences) => void
): UseNotificationsReturn {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const [permissionState, setPermissionState] = useState<PermissionState>('loading')
  const ctxRef = useRef<NotificationContext | null>(null)

  // ── Fix: always call the LATEST persistPrefs, never a stale closure ──────
  // The caller (language-selector) recreates persistPrefs on every render, so
  // capturing it in useCallback deps would cause stale-closure bugs where
  // user?.id is null. A ref always holds the freshest version.
  const persistPrefsRef = useRef(persistPrefs)
  useEffect(() => { persistPrefsRef.current = persistPrefs })

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
    persistPrefsRef.current('notifications', newPrefs)   // ← use ref, not stale closure
    if (!enabled) {
      await cancelAllNotifications()
    } else if (ctxRef.current) {
      await rescheduleAllNotifications(newPrefs, ctxRef.current)
    }
  }, [prefs])  // persistPrefs intentionally removed from deps — ref handles it

  const updatePref = useCallback(async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    persistPrefsRef.current('notifications', newPrefs)   // ← use ref
    if (newPrefs.enabled && ctxRef.current) {
      await rescheduleAllNotifications(newPrefs, ctxRef.current)
    }
  }, [prefs])

  // Re-check OS permission state — call on app resume so the UI updates
  // after the user returns from iOS Settings where they may have toggled permissions.
  const refreshPermissionState = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setPermissionState('not-native')
      return
    }
    const state = await getNotificationPermission()
    setPermissionState(state)
    // If user just enabled in iOS Settings, auto-enable prefs and reschedule
    if (state === 'granted' && !prefs.enabled) {
      const newPrefs = { ...prefs, enabled: true }
      setPrefs(newPrefs)
      persistPrefsRef.current('notifications', newPrefs)
      if (ctxRef.current) {
        await rescheduleAllNotifications(newPrefs, ctxRef.current)
      }
    }
  }, [prefs])

  const reschedule = useCallback(async (ctx: NotificationContext) => {
    ctxRef.current = ctx
    if (!prefs.enabled) return
    await rescheduleAllNotifications(prefs, ctx)
  }, [prefs])

  const onWordPlayed = useCallback(async (ctx: NotificationContext) => {
    ctxRef.current = ctx
    if (!prefs.enabled) return
    if (prefs.streakProtectionEnabled) await cancelTodaysStreakNotification()
    if (prefs.reviewReminderEnabled) await rescheduleAllNotifications(prefs, ctx)
  }, [prefs])

  return { prefs, permissionState, loadPrefsFromSettings, setEnabled, updatePref, refreshPermissionState, reschedule, onWordPlayed }
}
