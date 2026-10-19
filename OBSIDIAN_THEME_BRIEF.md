# Obsidian: a third premium theme (hand-off brief)

Hand-off from a long cloud session so a fresh session can start building at once.
Delete this file when the theme ships.

## Paste this into the new session

> Read `OBSIDIAN_THEME_BRIEF.md` in the repo root and build the Obsidian premium
> theme it describes. The reference image is attached: black glass "Copy" and
> "Paste" keys with beveled chrome edges and thin iridescent reflections. Don't
> re-explore the theme system or the glass CSS, the brief covers them. Show me
> screenshots before you commit.

Also paste the long "senior creative frontend engineer" prompt and attach the
reference image. That prompt asks for a standalone `LiquidChromeButton` and a
demo page; here, **apply the same material to the app as a theme instead**
(see "What to build").

## What to build

A new theme, `obsidian` ("Obsidian"), **premium** like Paper and Rose glass:
crown on its swatch, free users can preview it, then the paywall opens.

The look (from the reference and the long prompt):

- Near-black glass, about `#050609` to `#101116`. The centre stays almost
  black. No milky or frosted look, no raising the blacks.
- A restrained specular highlight at the top left of each surface.
- A thin liquid-chrome rim: silver-white lines plus small, controlled
  cyan / electric blue / violet / magenta / amber flares at the corners. Not
  neon, not gaming RGB, not a thick outline.
- A beveled, machined feel: bright line on one edge, dark line on the other,
  layered shadows underneath.
- Text stays white or light grey (it is a dark theme, so no ink override).
- Pure CSS, no images or canvas for the material.

Where to see it: the controls (round header and playback buttons, language
pills, text buttons, close and add buttons, the page-dots capsule), then the
panels and sheets, then optionally the topic tiles and flashcards.

## How the theme system works (already on main)

- `lib/themes.ts`: `ThemeId` union, the `THEMES` list
  (`{ id, premium, swatch, light? }`), the boot script, `setTheme`,
  `previewTheme`, `keepPreview`, `revertPreview`. Choice is in localStorage
  `sprind:theme`; the class `theme-<id>` goes on `<html>` before first paint.
- `scripts/generate-theme-css.mjs` writes **`app/themes.css`** (generated, do
  not hand-edit; rerun the script). Each theme sets `--app-backdrop`, and may
  set `glass` (the `--lg-fill` pair), `accent` (replaces the app's blue on
  toggles and selection) and `ink` (light themes only). It needs two additions
  for Obsidian: arbitrary custom properties, and extra rules (see below).
- `components/theme/`: `theme-backdrop.tsx` (fixed backdrop, crossfade, sends a
  kept premium theme back to Original when the user is not Premium),
  `theme-picker.tsx` (swatches and crown), `theme-intro-sheet.tsx`.
- `components/account/manage-account-modal.tsx` has the Theme section;
  `components/language/language-selector.tsx` has `handlePremiumTheme`
  (preview, then paywall after 900 ms; closing the paywall reverts, buying
  keeps it) and shows the theme sheet once after the first tutorial.
- `components/paywall/paywall-modal.tsx` carries `data-keep-colors` on its
  roots so themes do not recolour it.
- Labels: `lib/i18n/ui-strings/en.ts` (`theme.name.<id>`; `t()` is type-safe, so
  add `'theme.name.obsidian': 'Obsidian'`). Other languages fall back to English.
- Icons come from an offline bundle (`lib/icons/data/solar.json`);
  `solar:crown-bold` is already in it.

Files to touch: `lib/themes.ts`, `scripts/generate-theme-css.mjs` (then
regenerate `app/themes.css`), `en.ts`, `components/theme/theme-picker.tsx`.

Picker notes:
- The picker is `grid-cols-5`. A sixth theme wraps; use 3 columns, or keep 6
  if the swatches still look right.
- The mini pane drawn inside each swatch has only light and dark variants.
  Give Obsidian a chrome-edged one.

## How the glass material is built (`app/liquid-glass.css`)

All rules are under `html.liquid-glass` (always on in the iOS app; on the web
add `?glass=1`) and live in `@layer base`.

Variables on `html.liquid-glass` (lines 54-131), which a theme can override:
`--lg-fill`, `--lg-fill-active`, `--lg-vibrancy`, `--lg-vibrancy-active`,
`--lg-lift`, `--lg-glow-active`, `--lg-rim-light`, `--lg-rim-light-panel`,
`--lg-body`, `--lg-sheen`, `--lg-sheen-panel`, `--lg-rim`, `--lg-rim-panel`,
`--lg-lift-panel`, `--lg-backdrop`, `--lg-solid`.

Each glass control (list at lines 181-193) is three layers:
- the element: `--lg-fill` background, `--lg-vibrancy` backdrop filter,
  `--lg-lift` shadow;
- `::before`: a 1.5px ring made with `padding` plus a `mask-composite: xor`
  mask, painted with `background: var(--lg-rim-light)`. **This is where the
  chrome rim goes.** Replace the variable with a multi-stop gradient.
- `::after`: the lit body, `var(--lg-body)` plus the touch glow.

Panels (135-144), sheets (505-515) and centred modals (494-501) use
`--lg-sheen-panel`, `--lg-rim-panel`, `--lg-lift-panel`, and their `::before`
ring (519-535) uses `--lg-rim-light-panel`. Topic tiles (151-156, `.grid >
button.bg-black\/40`) and flashcards (`.flashcard-scale`, 165-170) have no ring.

Theme overrides of variables work as the existing themes do:
`html.theme-obsidian.liquid-glass { --lg-...: ... }` (two classes beat one).

## Traps

1. **Cascade layers.** Hard-coded `!important` rules in `liquid-glass.css`
   (panel `background-color: rgba(255,255,255,.05)`, border colours, tile and
   flashcard shadows) sit in `@layer base`. By the CSS spec, a layered
   `!important` beats an unlayered one. To override those, emit the theme rules
   inside `@layer base { ... }` with higher specificity, for example
   `html.theme-obsidian.liquid-glass .bg-white\/5.backdrop-blur-3xl`. Variable
   overrides do not need this. Check each in DevTools.
2. **WebKit.** The app runs in iOS WKWebView. Test in WebKit (Playwright
   `webkit`, or Safari), not only Chrome. The file header warns that blurred,
   negatively spread inset shadows on rounded shapes render as an even ring in
   WebKit; use gradients, masks, plain outer shadows and 1px inset lines.
3. **Don't lift the blacks.** `--lg-vibrancy` is
   `blur(8px) saturate(180%) brightness(1.08)`, which greys out a black
   surface. Override it with no brightening.
4. **Press glow.** `:active` sets a white `--lg-touch` glow; make it a cool,
   fainter one for this theme.
5. **Tile borders** carry the topic completion tiers; leave them alone.
6. **Reduce Transparency** swaps panels for `--lg-solid`, whose default is a
   brown, `rgb(52, 30, 22)`. Override it: `#090a0f` for Obsidian.

## Starting point (not rendered or tested yet; tune against the reference)

```css
html.theme-obsidian {
  --app-backdrop:
    radial-gradient(120% 55% at 50% -8%, rgba(140,155,210,.20) 0%, transparent 60%),
    radial-gradient(70% 40% at 0% 100%, rgba(40,120,150,.14) 0%, transparent 65%),
    radial-gradient(70% 40% at 100% 85%, rgba(110,70,170,.14) 0%, transparent 65%),
    #05060a;
}
html.theme-obsidian.liquid-glass {
  --lg-fill: rgba(7, 8, 12, 0.80);
  --lg-fill-active: rgba(16, 18, 26, 0.90);
  --lg-vibrancy: blur(10px) saturate(120%);
  --lg-vibrancy-active: blur(10px) saturate(130%) brightness(1.1);
  --lg-lift: 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.55), 0 14px 30px rgba(0,0,0,.6);
  --lg-glow-active: 0 0 18px rgba(150,170,255,.25);
  --lg-rim-light: linear-gradient(135deg,
    #fff 0%, #9ff0ff 4%, #6d86ff 8%, #b87bff 12%, #ff7ad0 15%, #ffc27a 18%,
    rgba(255,255,255,.22) 26%, rgba(255,255,255,.06) 42%, rgba(255,255,255,.04) 62%,
    rgba(255,255,255,.2) 78%, #ffd59a 86%, #ff80d8 90%, #7fb4ff 94%, #8ff3ff 97%, #fff 100%);
  --lg-body:
    radial-gradient(120% 70% at 16% -12%, rgba(255,255,255,.18) 0%, rgba(255,255,255,.05) 32%, transparent 55%),
    radial-gradient(100% 60% at 50% 125%, rgba(150,170,255,.08) 0%, transparent 60%);
  --lg-sheen-panel: linear-gradient(160deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.015) 30%, transparent 55%, rgba(255,255,255,.03) 100%);
  --lg-solid: #090a0f;
}
```

Then, inside `@layer base`: near-black panel, modal and sheet fills (with a
calmer `--lg-rim-light-panel`), and, if wanted, a chrome ring and bevel on the
topic tiles and flashcards (they need `position: relative` and their own
`::before`). Suggested accent for toggles and selection: a cool chrome blue
such as `#8fb4ff`. Tune everything against the reference image.

## Test loop

```bash
npm run dev                      # open http://localhost:3000/?app=1&glass=1
# set the theme without signing in:
#   localStorage.setItem('sprind:theme', 'obsidian'); location.reload()
```

- Check: topic grid, learning page, settings modal, example sentences, Manage
  Account (Theme section, crown on the swatch), the theme sheet after the
  tutorial, and the preview-then-paywall flow with a non-Premium user.
- Also check Reduce Transparency (add class `reduce-transparency` to `<html>`)
  and Paper and Rose glass under it.
- Optional: `scripts/app-store-screenshots/` (on branch
  `claude/quirky-goodall-4fqm9m`) serves sample data so the real app can be
  screenshotted signed in, no real account. In `lib.mjs` the Chromium path is
  the cloud one; switch it to Playwright's own browser, ideally WebKit.

## Also fix (found while writing this)

Paper and Rose glass do not set `--lg-solid`, so with iOS Reduce Transparency on
their panels turn dark brown. Paper's dark text becomes unreadable on that.
Give each theme its own `--lg-solid` (a light cream for Paper, a deep rose for
Rose glass) in the generator.

## Release notes

- The earlier themes went to `main` as a single commit so one `git revert`
  removes them; the same is probably wanted here. Ask first.
- iOS `MARKETING_VERSION` is 1.0.3 (`ios/App/App.xcodeproj/project.pbxproj`,
  two places). Bump it if this ships in a new build.
- The paywall copy does not mention themes. Adding a "Premium themes" line
  would change its layout; leave that unless asked.
