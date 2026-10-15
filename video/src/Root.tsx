import './styles.css'
import './generated/liquid-glass.css'
import React from 'react'
import { Composition } from 'remotion'
import { SprindLaunch } from './SprindLaunch'
import { AppScreens } from './AppScreens'
import { FontLab, LAB_SIZE } from './FontLab'
import { THEME_LAB_SIZE, ThemeLab } from './ThemeLab'
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
    {/* Four app screens in any font, for trying typefaces (scripts/font-lab.sh). */}
    <Composition id="FontLab" component={FontLab} defaultProps={{ font: 'Space Grotesk' }} durationInFrames={1} fps={VIDEO.fps} width={LAB_SIZE.width} height={LAB_SIZE.height} />
    {/* Four app screens on any theme from src/themes.ts. */}
    <Composition id="ThemeLab" component={ThemeLab} defaultProps={{ theme: 'original' }} durationInFrames={1} fps={VIDEO.fps} width={THEME_LAB_SIZE.width} height={THEME_LAB_SIZE.height} />
    {/* A still of the rebuilt app screens, for checking them against the app. */}
    <Composition id="AppScreens" component={AppScreens} durationInFrames={1} fps={VIDEO.fps} width={2610} height={2100} />
  </>
)
