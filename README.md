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
- Mini Racers has moving 2D cars, hold-to-accelerate, and nitro boosts.
- Block Battle is a turn-based 8×8 block puzzle with row/column clears and score bonuses.
- Orb Dash is a joystick-controlled gem collection race, with 10 points per gem.
- 1–4 player selection and tournament length selection.
- Quick play and tournament flow.
- Tournament mode can randomly choose from all eight games; round scores feed into tournament points and the final winner screen.
- Browser input and puzzle placement have been syntax-checked and interaction-tested; the native Godot project still needs import/runtime testing in Godot.
- Local settings; core gameplay does not need internet access.
- Original vector icon and code-drawn interface/game visuals.

## Important status
This is a development prototype, not a store-ready release. Recent gameplay/UI improvements have been committed to GitHub. The updated Godot project still needs import/runtime verification in the Godot editor and playtesting on devices. Test import and gameplay in the editor and on physical devices before relying on it.

Not integrated yet: live ads, Google Play Billing/VIP purchase, production sound, final signed Android App Bundle, Play Console release setup, and complete device QA.

## Controls
- Desktop test: click the player's colored panel.
- Touch: tap the assigned player panel.
- Memory Grid and Target Rush use the colored buttons inside each player's panel.
- Mini Racers: hold your player control to accelerate; tap for a nitro boost.
- Block Battle: select a shape and tap an empty board position, or drag the shape onto the board. Clear complete rows or columns for bonus points.
- Orb Dash: drag the joystick in your player panel to steer your orb toward gold gems.
- Press Escape to return from a game to the game menu.

## Team workflow
This repository is the source of truth for project edits. Keep the main branch runnable and commit after verified changes. Ads/billing should be added only after the core game has been runtime-tested.

## Reference links
- [Reference game on Google Play](https://play.google.com/store/apps/details?id=com.JindoBlu.FourPlayers)
- [Godot Web Editor instructions](https://docs.godotengine.org/en/latest/tutorials/editor/using_the_web_editor.html)
- [Godot AdMob plugin](https://github.com/poingstudios/godot-admob-plugin)
- [Godot Google Play Billing plugin](https://github.com/godot-sdk-integrations/godot-google-play-billing)
