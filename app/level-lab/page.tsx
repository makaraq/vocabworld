"use client"
// Dev-only route: the levelling system, live. Every button fires the same
// engine call the app makes for that event (lib/leveling/engine.ts) against a
// sandbox user, so the toasts, level-ups and the account card below are the
// real ones. The chart plays the XP rules out over a year for three kinds of
// learner. Not linked from anywhere in the app.
import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import { LevelCard, useLevelXp } from "@/components/leveling/level-card"
import { LevelAvatar } from "@/components/leveling/level-avatar"
import {
  BADGE_XP,
  DAILY_GOAL_WORDS,
  DAILY_REPEAT_CAP,
  PERSONAS,
  RANKS,
  XP_BASE,
  comboMultiplier,
  levelInfo,
  rankForLevel,
  simulateLearner,
  streakMultiplier,
  xpForLevel,
} from "@/lib/leveling/definitions"
import { awardWordXp, awardXp, resetLevel, setLevelUser, setXp } from "@/lib/leveling/engine"
import { avatarSeedFor, resolveAvatar } from "@/lib/avatars/smiley-avatar"

const LAB_USER = "level-lab"
const PERSONA_COLORS = ["#60a5fa", "#34d399", "#f472b6"]

export default function LevelLab() {
  const avatar = useMemo(() => resolveAvatar(null, avatarSeedFor("sprind-level-lab")), [])
  const xp = useLevelXp(LAB_USER)
  const info = levelInfo(xp)
  const [streak, setStreak] = useState(7)
  const [wordsToday, setWordsToday] = useState(0)
  const [jump, setJump] = useState(19)
  const burstRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    setLevelUser(LAB_USER, { src: avatar, initials: "ME" })
    return () => clearInterval(burstRef.current)
  }, [avatar])

  const word = () => {
    const n = wordsToday + 1
    setWordsToday(n)
    awardWordXp(LAB_USER, { streak, wordsToday: n, targetLanguageCode: "es" })
  }
  const tenWords = () => {
    clearInterval(burstRef.current)
    let i = 0
    let n = wordsToday
    burstRef.current = setInterval(() => {
      n++
      setWordsToday(n)
      awardWordXp(LAB_USER, { streak, wordsToday: n, targetLanguageCode: "es" })
      if (++i >= 10) clearInterval(burstRef.current)
    }, 260)
  }
  /** Sit just under `level` and earn the last few XP, so its level-up plays. */
  const levelUpInto = (level: number) => {
    setXp(LAB_USER, xpForLevel(level) - 3)
    setTimeout(() => awardXp(LAB_USER, "topic", { amount: 3 + Math.floor(Math.random() * 20) }), 50)
  }

  const actions: { label: string; icon: string; xp: string; run: () => void }[] = [
    { label: "Learn a word", icon: "solar:headphones-round-bold", xp: `+${XP_BASE.word}`, run: word },
    { label: "Learn 10 in a row", icon: "solar:bolt-bold", xp: `+${XP_BASE.word * 10}`, run: tenWords },
    { label: "Replay a word", icon: "solar:repeat-bold", xp: `+${XP_BASE.word_repeat}`, run: () => awardXp(LAB_USER, "word_repeat", { streak }) },
    { label: "Finish a topic", icon: "solar:check-circle-bold", xp: `+${XP_BASE.topic}`, run: () => awardXp(LAB_USER, "topic") },
    { label: "Quiz: right answer", icon: "solar:question-circle-bold", xp: `+${XP_BASE.quiz_correct}`, run: () => awardXp(LAB_USER, "quiz_correct", { streak }) },
    { label: "Quiz: perfect round", icon: "solar:star-bold", xp: `+${XP_BASE.quiz_perfect}`, run: () => awardXp(LAB_USER, "quiz_perfect") },
    { label: "Review: remembered", icon: "solar:brain-bold", xp: `+${XP_BASE.review_correct}`, run: () => awardXp(LAB_USER, "review_correct", { streak }) },
    { label: "Review: forgot", icon: "solar:ghost-bold", xp: `+${XP_BASE.review_miss}`, run: () => awardXp(LAB_USER, "review_miss", { streak }) },
    { label: "Gold badge", icon: "solar:cup-star-bold", xp: `+${BADGE_XP.gold}`, run: () => awardXp(LAB_USER, "badge", { amount: BADGE_XP.gold }) },
    { label: "Diamond badge", icon: "solar:crown-star-bold", xp: `+${BADGE_XP.diamond}`, run: () => awardXp(LAB_USER, "badge", { amount: BADGE_XP.diamond }) },
    { label: "Start a new language", icon: "solar:global-bold", xp: `+${XP_BASE.language}`, run: () => awardXp(LAB_USER, "language") },
    { label: "New day", icon: "solar:sun-2-bold", xp: "resets daily", run: () => { setWordsToday(0); setStreak((s) => s + 1); clearDay() } },
  ]

  return (
    <div
      className="min-h-screen text-white pb-24"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #4c1d95 0%, #1e1b4b 45%, #0b0a1f 100%)" }}
    >
      <div className="max-w-md mx-auto px-4">
        <header className="pt-8 pb-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Sprind</p>
          <h1 className="text-3xl font-black mt-1">Level Lab</h1>
          <p className="text-white/60 text-sm mt-2">
            Tap anything below. Every button is the real engine call the app makes for that moment.
          </p>
        </header>

        {/* The account sheet's card, live */}
        <Section title="Your account card" hint="Exactly what Manage Account shows. Tap a border to try it on.">
          <LevelCard userId={LAB_USER} name="You" email="learner@sprind.uk" avatarSrc={avatar} initials="ME" />
        </Section>

        {/* Earn XP */}
        <Section title="Earn XP" hint={`Day streak ${streak} → ×${streakMultiplier(streak).toFixed(2)} on words, quizzes and reviews. Chain right answers within 45s for up to ×${comboMultiplier(11).toFixed(1)} more.`}>
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="solar:fire-bold" className="text-orange-400" width="18" />
            <input type="range" min={0} max={40} value={streak} onChange={(e) => setStreak(+e.target.value)} className="flex-1 accent-orange-400" />
            <span className="w-14 text-right text-sm font-bold tabular-nums">{streak} days</span>
          </div>
          <div className="text-[11px] text-white/50 mb-3">
            Words today: <b className="text-white">{wordsToday}</b> / {DAILY_GOAL_WORDS} — the daily-goal bonus fires at {DAILY_GOAL_WORDS}.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.run}
                className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-3 py-3 text-left active:scale-[0.97] transition-transform"
              >
                <Icon icon={a.icon} width="20" className="text-white/80 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{a.label}</span>
                  <span className="block text-[11px] text-emerald-300 font-bold">{a.xp}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* Jump */}
        <Section title="Time machine" hint="Skip ahead and watch the level-up for any level.">
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={99} value={jump} onChange={(e) => setJump(+e.target.value)} className="flex-1 accent-fuchsia-400" />
            <span className="w-10 text-right font-bold tabular-nums">{jump}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => levelUpInto(jump + 1)} className="rounded-full py-2.5 font-bold text-black bg-gradient-to-r from-fuchsia-300 to-amber-200">
              Level up to {jump + 1}
            </button>
            <button onClick={() => setXp(LAB_USER, xpForLevel(jump))} className="rounded-full py-2.5 font-semibold bg-white/10 border border-white/20">
              Set to level {jump}
            </button>
          </div>
          <button onClick={() => { resetLevel(LAB_USER); setWordsToday(0) }} className="w-full mt-2 rounded-full py-2 text-sm text-white/60 border border-white/10">
            Reset to level 1
          </button>
          <p className="text-[11px] text-white/45 mt-3 tabular-nums">
            Now: level {info.level} · {xp.toLocaleString()} XP total · level {jump} needs {xpForLevel(jump).toLocaleString()} XP
          </p>
        </Section>

        {/* Borders */}
        <Section title="All 13 borders" hint="Each one is a new title. Tap to play its level-up.">
          <div className="grid grid-cols-2 gap-3">
            {RANKS.map((r) => (
              <button
                key={r.id}
                onClick={() => levelUpInto(r.minLevel)}
                className="rounded-3xl bg-black/25 border border-white/10 pt-9 pb-4 flex flex-col items-center gap-3 overflow-hidden active:scale-[0.98] transition-transform"
                style={{ ["--c" as string]: r.color, ["--a" as string]: r.accent }}
              >
                <LevelAvatar level={r.minLevel} border={r.id} size={84} src={avatar} initials="ME" />
                <span className="mt-2 text-center">
                  <span className="lvl-shiny-text block font-extrabold text-sm">{r.title}</span>
                  <span className="block text-[11px] text-white/50">Level {r.minLevel}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>

        <PersonaChart />

        {/* Rules */}
        <Section title="Where XP comes from" hint="×streak grows with your day streak. ×combo grows with right answers in a row.">
          <table className="w-full text-[13px]">
            <tbody>
              {[
                ["New word heard through", XP_BASE.word, "×streak"],
                [`Replay a learned word (max ${DAILY_REPEAT_CAP}/day)`, XP_BASE.word_repeat, ""],
                ["First word of the day", XP_BASE.first_word, ""],
                [`Daily goal (${DAILY_GOAL_WORDS} words)`, XP_BASE.daily_goal, ""],
                ["Topic completed (first time)", XP_BASE.topic, ""],
                ["Quiz right answer", XP_BASE.quiz_correct, "×streak ×combo"],
                ["Quiz perfect round", XP_BASE.quiz_perfect, ""],
                ["Review remembered", XP_BASE.review_correct, "×streak ×combo"],
                ["Review forgotten", XP_BASE.review_miss, "×streak"],
                ["New language", XP_BASE.language, ""],
                ["Badge: bronze / silver / gold", `${BADGE_XP.bronze} / ${BADGE_XP.silver} / ${BADGE_XP.gold}`, ""],
                ["Badge: platinum / diamond", `${BADGE_XP.platinum} / ${BADGE_XP.diamond}`, ""],
                ["Any language badge", BADGE_XP.bronze, ""],
              ].map(([label, amount, mult]) => (
                <tr key={label as string} className="border-b border-white/5">
                  <td className="py-2 text-white/75">{label}</td>
                  <td className="py-2 text-right font-bold tabular-nums">+{amount}</td>
                  <td className="py-2 pl-2 text-right text-[10px] text-orange-300 w-16">{mult}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-white/45 mt-3">
            Level n needs 50·(n−1)·(n+6) XP in total: level 2 at {xpForLevel(2).toLocaleString()}, 10 at {xpForLevel(10).toLocaleString()}, 50 at {xpForLevel(50).toLocaleString()}, 100 at {xpForLevel(100).toLocaleString()}.
            Existing learners are back-paid for the words, topics and badges they already have the first time they open the app.
          </p>
        </Section>
      </div>
    </div>
  )
}

function clearDay() {
  try {
    const k = "vw_level_v1::" + LAB_USER
    const s = JSON.parse(localStorage.getItem(k) || "{}")
    s.firstWordDay = ""
    s.goalDay = ""
    s.repeatDay = ""
    localStorage.setItem(k, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {hint && <p className="text-white/50 text-xs mt-0.5 mb-3">{hint}</p>}
      <div className="rounded-3xl bg-white/[0.07] border border-white/10 p-3 backdrop-blur-xl">{children}</div>
    </section>
  )
}

function PersonaChart() {
  const DAYS = 365
  const runs = useMemo(() => PERSONAS.map((p) => simulateLearner(p, DAYS)), [])
  const W = 340
  const H = 220
  const pad = { l: 28, r: 8, t: 8, b: 22 }
  const x = (d: number) => pad.l + ((d - 1) / (DAYS - 1)) * (W - pad.l - pad.r)
  const y = (lvl: number) => pad.t + (1 - (lvl - 1) / 99) * (H - pad.t - pad.b)
  const [hover, setHover] = useState<number | null>(null)

  return (
    <Section title="A year of learning, simulated" hint="Three kinds of learner played out day by day with the real XP rules. Drag across the chart.">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          setHover(Math.max(1, Math.min(DAYS, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (DAYS - 1) + 1))))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {RANKS.slice(1).map((r) => (
          <g key={r.id}>
            <line x1={pad.l} x2={W - pad.r} y1={y(r.minLevel)} y2={y(r.minLevel)} stroke={r.color} strokeOpacity=".18" strokeDasharray="2 3" />
            <text x={pad.l - 4} y={y(r.minLevel) + 3} fontSize="7" fill={r.color} textAnchor="end" opacity=".8">{r.minLevel}</text>
          </g>
        ))}
        {[1, 90, 180, 270, 365].map((d) => (
          <text key={d} x={x(d)} y={H - 6} fontSize="8" fill="rgba(255,255,255,.45)" textAnchor="middle">
            {d === 1 ? "day 1" : `${d}`}
          </text>
        ))}
        {runs.map((run, i) => (
          <polyline
            key={i}
            fill="none"
            stroke={PERSONA_COLORS[i]}
            strokeWidth="2"
            strokeLinejoin="round"
            points={run.map((d) => `${x(d.day).toFixed(1)},${y(d.level).toFixed(1)}`).join(" ")}
          />
        ))}
        {hover && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#fff" strokeOpacity=".4" />
            {runs.map((run, i) => (
              <circle key={i} cx={x(hover)} cy={y(run[hover - 1].level)} r="3.5" fill={PERSONA_COLORS[i]} stroke="#fff" strokeWidth="1" />
            ))}
          </>
        )}
      </svg>
      <div className="space-y-2 mt-2">
        {PERSONAS.map((p, i) => {
          const d = runs[i][(hover ?? DAYS) - 1]
          const rank = rankForLevel(d.level)
          return (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PERSONA_COLORS[i] }} />
              <span className="flex-1 text-white/70">{p.label}</span>
              <span className="font-bold tabular-nums">Lv {d.level}</span>
              <span className="w-24 text-right truncate" style={{ color: rank.color }}>{rank.title}</span>
            </div>
          )
        })}
        <p className="text-[11px] text-white/45 tabular-nums">{hover ? `Day ${hover}` : `After ${DAYS} days`}</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-white/45">
              <th className="text-left font-semibold py-1">Border</th>
              {PERSONAS.map((p, i) => (
                <th key={p.id} className="text-right font-semibold" style={{ color: PERSONA_COLORS[i] }}>{p.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RANKS.slice(1).map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-1" style={{ color: r.color }}>{r.title} <span className="text-white/35">({r.minLevel})</span></td>
                {runs.map((run, i) => {
                  const hit = run.find((d) => d.level >= r.minLevel)
                  return <td key={i} className="text-right text-white/75">{hit ? `day ${hit.day}` : "—"}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
