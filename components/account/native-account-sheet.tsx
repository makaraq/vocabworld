'use client'

// Manage Account on iPhone: the same sheet, drawn natively
// (ios/App/App/AccountSheet*.swift) for Liquid Glass and the screen's full
// refresh rate. Everything it shows is worked out here, from the same hooks
// and rules as the web sheet (manage-account-modal.tsx), which Android and the
// web keep. The native side only lays it out and animates it, and sends back
// what was tapped.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PluginListenerHandle } from '@capacitor/core'
import { getIcon } from '@iconify/react'
import { useT } from '@/components/providers/translation-provider'
import { useLevelXp } from '@/components/leveling/level-card'
import { levelInfo, nextRank, rankForLevel, RANKS } from '@/lib/leveling/definitions'
import { DEFAULT_THEME, THEMES, currentTheme, onThemeChange, setTheme, themeById, type ThemeId } from '@/lib/themes'
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
  // The offline rows' flags, drawn once each as pictures (see flagPicture).
  const [flags, setFlags] = useState<Record<string, string | null>>({})
  const sentImages = useRef(new Set<string>())
  const presented = useRef(false)
  const onAction = useRef<(action: AccountSheetAction) => void>(() => {})

  useEffect(() => onThemeChange((id) => setThemeId(id)), [])

  // Every theme's backdrop decoded ahead, so a newly picked one is painted at
  // once (the sheet pictures the page for its glass straight away).
  useEffect(() => {
    for (const item of THEMES) {
      const src = item.swatch.match(/url\('([^']+)'\)/)?.[1]
      if (!src) continue
      const img = new Image()
      img.src = src
      img.decode().catch(() => {})
    }
  }, [])

  const avatarSrc = resolveAvatar(props.avatarUrl, props.avatarSeed)
  useEffect(() => {
    let cancelled = false
    toNativeImage(avatarSrc).then((src) => { if (!cancelled) setAvatar(src) })
    return () => { cancelled = true }
  }, [avatarSrc])

  const flagNames = offline.rows.flatMap((row) => [getFlagIcon(row.nativeCode), getFlagIcon(row.targetCode)])
  const missingFlags = flagNames.filter((name) => !(name in flags))
  const missingKey = [...new Set(missingFlags)].join(',')
  useEffect(() => {
    if (!missingKey) return
    let cancelled = false
    const names = missingKey.split(',')
    Promise.all(names.map(flagPicture)).then((pictures) => {
      if (cancelled) return
      setFlags((had) => ({ ...had, ...Object.fromEntries(names.map((name, i) => [name, pictures[i]])) }))
    })
    return () => { cancelled = true }
  }, [missingKey])

  // Open once the face, the flags and the widget's status are known, so
  // nothing pops in after the sheet is up; never wait more than half a second.
  useEffect(() => {
    const timer = setTimeout(() => setWaitedEnough(true), 500)
    return () => clearTimeout(timer)
  }, [])
  const ready = waitedEnough || (avatar !== undefined && widget.status !== null && missingFlags.length === 0)

  const name = props.name || 'User'
  const email = props.email || ''
  const initials = name.split(' ').map((part) => part[0] ?? '').join('').toUpperCase().slice(0, 2)
  const info = levelInfo(xp)
  const rank = rankForLevel(info.level)
  const next = nextRank(info.level)
  const theme = themeById(themeId)
  // The theme's own glass for the sheet, read off the page's CSS as it is now.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const look = useMemo(() => sheetLook(), [themeId])
  // Every theme's, measured once: the sheet switches theme on its own the
  // moment one is tapped, without waiting to hear back from the page.
  const looks = useMemo(() => themeLooks(), [])
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
    look,
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
        look: looks[item.id] ?? null,
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
            flags: [getFlagIcon(row.nativeCode), getFlagIcon(row.targetCode)],
            title: row.title,
            subtitle: row.subtitle,
            tone: row.tone,
            percent: row.percent,
            active: row.active,
            actions: row.actions.map((action) => ({ id: action.id, label: action.label ?? null, disabled: !!action.disabled })),
          })),
        }
      : null,
    // Which build this is: Xcode Cloud's number and commit (ci_post_clone.sh).
    build: process.env.NEXT_PUBLIC_BUILD_COMMIT
      ? [process.env.NEXT_PUBLIC_BUILD_NUMBER && `#${process.env.NEXT_PUBLIC_BUILD_NUMBER}`, process.env.NEXT_PUBLIC_BUILD_COMMIT]
          .filter(Boolean)
          .join(' · ')
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
  // Pictures go across once each, beside the state rather than in it.
  const unsent: Record<string, string> = {}
  for (const [name, picture] of Object.entries(flags)) {
    if (picture && !sentImages.current.has(name)) unsent[name] = picture
  }
  const unsentKey = Object.keys(unsent).join(',')

  // Present once, then keep the open sheet in step with every change.
  useEffect(() => {
    if (!ready) return
    const images = { ...unsent }
    for (const name of Object.keys(images)) sentImages.current.add(name)
    if (presented.current) {
      AccountSheet.update({ state: json, images }).catch((err) => console.error('[AccountSheet] update failed:', err))
      return
    }
    presented.current = true
    const rect = props.morphFrom?.()?.getBoundingClientRect()
    AccountSheet.present({
      state: json,
      images,
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
  }, [ready, json, unsentKey])

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
            // At once: the sheet holds a picture of the page as it was and
            // cross-fades it away itself, its glass and colours with it.
            setTheme(picked.id, { instant: true })
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

type Rgba = { r: number; g: number; b: number; a: number }

/** The web sheet's glass as the current theme draws it: the sheet's own fill
 *  and blur, its cards' fill and edge, its buttons' fill, and its solid colour
 *  under Reduce Transparency. Themes restyle these (Paper's frosted white,
 *  Rose Glass's tint, Obsidian's dark panel), so they are read off an unseen
 *  copy of the web sheet (manage-account-modal.tsx) rather than written down
 *  twice. */
function sheetLook(): { panel: Rgba; card: Rgba; cardEdge: Rgba; button: Rgba; solid: Rgba; blur: number } | null {
  if (typeof document === 'undefined') return null
  const probe = document.createElement('div')
  probe.className = 'fixed inset-0 z-50 flex items-end justify-center'
  probe.setAttribute('aria-hidden', 'true')
  Object.assign(probe.style, { visibility: 'hidden', pointerEvents: 'none' })
  probe.innerHTML =
    '<div class="relative w-full max-h-[85vh] bg-white/10 backdrop-blur-2xl rounded-t-3xl shadow-2xl flex flex-col">' +
    '<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15"></div>' +
    '<button class="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-2xl font-medium text-sm"></button>' +
    '</div>'
  document.body.appendChild(probe)
  try {
    const panel = probe.firstElementChild as HTMLElement
    const [card, button] = Array.from(panel.children) as HTMLElement[]
    const panelStyle = getComputedStyle(panel)
    const filter = panelStyle.backdropFilter || panelStyle.getPropertyValue('-webkit-backdrop-filter')
    const solid = getComputedStyle(document.documentElement).getPropertyValue('--lg-solid').trim()
    return {
      panel: rgba(panelStyle.backgroundColor),
      card: rgba(getComputedStyle(card).backgroundColor),
      cardEdge: rgba(getComputedStyle(card).borderTopColor),
      button: rgba(getComputedStyle(button).backgroundColor),
      solid: rgba(solid || 'rgb(52, 30, 22)'),
      blur: parseFloat(/blur\(([\d.]+)px\)/.exec(filter)?.[1] ?? '') || 12,
    }
  } finally {
    probe.remove()
  }
}

/** sheetLook for every theme, each read with its class on the page for an
 *  instant (one task, so nothing is painted in between), then put back. */
function themeLooks(): Record<string, ReturnType<typeof sheetLook>> {
  if (typeof document === 'undefined') return {}
  const root = document.documentElement
  const classes = (): string[] => Array.from(root.classList).filter((c) => c.startsWith('theme-'))
  const had = classes()
  const out: Record<string, ReturnType<typeof sheetLook>> = {}
  try {
    for (const item of THEMES) {
      root.classList.remove(...classes())
      if (item.id !== DEFAULT_THEME) root.classList.add(`theme-${item.id}`)
      out[item.id] = sheetLook()
    }
  } finally {
    root.classList.remove(...classes())
    root.classList.add(...had)
  }
  return out
}

// Any CSS colour (Tailwind's come as color-mix() and oklab) as sRGB 0–1, read
// off a pixel.
let pixel: CanvasRenderingContext2D | null = null
function rgba(colour: string): Rgba {
  pixel ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!pixel) return { r: 1, g: 1, b: 1, a: 0.1 }
  pixel.clearRect(0, 0, 1, 1)
  pixel.fillStyle = colour
  pixel.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data
  return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 }
}

/** UIImage can't read SVG, and the generated smiley face is one: draw it as a PNG. */
async function toNativeImage(src: string | null): Promise<string | null> {
  if (!src) return null
  if (!src.startsWith('data:image/svg')) return src
  return drawPng(src, 240)
}

/** A flag from the web's own flag set (lib/icons), drawn as a PNG for the
 *  native sheet: its SVGs use features iOS image assets can't. */
async function flagPicture(name: string): Promise<string | null> {
  const icon = getIcon(name)
  if (!icon) return null
  const { body, width, height, left, top } = icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="72" height="72" viewBox="${left} ${top} ${width} ${height}">${body}</svg>`
  return drawPng(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 72)
}

async function drawPng(src: string, size: number): Promise<string | null> {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d')?.drawImage(img, 0, 0, size, size)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}
