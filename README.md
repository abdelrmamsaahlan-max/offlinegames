# Pocket Party — Godot Android Project

An offline-first, same-device 1–4 player mini-game collection prototype built with Godot 4.

## Open it online (no local Godot install needed for a prototype test)
1. Download this repository as a ZIP: [Download source ZIP](https://github.com/abdelrmamsaahlan-max/offlinegames/archive/refs/heads/main.zip).
2. Open the official [Godot Web Editor](https://editor.godotengine.org/releases/4.7.stable/godot.editor.html) in a desktop Chromium-based browser.
3. In **Preload project ZIP**, select the ZIP downloaded in step 1.
4. Click **Start Godot editor**.
5. When the Project Manager appears, create a project folder under the suggested projects location and choose **Install & Edit**.
6. Press **F5** to run the game. Switch between the **Editor** and **Game** tabs when it starts.

The web editor is experimental and intended for learning/prototyping; it does not support exporting an Android APK/AAB. For an Android release, use the desktop Godot editor and Android export templates/SDK.

## Open locally
1. Download this repository using **Code → Download ZIP**, or clone it.
2. Install the standard Godot 4.x editor from https://godotengine.org/download/.
3. In Godot Project Manager, click **Import** and select project.godot.
4. Press **F6** to run the main scene or **F5** to run the project.

## Current prototype
- Arcade-style home screen with six original mini-game concepts.
- 1–4 player selection and tournament length selection.
- Quick play and tournament flow.
- Round scores, tournament points, final winner screen.
- Local settings; core gameplay does not need internet access.
- Original vector icon and code-drawn interface/game visuals.

## Important status
This is a development prototype, not a store-ready release. The source has been uploaded to GitHub, but it has not yet been verified through an actual Godot runtime in this workspace. Test import and gameplay in the editor and on physical devices before relying on it.

Not integrated yet: live ads, Google Play Billing/VIP purchase, production sound, final signed Android App Bundle, Play Console release setup, and complete device QA.

## Controls
- Desktop test: click the player's colored panel.
- Touch: tap the assigned player panel.
- Memory Grid and Target Rush use the colored buttons inside each player's panel.
- Press Escape to leave a round and return home.

## Team workflow
This repository is the source of truth for project edits. Keep the main branch runnable and commit after verified changes. Ads/billing should be added only after the core game has been runtime-tested.

## Reference links
- [Reference game on Google Play](https://play.google.com/store/apps/details?id=com.JindoBlu.FourPlayers)
- [Godot Web Editor instructions](https://docs.godotengine.org/en/latest/tutorials/editor/using_the_web_editor.html)
- [Godot AdMob plugin](https://github.com/poingstudios/godot-admob-plugin)
- [Godot Google Play Billing plugin](https://github.com/godot-sdk-integrations/godot-google-play-billing)
