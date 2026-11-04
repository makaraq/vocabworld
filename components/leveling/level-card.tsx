"use client"

// The account sheet's top card: your avatar in its border, your title, your
// level and the XP bar, then every border in a row — earned ones lit, the
// rest locked with the level they come at. Tapping a border shows it on
// your avatar for a moment, so the next one is always something to want.

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Icon } from "@iconify/react"
import { useT } from "@/components/providers/translation-provider"
import { haptic } from "@/lib/haptics"
import { RANKS, levelInfo, nextRank, rankForLevel, type BorderId } from "@/lib/leveling/definitions"
import { getLevelState, subscribeLevelChange } from "@/lib/leveling/engine"
import { LevelAvatar } from "./level-avatar"

/** Live total XP for a user; re-renders on every gain. */
export function useLevelXp(userId: string | null | undefined): number {
  return useSyncExternalStore(
    subscribeLevelChange,
    () => getLevelState(userId).xp,
    () => 0,
  )
}

interface LevelCardProps {
  userId: string | null | undefined
  name: string
  email?: string
  avatarSrc?: string | null
  initials: string
}

export function LevelCard({ userId, name, email, avatarSrc, initials }: LevelCardProps) {
  const { t } = useT()
  const xp = useLevelXp(userId)
  const info = levelInfo(xp)
  const rank = rankForLevel(info.level)
  const next = nextRank(info.level)
  const [preview, setPreview] = useState<BorderId | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const shown = preview ? RANKS.find((r) => r.id === preview)! : rank

  // The bar fills from empty when the sheet opens.
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFill(info.progress))
    return () => cancelAnimationFrame(raf)
  }, [info.progress])
  useEffect(() => () => clearTimeout(previewTimer.current), [])

  const tryOn = (id: BorderId) => {
    haptic.tap()
    clearTimeout(previewTimer.current)
    setPreview(id === rank.id ? null : id)
    if (id !== rank.id) previewTimer.current = setTimeout(() => setPreview(null), 2600)
  }

  return (
    <div
      className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 overflow-hidden"
      style={{ ["--c" as string]: shown.color, ["--a" as string]: shown.accent }}
    >
      <div className="relative p-4 pt-5 flex items-center gap-5">
        <div className="relative flex-shrink-0 mx-4 my-3">
          <LevelAvatar level={info.level} border={shown.id} size={72} src={avatarSrc} initials={initials} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-base truncate">{name}</p>
          {email && email !== name && <p className="text-white/55 text-xs truncate">{email}</p>}
          <p className="lvl-shiny-text font-extrabold text-sm mt-1 truncate">
            {t(`level.rank.${shown.id}`)}
            {preview && <span className="text-white/50 font-semibold"> · {t("level.preview")}</span>}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-white font-bold text-sm">{t("level.label", { level: info.level })}</span>
          <span className="text-white/55 text-xs tabular-nums">
            {info.span > 0 ? `${info.intoLevel.toLocaleString()} / ${info.span.toLocaleString()} XP` : t("level.maxed")}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-black/30 overflow-hidden border border-white/10">
          <div
            className="lvl-bar-fill h-full rounded-full"
            style={{
              width: `${Math.max(3, fill * 100)}%`,
              background: `linear-gradient(90deg, ${rank.accent}, ${rank.color})`,
              boxShadow: `0 0 10px ${rank.color}`,
              transition: "width 1.1s cubic-bezier(.2,.8,.2,1)",
            }}
          />
        </div>
        {info.span > 0 && (
          <p className="text-white/45 text-[11px] mt-1.5">
            {t("level.xpToNext", { xp: info.toNext.toLocaleString(), level: info.level + 1 })}
            {next && <> · {t("level.nextBorder", { title: t(`level.rank.${next.id}`), level: next.minLevel })}</>}
          </p>
        )}
      </div>

      <div className="border-t border-white/10 pt-3 pb-3.5">
        <div className="flex items-center gap-1.5 px-4 mb-2">
          <Icon icon="solar:medal-ribbons-star-bold" width="14" className="text-white/60" />
          <span className="text-white/70 text-xs font-semibold">{t("level.borders")}</span>
          <span className="text-white/40 text-xs">
            {RANKS.filter((r) => r.minLevel <= info.level).length}/{RANKS.length}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-1 pt-3" style={{ scrollbarWidth: "none" }}>
          {RANKS.map((r) => {
            const owned = r.minLevel <= info.level
            const active = shown.id === r.id
            return (
              <button
                key={r.id}
                onClick={() => tryOn(r.id)}
                className={`flex-shrink-0 w-[68px] flex flex-col items-center gap-2 rounded-xl py-2 transition-colors ${active ? "bg-white/10" : ""}`}
                aria-label={t(`level.rank.${r.id}`)}
              >
                <div className={`relative ${owned ? "" : "opacity-45 grayscale"}`}>
                  <LevelAvatar level={r.minLevel} border={r.id} size={40} src={avatarSrc} initials={initials} showLevel={false} animated={active} />
                  {!owned && (
                    <span className="absolute inset-0 z-10 flex items-center justify-center">
                      <Icon icon="solar:lock-keyhole-bold" width="16" className="text-white drop-shadow" />
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-tight text-center ${owned ? "text-white/80" : "text-white/40"}`}>
                  {t("level.unlockAt", { level: r.minLevel })}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
