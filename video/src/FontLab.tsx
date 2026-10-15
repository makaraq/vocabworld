import React from 'react'
import { AbsoluteFill, delayRender, continueRender, staticFile } from 'remotion'
import { AppScreen } from './app-ui/AppScreen'
import { LanguagePicker } from './app-ui/LanguagePicker'
import { LearningView } from './app-ui/LearningView'
import { SettingsModal } from './app-ui/SettingsModal'
import { TopicMenu } from './app-ui/TopicMenu'
import { sectionIndex, topicById, topicWords } from './app-ui/app-data'
import { ACCOUNT_SAMPLE } from './data/sample'
import { LAB_FACES } from './generated/lab-fonts'
import { PHONE } from './theme'

// The font lab: four of the app's real screens side by side, set in the font
// passed as a prop (npx remotion still FontLab --props='{"font":"Sora"}').
// Not part of the film; scripts/font-lab.sh renders every candidate.

export const LAB_SCREENS = ['picker', 'menu', 'learning', 'settings'] as const

export const FontLab: React.FC<{ font: string }> = ({ font }) => {
  const [handle] = React.useState(() => delayRender('lab font'))
  React.useEffect(() => {
    const faces = LAB_FACES.filter((f) => f.family === font)
    Promise.all(
      faces.map((f) => {
        const face = new FontFace(font, `url(${staticFile(`fonts-lab/${f.file}`)})`, {
          weight: f.weight,
          unicodeRange: f.unicodeRange,
        })
        return face.load().then((l) => document.fonts.add(l))
      }),
    )
      .catch(() => undefined)
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
  }, [font, handle])

  const directions = topicById(4)
  const words = topicWords(4)
  const learning = (
    <LearningView
      topic={directions}
      word={words[0]}
      index={0}
      total={words.length}
      targetLanguage="French"
      nativeLanguage="English"
      audioStep="training"
      playing
      cardScale={[1.05, 1]}
      pulse={1}
      callout={{ opacity: 1, frame: 10 }}
    />
  )
  return (
    <AbsoluteFill style={{ flexDirection: 'row', background: '#000' }}>
      <style>{`.lab .app-ui, .lab .app-ui * { font-family: "${font}", "Noto Sans IPA", sans-serif !important; }`}</style>
      <div className="lab" style={{ display: 'flex' }}>
        <AppScreen>
          <LanguagePicker question="I want to learn" exclude="en" />
        </AppScreen>
        <AppScreen>
          <TopicMenu section={sectionIndex('FIRST AID KIT')} account={ACCOUNT_SAMPLE} nativeLanguage="English" targetLanguage="French" />
        </AppScreen>
        <AppScreen>{learning}</AppScreen>
        <AppScreen
          overlay={
            <SettingsModal
              settings={{
                autoPlay: true, playTargetOnly: false, showPhonetics: true, showPlayCount: true, rewindEnabled: false,
                pronunciationSpeed: 'Slow', pauseBetweenTranslations: 1, pauseForNextWord: 1.5, repeatTargetLanguage: 2, repeatMainLanguage: 1,
              }}
              scroll={0}
            />
          }
        >
          {learning}
        </AppScreen>
      </div>
    </AbsoluteFill>
  )
}

export const LAB_SIZE = { width: PHONE.width * LAB_SCREENS.length, height: PHONE.height }
