'use client'

// Manage Account on iPhone: the same sheet, drawn natively
// (ios/App/App/AccountSheet*.swift) for Liquid Glass and the screen's full
// refresh rate. Everything it shows is worked out here, from the same hooks
// and rules as the web sheet (manage-account-modal.tsx), which Android and the
// web keep. The native side only lays it out and animates it, and sends back
// what was tapped.

import { useEffect, useRef, useState } from 'react'
import type { PluginListenerHandle } from '@capacitor/core'
import { useT } from '@/components/providers/translation-provider'
import { useLevelXp } from '@/components/leveling/level-card'
import { levelInfo, nextRank, rankForLevel, RANKS } from '@/lib/leveling/definitions'
import { THEMES, currentTheme, onThemeChange, setTheme, themeById, type ThemeId } from '@/lib/themes'
import { resolveAvatar } from '@/lib/avatars/smiley-avatar'
import { getFlagIcon } from '@/utils/flags'
import { AccountSheet, type AccountSheetAction } from '@/lib/native/account-sheet'
import { deleteAccount } from '@/lib/account/delete-account'
import { useHomeWidget } from '@/components/account/home-widget-section'
import { useOfflinePacks, type OfflineActionId } from '@/components/offline/offline-downloads-section'
import type { ManageAccountModalProps } from '@/components/account/manage-account-modal'

interface NativeAccountSheetProps extends ManageAccountModalProps {
  /** The native sheet couldn't open: show the web one instead. */
  onUnavailableAction: () => void
}

export function NativeAccountSheet(props: NativeAccountSheetProps) {
  // Mounted only while open: mounting presents the sheet, unmounting dismisses it.
  return props.open ? <OpenSheet {...props} /> : null
}

function OpenSheet(props: NativeAccountSheetProps) {
  const { t } = useT()
  const xp = useLevelXp(props.userId)
  const widget = useHomeWidget()
  const offline = useOfflinePacks()
  const [themeId, setThemeId] = useState<ThemeId>(() => currentTheme())
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [waitedEnough, setWaitedEnough] = useState(false)
  const presented = useRef(false)
  const onAction = useRef<(action: AccountSheetAction) => void>(() => {})

  useEffect(() => onThemeChange((id) => setThemeId(id)), [])

  const avatarSrc = resolveAvatar(props.avatarUrl, props.avatarSeed)
  useEffect(() => {
    let cancelled = false
    toNativeImage(avatarSrc).then((src) => { if (!cancelled) setAvatar(src) })
    return () => { cancelled = true }
  }, [avatarSrc])

  // Open once the face and the widget's status are known, so nothing pops in
  // after the sheet is up; never wait more than half a second for them.
  useEffect(() => {
    const timer = setTimeout(() => setWaitedEnough(true), 500)
    return () => clearTimeout(timer)
  }, [])
  const ready = waitedEnough || (avatar !== undefined && widget.status !== null)

  const name = props.name || 'User'
  const email = props.email || ''
  const initials = name.split(' ').map((part) => part[0] ?? '').join('').toUpperCase().slice(0, 2)
  const info = levelInfo(xp)
  const rank = rankForLevel(info.level)
  const next = nextRank(info.level)
  const theme = themeById(themeId)
  const notif = props.notifPermission
  const widgetOptions = [
    { value: 'random', label: t('widget.source.random') },
    ...widget.topics.map((topic) => ({ value: String(topic.id), label: topic.name })),
  ]
  // A topic chosen before the list has loaded still needs a row to show as picked.
  if (!widgetOptions.some((option) => option.value === String(widget.source))) {
    widgetOptions.push({ value: String(widget.source), label: '…' })
  }

  // The shape ios/App/App/AccountSheetState.swift decodes.
  const state = {
    title: t('account.title'),
    closeLabel: t('account.aria.close'),
    dark: !theme.light,
    profile: { name, email: email || null, avatar: avatar ?? null, initials },
    level: {
      level: info.level,
      progress: info.progress,
      rank: rank.id,
      levelLabel: t('level.label', { level: info.level }),
      xpLabel: info.span > 0
        ? `${info.intoLevel.toLocaleString()} / ${info.span.toLocaleString()} XP`
        : t('level.maxed'),
      hint: info.span > 0
        ? t('level.xpToNext', { xp: info.toNext.toLocaleString(), level: info.level + 1 }) +
          (next ? ` · ${t('level.nextBorder', { title: t(`level.rank.${next.id}`), level: next.minLevel })}` : '')
        : null,
      bordersLabel: t('level.borders'),
      previewLabel: t('level.preview'),
      ranks: RANKS.map((r) => ({
        id: r.id,
        minLevel: r.minLevel,
        title: t(`level.rank.${r.id}`),
        color: r.color,
        accent: r.accent,
        owned: r.minLevel <= info.level,
        unlockLabel: t('level.unlockAt', { level: r.minLevel }),
      })),
    },
    subscription: {
      title: t('account.subscription'),
      premium: !!props.isPremium,
      badge: props.isPremium ? t('account.premium') : t('account.free'),
      lines: props.isPremium
        ? [
            ...(props.planType ? [props.planType === 'yearly' ? t('account.plan.yearly') : t('account.plan.monthly')] : []),
            ...(props.renewalDate ? [t('account.renewsOn', { date: props.renewalDate })] : []),
          ]
        : [],
    },
    theme: {
      title: t('theme.title'),
      desc: t('theme.desc'),
      current: themeId,
      items: THEMES.map((item) => ({
        id: item.id,
        name: t(`theme.name.${item.id}` as const),
        premium: item.premium,
        light: !!item.light,
        chrome: !!item.chrome,
        image: item.swatch.match(/url\('([^']+)'\)/)?.[1] ?? null,
      })),
      tryLive: props.onTryThemesAction ? t('theme.tryLive') : null,
    },
    notifications: notif && notif !== 'not-native' && notif !== 'loading'
      ? {
          title: t('account.notifications'),
          desc: t('account.notifications.desc'),
          on: notif === 'granted',
          badge: notif === 'granted' ? t('account.notifications.on') : t('account.notifications.off'),
          button: t('account.notifications.openSettings'),
        }
      : null,
    leaderboard: props.showLeaderboardOption !== false
      ? { title: t('account.leaderboard.show'), desc: t('account.leaderboard.desc'), on: !!props.showOnLeaderboard }
      : null,
    widget: widget.status?.supported
      ? {
          title: t('widget.title'),
          desc: t('widget.desc'),
          added: widget.added,
          addedLabel: t('widget.added'),
          sourceLabel: t('widget.source'),
          source: String(widget.source),
          options: widgetOptions,
          status: widget.statusText,
          statusFailed: widget.syncState === 'failed',
          addButton: !widget.added && widget.status.canPin ? t('widget.addToHome') : null,
          howToTitle: t('widget.howTo.title'),
          steps: widget.steps,
        }
      : null,
    offline: offline.visible
      ? {
          title: t('offline.title'),
          done: offline.done,
          rows: offline.rows.map((row) => ({
            id: row.id,
            flags: [flagEmoji(row.nativeCode), flagEmoji(row.targetCode)],
            title: row.title,
            subtitle: row.subtitle,
            tone: row.tone,
            percent: row.percent,
            active: row.active,
            actions: row.actions.map((action) => ({ id: action.id, label: action.label ?? null, disabled: !!action.disabled })),
          })),
        }
      : null,
    buttons: {
      manageSubscription: t('account.manageSubscription'),
      deleteAccount: t('account.deleteAccount'),
      signOut: t('account.signOut'),
    },
    delete: {
      title: t('account.delete.title'),
      warning: props.isPremium ? t('account.delete.subscriptionWarning') : null,
      permanent: t('account.delete.permanent'),
      hint: t('account.delete.confirmHint', { word: 'delete' }),
      word: 'delete',
      cancel: t('common.cancel'),
      confirm: t('account.delete.confirm'),
      deleting: t('account.delete.deleting'),
      busy: deleting,
      error: deleteError,
    },
  }
  const json = JSON.stringify(state)

  // Present once, then keep the open sheet in step with every change.
  useEffect(() => {
    if (!ready) return
    if (presented.current) {
      AccountSheet.update({ state: json }).catch((err) => console.error('[AccountSheet] update failed:', err))
      return
    }
    presented.current = true
    const rect = props.morphFrom?.()?.getBoundingClientRect()
    AccountSheet.present({
      state: json,
      focus: props.openNotifications ? 'notifications' : undefined,
      ...(rect && rect.width > 0
        ? { sourceX: rect.left, sourceY: rect.top, sourceWidth: rect.width, sourceHeight: rect.height }
        : {}),
    }).catch((err) => {
      console.error('[AccountSheet] present failed, using the web sheet:', err)
      props.onUnavailableAction()
    })
    // props.morphFrom and friends are read once, at opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, json])

  useEffect(() => () => { AccountSheet.dismiss().catch(() => {}) }, [])

  const runDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount(props.onSignOutAction)
      props.onCloseAction()
    } catch (err: any) {
      setDeleteError(err?.message || t('account.delete.failed'))
    } finally {
      setDeleting(false)
    }
  }

  // The latest props and hooks, for the listener registered once below.
  useEffect(() => {
    onAction.current = (action: AccountSheetAction) => {
      switch (action.type) {
        case 'closed':
          props.onCloseAction()
          break
        case 'theme': {
          const picked = THEMES.find((item) => item.id === action.value)
          if (!picked) break
          if (picked.premium && !props.isPremium) {
            // The paywall is a web screen: the sheet makes way for it.
            props.onCloseAction()
            props.onPremiumThemeAction?.(picked.id)
          } else {
            setTheme(picked.id)
          }
          break
        }
        case 'tryThemes':
          props.onTryThemesAction?.()
          break
        case 'leaderboard':
          props.onLeaderboardToggle?.(action.value === 'on')
          break
        case 'widgetSource':
          widget.choose(!action.value || action.value === 'random' ? 'random' : Number(action.value))
          break
        case 'widgetAdd':
          widget.addToHome()
          break
        case 'offline': {
          const [kind, ...rest] = (action.value ?? '').split(':')
          offline.act(kind as OfflineActionId, rest.join(':'))
          break
        }
        case 'deleteAccount':
          runDelete()
          break
        case 'signOut':
          props.onSignOutAction?.()
          props.onCloseAction()
          break
      }
    }
  })

  useEffect(() => {
    let handle: PluginListenerHandle | null = null
    let gone = false
    AccountSheet.addListener('action', (action) => onAction.current(action)).then((h) => {
      if (gone) h.remove()
      else handle = h
    })
    return () => {
      gone = true
      handle?.remove()
    }
  }, [])

  return null
}

/** UIImage can't read SVG, and the generated smiley face is one: draw it as a PNG. */
async function toNativeImage(src: string | null): Promise<string | null> {
  if (!src) return null
  if (!src.startsWith('data:image/svg')) return src
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 240
    canvas.getContext('2d')?.drawImage(img, 0, 0, 240, 240)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/** The flag the web sheet shows for a language, as an emoji. */
function flagEmoji(languageCode: string): string {
  const region = getFlagIcon(languageCode).replace(/^flag:/, '').slice(0, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(region)) return '🏳️'
  return String.fromCodePoint(...Array.from(region, (letter) => 0x1f1e6 + letter.charCodeAt(0) - 65))
}
