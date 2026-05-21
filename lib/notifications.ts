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
  dueReviewCount: number           // words currently due for review
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

// ── Notification copy pools ──────────────────────────────────────────────────

type CopyFn = (ctx: NotificationContext & { projected?: number }) => { title: string; body: string }

function pick<T>(pool: T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length]
}

function daySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

const DAILY_COPY: CopyFn[] = [
  (ctx) => ({
    title: `Your ${ctx.userLanguage} is waiting`,
    body: 'Five minutes now saves you an hour of forgetting later.',
  }),
  (ctx) => ({
    title: 'Small steps, big fluency',
    body: `A few ${ctx.userLanguage} words today and future-you will be grateful.`,
  }),
  (ctx) => ({
    title: `📖 Ready to learn ${ctx.userLanguage}?`,
    body: "Today's words won't study themselves. Let's knock them out.",
  }),
  (ctx) => ({
    title: 'Your brain is freshest right now',
    body: `Perfect time to pick up some ${ctx.userLanguage}. Just a quick round.`,
  }),
  (ctx) => ({
    title: "⛓️ Don't break the chain",
    body: `Open Sprind, learn a few ${ctx.userLanguage} words, close Sprind. Easy.`,
  }),
  (ctx) => ({
    title: `Quick ${ctx.userLanguage} round?`,
    body: 'Even one word a day keeps the language alive in your head.',
  }),
  (ctx) => ({
    title: 'Consistency beats intensity',
    body: `Two minutes of ${ctx.userLanguage} now beats an hour crammed on Sunday.`,
  }),
]

const STREAK_COPY: CopyFn[] = [
  (ctx) => ({
    title: `🔥 ${ctx.projected} days — don't stop now`,
    body: `You're building real ${ctx.userLanguage} muscle. One word keeps it alive.`,
  }),
  (ctx) => ({
    title: `${ctx.projected}-day streak on the line`,
    body: "Tonight's the cutoff. Tap in before bed and you're safe.",
  }),
  (ctx) => ({
    title: `🔥 Protect your ${ctx.projected}-day streak`,
    body: 'It took real effort to get here. A quick session keeps it going.',
  }),
  (ctx) => ({
    title: `${ctx.projected} days and counting`,
    body: `That's ${ctx.projected} days of showing up for ${ctx.userLanguage}. Keep it going.`,
  }),
  (ctx) => ({
    title: '⚠️ Your streak expires tonight',
    body: `${ctx.projected} days of progress — 30 seconds is all it takes to save it.`,
  }),
  (ctx) => ({
    title: `🔥 ${ctx.projected} days strong`,
    body: "Don't let a busy evening erase the habit. One quick round.",
  }),
]

const STREAK_START_COPY: CopyFn[] = [
  () => ({
    title: 'Start a streak today',
    body: 'Learn one word and your streak clock starts ticking.',
  }),
  () => ({
    title: 'Day 1 starts now',
    body: 'Every long streak started with a single session. Make it today.',
  }),
]

const REVIEW_COPY: CopyFn[] = [
  (ctx) => ({
    title: `📖 ${ctx.dueReviewCount} ${ctx.userLanguage} words to review`,
    body: 'Tap to quiz yourself — a quick round locks them in.',
  }),
  (ctx) => ({
    title: `${ctx.dueReviewCount} words are piling up`,
    body: `Your ${ctx.userLanguage} review queue is waiting. Tap to start.`,
  }),
  (ctx) => ({
    title: `✏️ You have ${ctx.dueReviewCount} words waiting`,
    body: `A quick ${ctx.userLanguage} review now saves you relearning later.`,
  }),
  (ctx) => ({
    title: `${ctx.dueReviewCount} ${ctx.userLanguage} words — ready?`,
    body: "Your brain's had time to sleep on them. Tap to see what stuck.",
  }),
  (ctx) => ({
    title: `Don't let ${ctx.dueReviewCount} words slip away`,
    body: `Quick ${ctx.userLanguage} review inside. Takes about a minute.`,
  }),
]

// ── Scheduling helpers ───────────────────────────────────────────────────────

async function scheduleDailyReminder(
  prefs: NotificationPreferences,
  ctx: NotificationContext
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] })
  if (!prefs.dailyReminderEnabled) return

  const { title, body } = pick(DAILY_COPY, daySeed())(ctx)

  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_REMINDER_ID,
      title,
      body,
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
    const enrichedCtx = { ...ctx, projected }
    const { title, body } = projected > 1
      ? pick(STREAK_COPY, daySeed() + i)(enrichedCtx)
      : pick(STREAK_START_COPY, daySeed() + i)(enrichedCtx)

    toSchedule.push({
      id: STREAK_BASE_ID + i,
      title,
      body,
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

/**
 * Returns the next occurrence of HH:MM that is at least `minHoursAfter` hours
 * after `anchor`. Snaps to the user's daily reminder time so the review
 * notification arrives when they normally study, not at a random hour.
 */
function nextReminderTimeAfter(anchor: Date, reminderTime: string, minHoursAfter: number): Date {
  const [h, m] = reminderTime.split(':').map(Number)
  const candidate = new Date(anchor)
  candidate.setHours(h, m, 0, 0)
  // If candidate is same day but too soon, push to next day
  if (candidate.getTime() - anchor.getTime() < minHoursAfter * 3600_000) {
    candidate.setDate(candidate.getDate() + 1)
  }
  // Edge case: if still in the past (studied long ago), push forward
  while (candidate <= new Date()) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

const REVIEW_THRESHOLD = 10

async function scheduleReviewReminder(
  prefs: NotificationPreferences,
  ctx: NotificationContext
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: REVIEW_ID }] })
  if (!prefs.reviewReminderEnabled) return
  if (ctx.dueReviewCount <= REVIEW_THRESHOLD) return

  // Schedule for the next daily reminder time (at least 1h from now so it
  // doesn't fire immediately when the app reschedules on foreground)
  const reminderTime = prefs.dailyReminderEnabled ? prefs.dailyReminderTime : '09:00'
  const reviewAt = nextReminderTimeAfter(new Date(), reminderTime, 1)

  const { title, body } = pick(REVIEW_COPY, daySeed())(ctx)

  await LocalNotifications.schedule({
    notifications: [{
      id: REVIEW_ID,
      title,
      body,
      schedule: { at: reviewAt },
      extra: { action: 'open_review' },
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

/**
 * Registers a listener for notification taps. Dispatches a CustomEvent on
 * window so UI components can react (e.g. auto-open the review quiz).
 * Call once at app startup. Returns a cleanup function.
 */
export async function setupNotificationTapListener(): Promise<() => void> {
  if (!isNative()) return () => {}
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const listener = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (event) => {
      const action = event.notification?.extra?.action
      if (action) {
        window.dispatchEvent(new CustomEvent('notification-action', { detail: { action } }))
      }
    }
  )
  return () => listener.remove()
}
