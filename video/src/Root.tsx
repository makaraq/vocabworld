import './styles.css'
import './generated/liquid-glass.css'
import React from 'react'
import { Composition } from 'remotion'
import { SprindLaunch } from './SprindLaunch'
import { AppScreens } from './AppScreens'
import { TheLastWord } from './last-word/TheLastWord'
import { LAST_WORD } from './last-word/timeline'
import { loadFonts } from './fonts'
import { VIDEO } from './theme'

loadFonts()

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="SprindLaunch"
      component={SprindLaunch}
      durationInFrames={VIDEO.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* A micro-story: a traveler lost in Paris, and this morning's word. */}
    <Composition
      id="TheLastWord"
      component={TheLastWord}
      durationInFrames={LAST_WORD.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* A still of the rebuilt app screens, for checking them against the app. */}
    <Composition id="AppScreens" component={AppScreens} durationInFrames={1} fps={VIDEO.fps} width={2610} height={2100} />
  </>
)
