# Pocket Party — Godot Mobile Game

An offline-first, same-device 1–4 player mini-game collection prototype built with Godot 4.

## Native mobile app (primary target)

**Pocket Party is intended to be a real Godot mobile app for Google Play and the Apple App Store.** The browser build in `index.html`, `game.js`, and `styles.css` is only an optional preview; it is not the store app.

- **Godot project:** open `project.godot` in the Godot 4 editor. The native game's scene is `main.tscn` and its gameplay/UI code is `scripts/main.gd`.
- **Android / Google Play:** install Godot export templates, OpenJDK 17, and the Android SDK; configure the Java and Android SDK paths in Godot; create an Android export preset and test on a device. Google Play releases should be exported as a signed Android App Bundle (`.aab`). [Official Android export guide](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html).
- **iOS / App Store:** exporting and signing the iOS app requires macOS with Xcode. Godot exports an Xcode project, which is then built and signed for an iPhone/App Store release. [Official iOS export guide](https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_ios.html).
- **Release setup still needed:** final app ID/package name, store-ready launcher icons, export presets and signing, privacy/store listing details, and device testing. Do not publish the prototype until these are checked.

## Browser preview (for testing only)

[**Open the Pocket Party browser preview**](https://offlinegames-eight.vercel.app).

The browser preview uses `index.html`, `game.js`, and `styles.css`. It is useful for testing the UI and gameplay, but it is separate from the native Godot app and is not the Google Play / App Store build. Changes pushed to the repository's `main` branch trigger a Vercel deployment. If Vercel requests sign-in, open the preview while signed in to the account with project access.

## Open locally
1. Download this repository using **Code → Download ZIP**, or clone it.
2. Install the standard Godot 4.x editor from https://godotengine.org/download/.
3. In Godot Project Manager, click **Import** and select `project.godot`.
4. Press **F6** to run the main scene or **F5** to run the project.

## Current prototype
- Separate party setup home screen and mini-game selection menu.
- Eight original mini-games: Tap Sprint, Reflex Rush, Memory Grid, Mini Racers, Dodge Arena, Target Rush, Block Battle, and Orb Dash.
- Tap Sprint rewards every five taps with combo bonuses.
- Reflex Rush measures reaction time and penalizes false starts.
- Memory Grid reveals its pattern one color at a time, with a longer sequence for three or four players.
- Mini Racers is a neon-styled arcade race with animated cars and wheels, joystick steering, nitro bursts, road cones, collision slowdown, clean-pass speed bonuses, and a finish line.
- Block Battle is a turn-based 8×8 block puzzle with varied polyomino shapes, rotation, board-aware legal shape racks, a live placement ghost, Smart Move suggestions, row/column clears, streak bonuses, and animated placement/clear feedback.
- Orb Dash is a continuous joystick-controlled gem collection race, with 10 points per gem. The browser build provides a direction-stick on every game panel; direction maps to actions in timing games, colors in color games, steering/throttle in racing, and cursor/placement in Block Battle.
- Target Rush speeds up as the round progresses; Dodge Arena gradually shortens each dodge window.
- 1–4 player selection and tournament length selection.
- Quick play and tournament flow.
- Tournament mode can randomly choose from all eight games; round scores feed into tournament points and the final winner screen.
- Browser JavaScript has been syntax-checked and interaction-tested, including line clears, 40 consecutive smart puzzle placements, game-screen rendering, directional input for Memory Grid/Target Rush, and race collision/clean-pass scoring. This is a test harness, not a replacement for real browser/device QA; the native Godot source still needs import/runtime testing in Godot.
- Local settings; core gameplay does not need internet access.
- Original vector/code-drawn visuals with an arcade color pass, motion effects, responsive joystick controls, and Web Audio synthesized effects for menu actions, placements, line clears, reactions, boosts, gems, collisions, and round results.

## Important status
This is a development prototype, not a store-ready release. Recent gameplay/UI improvements have been committed to GitHub. The updated Godot project still needs import/runtime verification in the Godot editor and playtesting on devices. Test import and gameplay in the editor and on physical devices before relying on it.

Not integrated yet: live ads, Google Play Billing/VIP purchase, custom recorded music/voice and a production audio mix, final signed Android App Bundle, Play Console release setup, native Godot parity for the newest browser changes, and complete device QA.

## Controls
- Desktop: use mouse clicks or the on-screen direction sticks; touch: drag a stick in the direction you want.
- Tap Sprint, Reflex Rush, and Dodge Arena trigger their action from the player panel/joystick.
- Memory Grid and Target Rush accept either the color buttons or a joystick direction (up/right/down/left maps to one of the four colors).
- Mini Racers: push up to accelerate, steer diagonally left/right to dodge cones, and tap **NITRO BOOST** for a burst.
- Block Battle: select a shape and click/tap an empty board cell, or drag the shape. **↻ ROTATE** turns the selected piece, **SMART MOVE** selects a high-value legal placement, **PLACE PIECE** uses the highlighted spot, and the joystick moves the cursor (release to place). Full rows and columns clear for bonuses.
- Orb Dash: continuously steer toward gold gems; each gem is worth 10 points.
- Use the top sound toggle for synthesized sound effects. Press Escape to return from a game to the game menu.

## Team workflow
This repository is the source of truth for project edits. Keep the main branch runnable and commit after verified changes. Ads/billing should be added only after the core game has been runtime-tested.

## Reference links
- [Reference game on Google Play](https://play.google.com/store/apps/details?id=com.JindoBlu.FourPlayers)
- [Godot Web Editor instructions](https://docs.godotengine.org/en/latest/tutorials/editor/using_the_web_editor.html)
- [Godot AdMob plugin](https://github.com/poingstudios/godot-admob-plugin)
- [Godot Google Play Billing plugin](https://github.com/godot-sdk-integrations/godot-google-play-billing)
