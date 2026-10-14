# Sprind launch film

A 37-second vertical launch film for Sprind, built with [Remotion](https://www.remotion.dev).
1080 × 1920, 30 fps, 1,110 frames, H.264.

```bash
cd video
npm install
npm run studio     # preview and edit in Remotion Studio
npm run render     # → out/sprind-launch.mp4
```

The rendered film is in [`renders/sprind-launch.mp4`](renders/sprind-launch.mp4).

Both commands first run `npm run sync`, which copies the app's assets in. To use an installed
Chrome Headless Shell instead of Remotion's download, set `REMOTION_BROWSER_EXECUTABLE`.

## The app screens are the app's

The phone screens are not mock-ups drawn to look like Sprind. Each is the app's own markup from
`components/language/language-selector.tsx` (and the progress, review and badges cards). The
Tailwind classes are the app's, resolved for the 440 pt iPhone 17 Pro Max width (`xs:` applies,
`sm:` and up never do). They are styled by the app's own CSS:

- `app/liquid-glass.css`, copied in by `scripts/sync-app-assets.mjs` and rescoped from
  `html.liquid-glass` to the phone screen
- the parts of `app/globals.css` that the iOS app applies (`src/styles.css`): the WebKit glass
  overrides, the `cap-native` weight shift and blur radii, the flashcard scale curve

So positions, sizes, labels and the Liquid Glass material come from the same rules as on a
phone. The text on screen follows the app's own rules too: section names, the topic order from
`/api/topics`, display names (`Travel`, `City`…), `N of M words`, the category label, and the
lowercased words.

The words are the app's own data (`public/data/vocabulary.json`), French with English as the
main language:

| Scene | Topic | Words |
| --- | --- | --- |
| 2 | Greetings | bonjour · hello |
| 3 | Greetings, *polite expressions* | s'il vous plaît, merci, oui, non, d'accord |
| 4 | Directions | billet · ticket, gare · train station, bagages · luggage, départ · departure |
| 7 | Directions, *places for transportation* | gare, station de métro, aéroport, station de taxis |

`npx remotion still AppScreens` renders the rebuilt screens side by side, for checking against
the app.

## What is sample data

The ACCOUNT numbers (248 words, 12-day streak…) and the week in scene 6 are samples, in
`src/data/sample.ts`. The components take the same shapes the app uses, so real values can
replace them. The IPA under each French word is in `src/app-ui/app-data.ts` and stands in for
the phonetics endpoint.

## Layout

```
src/
  SprindLaunch.tsx      master composition: scenes, transitions, music
  timeline.ts           scene windows (start frame, length, exit)
  scenes/               S1World … S8Discover
  app-ui/               the app's screens: AppScreen, TopicMenu, TopicCard, LearningView
                        (with the flashcards), LanguagePicker, AccountSection
  components/           SprindLogo, LanguageChip, VocabularyCard, AudioWaveform,
                        GlobeAnimation, PhoneMockup, ProgressDashboard, ParticleField,
                        SceneTransition, BackgroundMusic, LiquidGlass
  generated/            written by the scripts; do not edit
scripts/
  sync-app-assets.mjs   icons, topics, section icons, vocabulary, Liquid Glass CSS, images
  fetch-fonts.mjs       Space Grotesk (the app), Inter, Instrument Serif, JetBrains Mono,
                        Noto subsets for the other scripts → public/fonts
  compose-audio.py      the score and interface sounds → public/audio
```

Every animation is a pure function of the frame: springs and interpolations from
`useCurrentFrame()`, seeded `random()` for scatter, and no CSS transitions (a `still` layer
switches off the app's own). The SMIL-animated section icons are evaluated at the frame's time.

## Music

The score is original and synthesised by `scripts/compose-audio.py` (numpy, plus ffmpeg for the
MP3). It plays at about 40% volume with a 1-second fade in and a 2-second fade out. It needs no
licence.

## Fonts

All SIL Open Font License, bundled in `public/fonts` so renders never need the network.
