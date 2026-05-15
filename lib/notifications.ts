/**
 * lib/notifications.ts
 *
 * On-device notification scheduling for Sprind.
 * Uses @capacitor/local-notifications — no APNS/FCM setup required.
 *
 * Notification ID assignments:
 *   1000        — Daily study reminder (repeating daily)
 *   2000–2029   — Streak protection (one per calendar day, next 30 days)
 *   3000        — Review reminder (one-time, ~24h after last study)
 *
 * All functions guard with isNative() so they are safe to call during SSR
 * and on the web build. Dynamic imports prevent the Capacitor module from
 * being evaluated in a Node.js context.
 */

import { Capacitor } from '@capacitor/core'

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  enabled: boolean
  dailyReminderEnabled: boolean
  dailyReminderTime: string        // "HH:MM" 24-hour local time
  streakProtectionEnabled: boolean
  reviewReminderEnabled: boolean
}

export interface NotificationContext {
  currentStreak: number
  lastTopicName: string | null
  lastStudiedAt: string | null     // ISO timestamp or null
  userLanguage: string             // e.g. "Portuguese"
  timezone: string                 // IANA timezone string
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  dailyReminderEnabled: true,
  dailyReminderTime: '09:00',
  streakProtectionEnabled: true,
  reviewReminderEnabled: true,
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAILY_REMINDER_ID = 1000
const STREAK_BASE_ID    = 2000
const REVIEW_ID         = 3000
const STREAK_DAYS       = 30

// ── Platform guard ───────────────────────────────────────────────────────────

function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

// ── Permission ───────────────────────────────────────────────────────────────

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative()) return 'denied'
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const { display } = await LocalNotifications.checkPermissions()
  return display as 'granted' | 'denied' | 'prompt'
}

/**
 * Requests OS notification permission. Returns true if granted.
 * The OS dialog only appears once; subsequent calls return the stored state.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  if (current.display === 'denied') return false
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns a Date set to HH:MM today. If that time has already passed,
 * advances by 1 day so the notification fires tomorrow at that time.
 */
function todayAt(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d <= new Date()) d.setDate(d.getDate() + 1)
  return d
}

/** Returns a Date set to 20:00 (8 PM) on today + dayOffset days. */
function streakTimeOnDay(dayOffset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(20, 0, 0, 0)
  return d
}

// ── Scheduling helpers ───────────────────────────────────────────────────────

async function scheduleDailyReminder(
  prefs: NotificationPreferences,
  ctx: NotificationContext
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] })
  if (!prefs.dailyReminderEnabled) return

  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_REMINDER_ID,
      title: 'Time to study!',
      body: `Keep your ${ctx.userLanguage} momentum going — just a few words today.`,
      schedule: { at: todayAt(prefs.dailyReminderTime), repeats: true, every: 'day' },
      smallIcon: 'ic_notification',
      iconColor: '#6366f1',
      sound: 'default',
    }],
  })
}

async function scheduleStreakProtection(
  prefs: NotificationPreferences,
  ctx: NotificationContext,
  studiedToday: boolean
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')

  // Cancel all 30 existing streak slots before rescheduling
  await LocalNotifications.cancel({
    notifications: Array.from({ length: STREAK_DAYS }, (_, i) => ({ id: STREAK_BASE_ID + i })),
  })

  if (!prefs.streakProtectionEnabled || ctx.currentStreak === 0) return

  const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = []
  for (let i = 0; i < STREAK_DAYS; i++) {
    if (i === 0 && studiedToday) continue
    const at = streakTimeOnDay(i)
    if (at <= new Date()) continue

    const projected = ctx.currentStreak + i
    toSchedule.push({
      id: STREAK_BASE_ID + i,
      title: projected > 1 ? `${projected}-day streak at risk! 🔥` : 'Start your streak today!',
      body: `Study at least one word to keep it going.`,
      schedule: { at },
      smallIcon: 'ic_notification',
      iconColor: '#f59e0b',
      sound: 'default',
    })
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule })
  }
}

async function scheduleReviewReminder(
  prefs: NotificationPreferences,
  ctx: NotificationContext
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: REVIEW_ID }] })
  if (!prefs.reviewReminderEnabled || !ctx.lastStudiedAt || !ctx.lastTopicName) return

  const reviewAt = new Date(new Date(ctx.lastStudiedAt).getTime() + 24 * 60 * 60 * 1000)
  if (reviewAt <= new Date()) return

  await LocalNotifications.schedule({
    notifications: [{
      id: REVIEW_ID,
      title: 'Review time!',
      body: `You studied ${ctx.lastTopicName} yesterday — review those words to lock them in.`,
      schedule: { at: reviewAt },
      smallIcon: 'ic_notification',
      iconColor: '#10b981',
      sound: 'default',
    }],
  })
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the user has already studied today according to their
 * stored timezone. Used to suppress the streak notification for today.
 */
export function hasStudiedToday(ctx: NotificationContext): boolean {
  if (!ctx.lastStudiedAt) return false
  const tz = ctx.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const lastStr  = new Date(ctx.lastStudiedAt).toLocaleDateString('en-CA', { timeZone: tz })
  return todayStr === lastStr
}

/**
 * Master reschedule — call on every app open/foreground and on settings change.
 * No-ops gracefully when not on a native platform or permission is not granted.
 */
export async function rescheduleAllNotifications(
  prefs: NotificationPreferences,
  ctx: NotificationContext
): Promise<void> {
  if (!isNative()) return
  if (!prefs.enabled) {
    await cancelAllNotifications()
    return
  }
  const permission = await getNotificationPermission()
  if (permission !== 'granted') return

  const studied = hasStudiedToday(ctx)
  await Promise.all([
    scheduleDailyReminder(prefs, ctx),
    scheduleStreakProtection(prefs, ctx, studied),
    scheduleReviewReminder(prefs, ctx),
  ])
}

/**
 * Cancel only today's streak protection notification (ID 2000).
 * Call this immediately after any word is successfully played.
 */
export async function cancelTodaysStreakNotification(): Promise<void> {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: STREAK_BASE_ID }] })
}

/**
 * Opens the app's settings page in iOS/Android Settings.
 * Used when the user has denied notification permission and needs to re-enable
 * from the OS settings screen.
 */
export async function openAppSettings(): Promise<void> {
  if (!isNative()) return
  // 'app-settings:' is a built-in iOS URL scheme that opens this app's
  // Settings page directly (where the notification toggle lives).
  window.open('app-settings:', '_self')
}

/** Cancel every notification managed by this module. */
export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({
    notifications: [
      { id: DAILY_REMINDER_ID },
      { id: REVIEW_ID },
      ...Array.from({ length: STREAK_DAYS }, (_, i) => ({ id: STREAK_BASE_ID + i })),
    ],
  })
}
