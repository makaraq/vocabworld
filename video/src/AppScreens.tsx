import React from 'react'
import { AbsoluteFill } from 'remotion'
import { AppScreen } from './app-ui/AppScreen'
import { LanguagePicker } from './app-ui/LanguagePicker'
import { LearningView } from './app-ui/LearningView'
import { TopicMenu } from './app-ui/TopicMenu'
import { sectionIndex, topicById, topicWords, wordIndex } from './app-ui/app-data'
import { PhoneMockup } from './components/PhoneMockup'
import { ACCOUNT_SAMPLE } from './data/sample'
import { COLOR } from './theme'

// A contact sheet of the rebuilt app screens, for checking them against the
// app (npx remotion still AppScreens). Not part of the film.

export const AppScreens: React.FC = () => {
  const greetings = topicWords(1)
  const i = wordIndex(1, 'thank you')
  return (
    <AbsoluteFill style={{ background: COLOR.bg, flexDirection: 'row', flexWrap: 'wrap', gap: 40, padding: 40 }}>
      <PhoneMockup>
        <AppScreen>
          <LanguagePicker question="I want to learn" exclude="en" />
        </AppScreen>
      </PhoneMockup>
      <PhoneMockup>
        <AppScreen>
          <TopicMenu section={sectionIndex('FIRST AID KIT')} account={ACCOUNT_SAMPLE} nativeLanguage="English" targetLanguage="French" />
        </AppScreen>
      </PhoneMockup>
      <PhoneMockup>
        <AppScreen>
          <TopicMenu section={sectionIndex('ACCOUNT')} account={ACCOUNT_SAMPLE} nativeLanguage="English" targetLanguage="French" />
        </AppScreen>
      </PhoneMockup>
      <PhoneMockup>
        <AppScreen>
          <LearningView
            topic={topicById(1)}
            word={greetings[i]}
            index={i}
            total={greetings.length}
            targetLanguage="French"
            nativeLanguage="English"
            audioStep="training"
            playing
            cardScale={[1.05, 1]}
            pulse={1}
          />
        </AppScreen>
      </PhoneMockup>
    </AbsoluteFill>
  )
}
