import React from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen } from '../app-ui/AppScreen'
import { TopicMenu } from '../app-ui/TopicMenu'
import { sectionIndex, topicWords, wordIndex } from '../app-ui/app-data'
import { LanguageChip } from '../components/LanguageChip'
import { LiquidGlass } from '../components/LiquidGlass'
import { rise } from '../components/SceneTransition'
import { ACCOUNT_SAMPLE } from '../data/sample'
import { COLOR, FONT } from '../theme'
import { Headline, PhoneOnStage, Stage, Subtitle, clamp01 } from './shared'

// Scene 4 — Your Language, Your Topics (390–539).
// The topic menu opens on DAILY LIFE; a swipe brings FIRST AID KIT, the
// app's home section, with the same drag, threshold and snap curve as
// TopicSlider. Directions is singled out and words from it appear — the
// app's own Directions words, French with English as the bridge. Then the
// camera pushes into the tile.

const DRAG_START = 30
const RELEASE = 39
const SNAP = Easing.bezier(0.25, 0.46, 0.45, 0.94) // the app's 300ms snap
const FOCUS = 54
const ZOOM = 120

// From Directions in public/data/vocabulary.json: "travel-related words"
// and "places for transportation".
const WORDS = ['ticket', 'train station', 'luggage', 'departure']

// Where the Directions tile sits in the phone (row 3, column 1 of FIRST AID
// KIT), as a fraction of the phone frame; the camera pushes in toward it.
const TILE_ORIGIN = '30.8% 55.3%'

export const S4Topics: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const daily = sectionIndex('DAILY LIFE')
  const firstAid = sectionIndex('FIRST AID KIT')

  // Finger drags right ~120pt, the strip follows it, then snaps on release.
  const dragPx = interpolate(frame, [DRAG_START, RELEASE], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  })
  const released = frame >= RELEASE
  const snap = SNAP(clamp01((frame - RELEASE) / (0.3 * fps)))
  const dragged = daily - dragPx / 440
  const position = released ? dragged + (firstAid - dragged) * snap : dragged
  const section = released ? firstAid : daily

  const focus = spring({ frame: frame - FOCUS, fps, config: { damping: 200 } })
  const zoom = interpolate(frame, [ZOOM, 150 + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })

  const directions = topicWords(4)
  const words = WORDS.map((w) => directions[wordIndex(4, w)])

  // Fingertip over the phone while it drags (screen space, phone at scale 1).
  const touchOn = frame >= DRAG_START - 3 && frame < RELEASE + 5
  const touchAlpha = interpolate(frame, [DRAG_START - 3, DRAG_START, RELEASE, RELEASE + 5], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <Stage glow={[{ x: 540, y: 960, size: 1500, strength: 0.7 }]}>
      <Headline lines={['Learn what', 'matters to you.']} frame={frame} fps={fps} delay={2} top={112} size={100} />
      <Subtitle text="Everyday vocabulary, organized around your life." frame={frame} fps={fps} delay={12} top={330} />

      <PhoneOnStage top={456} scale={1.1 + 0.6 * zoom} origin={TILE_ORIGIN}>
        <AppScreen>
          <TopicMenu
            section={section}
            position={position}
            iconTime={released ? Infinity : frame / fps}
            tileReveal={(i) => clamp01(spring({ frame: frame - 2 - i * 1.5, fps, config: { damping: 200 } }))}
            tile={{ topicId: 4, focus }}
            dimOthers={focus}
            account={ACCOUNT_SAMPLE}
            nativeLanguage="English"
            targetLanguage="French"
          />
        </AppScreen>
      </PhoneOnStage>

      {touchOn && (
        <div
          style={{
            position: 'absolute',
            left: 395 + dragPx - 24,
            top: 793,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 72%)',
            boxShadow: '0 0 0 1.5px rgba(255,255,255,0.45)',
            opacity: touchAlpha,
          }}
        />
      )}

      <div style={{ opacity: 1 - zoom }}>
        <div
          style={{
            position: 'absolute',
            top: 1548,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 22,
            ...rise(frame, fps, FOCUS + 6, { distance: 16 }),
          }}
        >
          <LanguageChip label="English" code="en" fontSize={28} />
          <span style={{ fontFamily: FONT.ui, fontSize: 34, color: COLOR.text2 }}>→</span>
          <LanguageChip label="Français" code="fr" fontSize={28} active={clamp01(focus)} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 1640,
            left: 70,
            right: 70,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          {words.map((w, i) => (
            <div key={w.native} style={rise(frame, fps, FOCUS + 14 + i * 7, { distance: 22 })}>
              <LiquidGlass radius={30} fill={0.07} style={{ padding: '20px 28px' }}>
                <div style={{ fontFamily: FONT.app, fontSize: 40, fontWeight: 600, color: COLOR.text, lineHeight: 1.1 }}>{w.target}</div>
                <div style={{ fontFamily: FONT.ui, fontSize: 25, color: COLOR.text2, marginTop: 6 }}>{w.native}</div>
              </LiquidGlass>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  )
}
