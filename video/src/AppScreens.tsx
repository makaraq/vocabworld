import React from 'react'
import { AbsoluteFill } from 'remotion'
import { AppScreen } from './app-ui/AppScreen'
import { ExampleSentencesModal } from './app-ui/ExampleSentencesModal'
import { LanguagePicker } from './app-ui/LanguagePicker'
import { LeaderboardModal } from './app-ui/LeaderboardModal'
import { LearningView } from './app-ui/LearningView'
import { PlaylistSelectModal } from './app-ui/PlaylistSelectModal'
import { SettingsModal } from './app-ui/SettingsModal'
import { TopicCompleteModal } from './app-ui/TopicCompleteModal'
import { TopicMenu } from './app-ui/TopicMenu'
import { sectionIndex, topicById, topicWords } from './app-ui/app-data'
import { PhoneMockup } from './components/PhoneMockup'
import { GAUCHE_SENTENCES, LEADERBOARD, PLAYLISTS } from './data/demo'
import { ACCOUNT_SAMPLE } from './data/sample'
import { COLOR } from './theme'

// A contact sheet of the rebuilt app screens, for checking them against the
// app (npx remotion still AppScreens). Not part of the film.

export const AppScreens: React.FC = () => {
  const directions = topicById(4)
  const words = topicWords(4)
  const learning = (playing: boolean) => (
    <LearningView
      topic={directions}
      word={words[0]}
      index={0}
      total={words.length}
      targetLanguage="French"
      nativeLanguage="English"
      audioStep={playing ? 'training' : 'idle'}
      playing={playing}
      cardScale={[playing ? 1.05 : 1, 1]}
      pulse={1}
      callout={playing ? { opacity: 1, frame: 10 } : undefined}
    />
  )
  const menu = (section: string) => (
    <TopicMenu section={sectionIndex(section)} account={ACCOUNT_SAMPLE} nativeLanguage="English" targetLanguage="French" />
  )
  const phones: React.ReactNode[] = [
    <AppScreen key="picker">
      <LanguagePicker question="I want to learn" exclude="en" />
    </AppScreen>,
    <AppScreen key="menu">{menu('FIRST AID KIT')}</AppScreen>,
    <AppScreen key="learning">{learning(true)}</AppScreen>,
    <AppScreen key="settings" overlay={<SettingsModal settings={{
      autoPlay: true, playTargetOnly: false, showPhonetics: true, showPlayCount: true, rewindEnabled: false,
      pronunciationSpeed: 'Slow', pauseBetweenTranslations: 1, pauseForNextWord: 1.5, repeatTargetLanguage: 2, repeatMainLanguage: 1,
    }} scroll={345} />}>{learning(false)}</AppScreen>,
    <AppScreen key="examples" overlay={<ExampleSentencesModal sourceWord={words[0].target} targetWord={words[0].native} sentences={GAUCHE_SENTENCES} index={0} visible={1} />}>
      {learning(false)}
    </AppScreen>,
    <AppScreen key="playlist" overlay={<PlaylistSelectModal word={words[0].native} translation={words[0].target} playlists={PLAYLISTS} addedTo="paris" />}>
      {learning(false)}
    </AppScreen>,
    <AppScreen key="complete" overlay={<TopicCompleteModal topicName="Directions" congrats="Great job — you conquered" nextTopic={{ name: 'Travel', icon: 'sprind:travel' }} shown={1} />}>
      {learning(false)}
    </AppScreen>,
    <AppScreen key="account">{menu('ACCOUNT')}</AppScreen>,
    <AppScreen key="leaderboard" overlay={<LeaderboardModal entries={LEADERBOARD} targetLanguageCode="fr" targetLanguageName="French" shown={1} />}>
      {menu('ACCOUNT')}
    </AppScreen>,
  ]
  return (
    <AbsoluteFill style={{ background: COLOR.bg, flexDirection: 'row', flexWrap: 'wrap', gap: 40, padding: 40 }}>
      {phones.map((screen, i) => (
        <PhoneMockup key={i}>{screen}</PhoneMockup>
      ))}
    </AbsoluteFill>
  )
}
