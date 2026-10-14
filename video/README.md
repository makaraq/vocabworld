# Sprind launch film

A 30-second vertical launch film for Sprind, built with [Remotion](https://www.remotion.dev).
1080 × 1920, 30 fps, 900 frames, H.264 with AAC audio.

```bash
cd video
npm install
npm run studio     # preview and edit in Remotion Studio
npm run render     # → out/sprind-launch.mp4
```

The rendered film is in [`renders/sprind-launch.mp4`](renders/sprind-launch.mp4).

Both commands first run `npm run sync`, which copies the app's assets in. To use an installed
Chrome Headless Shell instead of Remotion's download, set `REMOTION_BROWSER_EXECUTABLE`.

## The film

One continuous session on one phone, after a full-screen hook. Frames are in
`src/timeline.ts`; the score runs at 120 BPM, so a beat is 15 frames.

| Time | What happens | Caption |
| --- | --- | --- |
| 0:00 | "Hello" flips through twelve languages with their flags, faster and faster, and lands on **bonjour**: "50 languages." and "One app. Start with one word." | |
| 0:03 | The language picker: French | Pick a language. |
| 0:05 | The topic menu: a swipe to DAILY LIFE and back, then Directions | Learn what you'll actually use. |
| 0:07 | Autoplay runs the first four words, with the Autoplay label on screen: gauche, droite, tout droit, tourner | Press play. Learn hands-free. |
| 0:12 | Settings: pronunciation speed to Slow, then Fast | Slow it down. Speed it up. |
| 0:15 | Back to *gauche*, a long press opens its example sentences | See every word in context. |
| 0:17 | Add to Playlist: *Paris trip* | Save words to your playlists. |
| 0:20 | Topic complete: the trophy, "Great job — you conquered Directions", up next Travel | Finish a topic. Celebrate it. |
| 0:22 | ACCOUNT: the stats count up | Watch your progress grow. |
| 0:24 | The leaderboard | Climb the leaderboard. |
| 0:27 | End card: the app icon, "Learn the words you actually use.", App Store badge | |

## The app screens are the app's

The phone screens are not mock-ups drawn to look like Sprind. Each is the app's own markup,
rebuilt in `src/app-ui/`:

| Screen | From |
| --- | --- |
| Language picker, topic menu, learning page, settings | `components/language/language-selector.tsx` |
| Example sentences | `components/learning/example-sentences-modal.tsx` |
| Add to Playlist | `PlaylistSelectModal` in `components/learning/search-word-learning.tsx` |
| Topic complete (with the app's trophy Lottie) | `components/achievements/topic-complete-modal.tsx` |
| Leaderboard (with the app's DiceBear smiley avatars) | `components/leaderboard/leaderboard-modal.tsx` |

The Tailwind classes are the app's, resolved for the 440 pt iPhone 17 Pro Max width (`xs:`
applies, `sm:` and up never do). They are styled by the app's own CSS:

- `app/liquid-glass.css`, copied in by `scripts/sync-app-assets.mjs` and rescoped from
  `html.liquid-glass` to the phone screen
- the parts of `app/globals.css` that the iOS app applies (`src/styles.css`): the WebKit glass
  overrides, the `cap-native` weight shift and blur radii, the slider thumb, the flashcard scale
  curve

So positions, sizes, labels and the Liquid Glass material come from the same rules as on a
phone. The text on screen follows the app's own rules too: section names, the topic order from
`/api/topics`, display names, `N of M words`, the category label, the lowercased words, the
settings labels and the speeds (Slow, Normal, Fast).

The words are the app's own data (`public/data/vocabulary.json`), French with English as the
main language: the first four words of Directions, *gauche · left*, *droite · right*,
*tout droit · straight*, *tourner · turn*. None of them looks like its English translation.

The icons come from the app's offline icon bundle (`lib/icons/data`). The few it lacks (some
of the settings icons) come from the `@iconify-json/solar` package. The app icon is the
original `AppIcon-1024.png` from the iOS project.

`npx remotion still AppScreens` renders the rebuilt screens side by side, for checking against
the app.

## What is sample data

These are samples and can be replaced with real values; the components take the same shapes
the app uses:

- the ACCOUNT numbers (248 words, 12-day streak, rank 8…), in `src/data/sample.ts`
- the example sentences for *gauche*, the playlists, and the leaderboard names and scores, in
  `src/data/demo.ts`
- the IPA under each French word, in `src/app-ui/app-data.ts`, standing in for the phonetics
  endpoint

## Layout

```
src/
  SprindLaunch.tsx      master composition: hook, app, end card, music and interface sounds
  timeline.ts           every frame the film depends on, and the captions
  scenes/               Hook, AppDemo (the app session), EndCard, shared stage and phone
  app-ui/               the app's screens and modals (see above)
  components/           PhoneMockup, BackgroundMusic
  data/                 the hook's words and the sample data
  generated/            written by the scripts; do not edit
scripts/
  sync-app-assets.mjs   icons, topics, section icons, vocabulary, trophy animation,
                        Liquid Glass CSS, images
  fetch-fonts.mjs       Space Grotesk (the app's font), Inter, Noto subsets for the hook's
                        other scripts and the IPA → public/fonts
  compose-audio.py      the score and interface sounds → public/audio
```

Every animation is a pure function of the frame: springs and interpolations from
`useCurrentFrame()`, and no CSS transitions (a `still` layer switches off the app's own). The
SMIL-animated section icons are evaluated at the frame's time, and the trophy Lottie is seeked
to it.

## Music

The score is original and synthesised by `scripts/compose-audio.py` (numpy, plus ffmpeg for the
MP3): a rising intro under the hook, a drop as the app appears, a groove under the demo, and
chords and bells under the end card. It plays at about 40% volume with a 1-second fade in and a
2-second fade out. It needs no licence.

## Fonts

All SIL Open Font License, bundled in `public/fonts` so renders never need the network.
