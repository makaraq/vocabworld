import React from 'react'
import { AbsoluteFill } from 'remotion'
import { AppScreen } from './app-ui/AppScreen'
import { LanguagePicker } from './app-ui/LanguagePicker'
import { LearningView } from './app-ui/LearningView'
import { SettingsModal } from './app-ui/SettingsModal'
import { TopicMenu } from './app-ui/TopicMenu'
import { sectionIndex, topicById, topicWords } from './app-ui/app-data'
import { ACCOUNT_SAMPLE } from './data/sample'
import { THEMES, themeCss } from './themes'
import { PHONE } from './theme'

// The theme lab: four of the app's real screens side by side on a theme from
// src/themes.ts (npx remotion still ThemeLab --props='{"theme":"paper"}').
// Not part of the film.

export const THEME_LAB_SIZE = { width: PHONE.width * 4, height: PHONE.height }

export const ThemeLab: React.FC<{ theme: string }> = ({ theme }) => {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0]
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
  const bg = { backgroundSize: 'cover', backgroundPosition: 'center', ...t.background }
  return (
    <AbsoluteFill style={{ flexDirection: 'row', background: '#000' }}>
      <style>{themeCss(t)}</style>
      <div className="th" style={{ display: 'flex' }}>
        <AppScreen background={bg}>
          <LanguagePicker question="I want to learn" exclude="en" />
        </AppScreen>
        <AppScreen background={bg}>
          <TopicMenu section={sectionIndex('FIRST AID KIT')} account={ACCOUNT_SAMPLE} nativeLanguage="English" targetLanguage="French" />
        </AppScreen>
        <AppScreen background={bg}>{learning}</AppScreen>
        <AppScreen
          background={bg}
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
