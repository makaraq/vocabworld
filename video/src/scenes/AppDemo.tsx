import React from 'react'
import { Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen, dipStyle } from '../app-ui/AppScreen'
import { ExampleSentencesModal } from '../app-ui/ExampleSentencesModal'
import { LanguagePicker } from '../app-ui/LanguagePicker'
import { LeaderboardModal } from '../app-ui/LeaderboardModal'
import { LearningView } from '../app-ui/LearningView'
import { PlaylistSelectModal } from '../app-ui/PlaylistSelectModal'
import { SettingsModal, type SettingsState, type Speed } from '../app-ui/SettingsModal'
import { TopicCompleteModal } from '../app-ui/TopicCompleteModal'
import { TopicMenu } from '../app-ui/TopicMenu'
import { sectionIndex, topicById, topicDisplayName, topicWords } from '../app-ui/app-data'
import { pulseOpacity } from '../app-ui/motion'
import { getTopicIcon } from '../app-ui/topic-icons'
import { ACCOUNT_SAMPLE } from '../data/sample'
import { GAUCHE_SENTENCES, LEADERBOARD, PLAYLISTS } from '../data/demo'
import { CAPTIONS, DEMO, T } from '../timeline'
import { COLOR, FONT } from '../theme'
import { PhoneOnStage, Stage, autoplayAt, autoplayIntervals, cardScale, clamp01 } from './shared'

// The app, as one continuous session on one phone: pick French, look round
// the topic menu, open Directions, let autoplay run through its first four
// words, slow the voice down and speed it up, go back to the first word and
// long-press it for example sentences, save it to a playlist, finish the
// topic, look at progress and the leaderboard. Everything on the phone is
// the app's own screen; captions above say what is happening.

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const SNAP = Easing.bezier(0.25, 0.46, 0.45, 0.94) // the menu's 300ms snap

/** A fingertip, 0 → 1 over `length` frames from `at`; undefined otherwise. */
const touchAt = (g: number, at: number, length = 14) => (g >= at && g < at + length ? (g - at) / length : undefined)

/** A press that lands, holds and lets go: 0 → 1 → 0. */
const pressAt = (g: number, at: number, hold = 5) =>
  interpolate(g, [at, at + 3, at + 3 + hold, at + 7 + hold], [0, 1, 1, 0], clamp)

/** The app's page dip before `swap`: 200ms down, then the new page. */
const dipBefore = (g: number, swap: number) => (g < swap && g >= swap - 6 ? (g - (swap - 6)) / 6 : 0)

const directions = topicById(4)
const directionsWords = topicWords(4)

/** How far the settings panel scrolls: from the top to Done, at the bottom. */
const SETTINGS_SCROLL = 345

const BASE_SETTINGS: SettingsState = {
  autoPlay: true,
  playTargetOnly: false,
  showPhonetics: true,
  showPlayCount: true,
  rewindEnabled: false,
  pronunciationSpeed: 'Normal',
  pauseBetweenTranslations: 1,
  pauseForNextWord: 1.5,
  repeatTargetLanguage: 2,
  repeatMainLanguage: 1,
}

const Caption: React.FC<{ g: number; fps: number }> = ({ g, fps }) => {
  const caption = CAPTIONS.find((c) => g >= c.from && g < c.to)
  if (!caption) return null
  const enter = spring({ frame: g - caption.from, fps, config: { damping: 16, stiffness: 170 } })
  const exit = interpolate(g, [caption.to - 5, caption.to], [1, 0], clamp)
  const i = caption.text.indexOf(caption.accent)
  return (
    <div
      style={{
        position: 'absolute',
        top: 96,
        left: 60,
        right: 60,
        textAlign: 'center',
        whiteSpace: 'pre-line',
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: 68,
        lineHeight: 1.06,
        letterSpacing: '-0.03em',
        color: COLOR.text,
        opacity: Math.min(1, enter * 1.3) * exit,
        transform: `translateY(${(1 - enter) * 30}px)`,
      }}
    >
      {caption.text.slice(0, i)}
      <span style={{ color: COLOR.amberSoft }}>{caption.accent}</span>
      {caption.text.slice(i + caption.accent.length)}
    </div>
  )
}

export const AppDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const g = frame + DEMO.from // master-timeline frame

  // Camera: the phone's screen starts filling the frame, straight out of
  // the hook's backdrop, and settles; at the end it steps back for the card.
  const settle = spring({ frame, fps, config: { damping: 200, mass: 1.1 } })
  const out = interpolate(g, [806, 822], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })
  const scale = (2.45 + (1.66 - 2.45) * settle) * (1 - 0.12 * out)

  let screen: React.ReactNode
  let overlay: React.ReactNode = null

  if (g < T.menu) {
    // ── Pick a language ──────────────────────────────────────────────
    screen = (
      <LanguagePicker
        question="I want to learn"
        exclude="en"
        holding={{
          code: 'fr',
          press: interpolate(g, [T.tapFrench + 2, T.tapFrench + 5, T.releaseFrench, T.releaseFrench + 4], [0, 1, 1, 0], clamp),
          touch: touchAt(g, T.tapFrench),
        }}
        contentStyle={dipStyle(dipBefore(g, T.menu))}
      />
    )
  } else if (g < T.learning) {
    // ── The topic menu: a look at DAILY LIFE, back, open Directions ──
    const firstAid = sectionIndex('FIRST AID KIT')
    const daily = sectionIndex('DAILY LIFE')
    const dragLeft = interpolate(g, [T.swipeLeft, T.swipeLeftRelease], [0, 110], { ...clamp, easing: Easing.inOut(Easing.quad) })
    const dragRight = interpolate(g, [T.swipeRight, T.swipeRightRelease], [0, 110], { ...clamp, easing: Easing.inOut(Easing.quad) })
    let position: number
    let section: number
    if (g < T.swipeLeftRelease) {
      position = firstAid + dragLeft / 440
      section = firstAid
    } else if (g < T.swipeRight) {
      const from = firstAid + 110 / 440
      position = from + (daily - from) * SNAP(clamp01((g - T.swipeLeftRelease) / 9))
      section = daily
    } else if (g < T.swipeRightRelease) {
      position = daily - dragRight / 440
      section = daily
    } else {
      const from = daily - 110 / 440
      position = from + (firstAid - from) * SNAP(clamp01((g - T.swipeRightRelease) / 9))
      section = firstAid
    }
    screen = (
      <TopicMenu
        section={section}
        position={position}
        iconTime={section === daily ? (g - T.swipeLeftRelease) / fps : Infinity}
        tile={{
          topicId: directions.id,
          pressed: interpolate(g, [T.tapDirections + 2, T.tapDirections + 4, T.releaseDirections, T.releaseDirections + 3], [0, 1, 1, 0], clamp),
          touch: touchAt(g, T.tapDirections),
        }}
        account={ACCOUNT_SAMPLE}
        nativeLanguage="English"
        targetLanguage="French"
        contentStyle={dipStyle(dipBefore(g, T.learning))}
        swipeTouch={
          g >= T.swipeLeft - 2 && g < T.swipeLeftRelease + 3
            ? { x: 260 - dragLeft, opacity: interpolate(g, [T.swipeLeft - 2, T.swipeLeft, T.swipeLeftRelease, T.swipeLeftRelease + 3], [0, 1, 1, 0], clamp) }
            : g >= T.swipeRight - 2 && g < T.swipeRightRelease + 3
            ? { x: 150 + dragRight, opacity: interpolate(g, [T.swipeRight - 2, T.swipeRight, T.swipeRightRelease, T.swipeRightRelease + 3], [0, 1, 1, 0], clamp) }
            : undefined
        }
      />
    )
  } else if (g < T.complete) {
    // ── Learning: autoplay, settings, examples, playlist ─────────────
    const timing = { start: T.autoplay, ...T.autoplayTiming }
    const play = autoplayAt(g, timing)
    const autoplaying = g >= T.autoplay && g < T.stopped
    const back = T.tapPrev.filter((at) => g >= at + 3).length
    const index = autoplaying ? Math.min(T.autoplayWords - 1, play.word) : g < T.autoplay ? 0 : T.autoplayWords - 1 - back
    const { target, native } = autoplayIntervals(timing, T.autoplayWords)
    const holding = g >= T.longPress && g < T.examples
    const speed: Speed = g >= T.tapFast + 3 ? 'Fast' : g >= T.tapSlow + 3 ? 'Slow' : 'Normal'

    screen = (
      <LearningView
        topic={directions}
        word={directionsWords[index]}
        index={index}
        total={directionsWords.length}
        targetLanguage="French"
        nativeLanguage="English"
        audioStep={autoplaying ? play.step : 'idle'}
        playing={g >= T.autoplay - 2 && g < T.stopped}
        cardScale={[holding ? 1.03 : cardScale(g, target), cardScale(g, native)]}
        pulse={pulseOpacity(g, fps)}
        playPress={Math.max(pressAt(g, T.tapPlay), pressAt(g, T.tapStop))}
        playTouch={touchAt(g, T.tapPlay) ?? touchAt(g, T.tapStop)}
        settingsPress={pressAt(g, T.tapGear)}
        settingsTouch={touchAt(g, T.tapGear)}
        prevPress={Math.max(...T.tapPrev.map((at) => pressAt(g, at, 1)))}
        prevTouch={T.tapPrev.map((at) => touchAt(g, at, 6)).find((t) => t !== undefined)}
        cardTouch={holding ? (g - T.longPress) / (T.examples - T.longPress + 4) : undefined}
        callout={
          g >= T.autoplay && g < T.stopped + 4
            ? { opacity: interpolate(g, [T.autoplay, T.autoplay + 6, T.stopped, T.stopped + 4], [0, 1, 1, 0], clamp), frame: g }
            : undefined
        }
        wordOpacity={autoplaying ? Math.min(1, play.wordFrame / 3) : 1}
      />
    )

    if (g >= T.settings && g < T.settingsClosed) {
      overlay = (
        <SettingsModal
          settings={{ ...BASE_SETTINGS, pronunciationSpeed: speed }}
          scroll={interpolate(g, [T.scrollFrom, T.scrollTo], [0, SETTINGS_SCROLL], { ...clamp, easing: Easing.inOut(Easing.cubic) })}
          touch={
            touchAt(g, T.tapSlow) !== undefined
              ? { target: 'Slow', t: touchAt(g, T.tapSlow)!, press: pressAt(g, T.tapSlow) }
              : touchAt(g, T.tapFast) !== undefined
              ? { target: 'Fast', t: touchAt(g, T.tapFast)!, press: pressAt(g, T.tapFast) }
              : touchAt(g, T.tapDone, 8) !== undefined
              ? { target: 'done', t: touchAt(g, T.tapDone, 8)!, press: pressAt(g, T.tapDone, 1) }
              : undefined
          }
        />
      )
    } else if (g >= T.examples && g < T.playlist) {
      overlay = (
        <ExampleSentencesModal
          sourceWord={directionsWords[0].target}
          targetWord={directionsWords[0].native}
          sentences={GAUCHE_SENTENCES}
          index={g >= T.tapNext + 3 ? 1 : 0}
          visible={interpolate(g, [T.examples, T.examples + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })}
          touch={
            touchAt(g, T.tapNext, 10) !== undefined
              ? { target: 'next', t: touchAt(g, T.tapNext, 10)!, press: pressAt(g, T.tapNext, 1) }
              : touchAt(g, T.tapAdd, 6) !== undefined
              ? { target: 'playlist', t: touchAt(g, T.tapAdd, 6)!, press: pressAt(g, T.tapAdd, 1) }
              : undefined
          }
        />
      )
    } else if (g >= T.playlist && g < T.playlistClosed) {
      // From the example sentences: the English word, then the French.
      overlay = (
        <PlaylistSelectModal
          word={directionsWords[0].native}
          translation={directionsWords[0].target}
          playlists={PLAYLISTS}
          adding={g >= T.tapRow + 2 && g < T.added ? 'paris' : undefined}
          addedTo={g >= T.added ? 'paris' : undefined}
          touch={touchAt(g, T.tapRow) !== undefined ? { id: 'paris', t: touchAt(g, T.tapRow)! } : undefined}
        />
      )
    }
  } else if (g < T.progress) {
    // ── Topic complete, on the last word of Directions ───────────────
    const last = directionsWords.length - 1
    const travel = topicById(18)
    const close = interpolate(g, [T.progress - 6, T.progress], [1, 0], clamp)
    screen = (
      <LearningView
        topic={directions}
        word={directionsWords[last]}
        index={last}
        total={directionsWords.length}
        targetLanguage="French"
        nativeLanguage="English"
        audioStep="idle"
        playing={false}
        cardScale={[1, 1]}
        pulse={1}
      />
    )
    overlay = (
      <Sequence from={T.complete - DEMO.from} layout="none" name="Topic complete">
        <TopicCompleteModal
          topicName={topicDisplayName(directions)}
          congrats="Great job — you conquered"
          nextTopic={{ name: topicDisplayName(travel), icon: getTopicIcon(travel.id) }}
          shown={interpolate(g, [T.complete, T.complete + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) * close}
        />
      </Sequence>
    )
  } else {
    // ── Progress, then the leaderboard ───────────────────────────────
    const count = interpolate(g, [T.progress + 2, T.progress + 34], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
    const n = (v: number) => Math.round(v * count)
    screen = (
      <TopicMenu
        section={sectionIndex('ACCOUNT')}
        iconTime={(g - T.progress) / fps}
        account={{
          ...ACCOUNT_SAMPLE,
          percentage: ACCOUNT_SAMPLE.percentage * count,
          wordsLearned: n(ACCOUNT_SAMPLE.wordsLearned),
          streak: n(ACCOUNT_SAMPLE.streak),
          wordsToday: n(ACCOUNT_SAMPLE.wordsToday),
          dueCount: n(ACCOUNT_SAMPLE.dueCount),
          badgesUnlocked: n(ACCOUNT_SAMPLE.badgesUnlocked),
        }}
        nativeLanguage="English"
        targetLanguage="French"
        leaderboardTouch={touchAt(g, T.tapLeaderboard)}
      />
    )
    if (g >= T.leaderboard) {
      overlay = (
        <LeaderboardModal
          entries={LEADERBOARD}
          targetLanguageCode="fr"
          targetLanguageName="French"
          shown={interpolate(g, [T.leaderboard, T.leaderboard + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })}
        />
      )
    }
  }

  return (
    <Stage glow={[{ x: 540, y: 1100, size: 1600, strength: 0.8 }]}>
      <div style={{ opacity: 1 - out }}>
        <PhoneOnStage top={577} scale={scale} origin="center center">
          <AppScreen overlay={overlay}>{screen}</AppScreen>
        </PhoneOnStage>
      </div>
      <Caption g={g} fps={fps} />
    </Stage>
  )
}
