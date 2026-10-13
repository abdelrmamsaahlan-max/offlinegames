# Pocket Party — Browser Arcade + Godot Project

Pocket Party is a local multiplayer mini-game collection. The repository contains both a browser build and a native Godot project. **The newest 12-game collection and website settings described below are currently implemented in the browser files** (index.html, game.js, and styles.css); they have not all been ported to Godot yet.

## Play the browser version

**Live preview:** https://offlinegames-eight.vercel.app

The main branch is connected to Vercel. After a successful GitHub commit, the website deploys from that branch; verify the latest deployment before sharing changes as live.

## Browser game library (12 games)

| Game | What is playable | Controls |
| --- | --- | --- |
| Tap Sprint | Timed tapping, combo bonus, score/results | Player action button |
| Reflex Rush | Random GO signal, reaction timing, false-start penalty | Player action button |
| Memory Grid | Sequence playback and turn-based pattern recall | Four color buttons |
| Mini Racers | Scrolling road, moving traffic, steering, crashes, clean-pass bonus; traffic increases every 5 seconds | On-screen directional stick; Arrow/WASD on desktop; Nitro action button |
| Dodge Arena | Eight signal-based dodge waves | Player action button |
| Target Rush | Timed color matching, speed increases through the round | Four color buttons |
| Block Battle | 8×8 polyomino puzzle, legal piece racks, rotation, placement preview, Smart Move, simultaneous row/column clears, bonus scoring | Select a piece, tap a board cell or drag-and-drop; rotate/hint/place tools |
| Orb Dash | Continuous gem collection; each gem is worth 10 points | On-screen directional stick |
| Star Snatch | Hit a moving star when it crosses the target zone; speed changes every 5 seconds | Player action button |
| Stack Tower | Turn-based moving blocks, trimmed overlap, perfect-drop bonuses and collapse | Drop action button |
| Tic-Tac-Toe | 3×3 line detection, draw detection, local two-player or minimax AI when set to one player | Tap an empty cell |
| Connect Four | 7×6 board, gravity-based column drops, 4-in-a-row win checks, local two-player or AI reply when set to one player | Tap a column |

Player-count indicators are shown on library cards. The two board games use exactly two board sides; choosing one player enables an AI opponent, while a two-player setup enables local versus play. Most other party rounds accept the selected 1–4 players.

## Website features

The browser library supports title/description search, category filters, sorting, favorites, recently played games, a sound toggle, and per-game high scores. Settings save in browser local storage and include light/dark appearance, three background themes, accent color, game difficulty, sound effects, and reduced-motion mode.

The global joystick is deliberately **not** used across every game. In this collection, sticks are shown only for Mini Racers and Orb Dash. Puzzle games use board interactions; memory/color games use color buttons; timing and survival games use action buttons.

## Art and licensing

The browser library uses **Kenney CC0 game sprites** for racing cars, glossy puzzle tiles, stars, and a crate. Assets are referenced from Kenney's public raw asset repository rather than presented as commercial-game screenshots. Sources include [Kenney Racing Pack](https://kenney.nl/assets/racing-pack) and [Kenney CC0 game assets repository](https://github.com/shorepine/kenney). These images load from external URLs, so the website's first-time artwork load requires an internet connection even though mini-game rules run in the browser.

The game implementations and Pocket Party presentation are original; the reference *1 2 3 4 Player Games – Offline* app is an inspiration for local-multiplayer variety, not a source of copied code, branding, or artwork.

## Validation completed

The latest browser JavaScript passed a syntax parse check. A deterministic JavaScript/DOM test harness checked all 12 game screens, confirmed joystick controls appear only for Mini Racers and Orb Dash, verified settings can open and persist dark appearance, and tested:
- Block Battle simultaneous row/column clearing and scoring, plus 30 consecutive legal Smart Move placements.
- Tic-Tac-Toe and Connect Four win detection and results screens.
- Solo AI replies for Tic-Tac-Toe and Connect Four.
- Star Snatch success scoring and Stack Tower drop scoring.
- Traffic spawning, 5-second difficulty escalation, road movement, and crash penalty.
- Saved high scores for a completed board-game round.

These tests use a mocked browser environment. They do **not** replace manual desktop/mobile browser QA, cross-browser checks, keyboard/touch device tests, or a production browser-console audit. Keep unverified cases marked as needing QA rather than treating the test harness as a guarantee of zero bugs.

## Native Godot project — separate status

Open project.godot with the Godot 4 editor. The native scene is main.tscn and its UI/game code is scripts/main.gd. The newest browser games, website settings, traffic racer, favorites/search features, and sprite-driven website cards **still need to be ported or matched in Godot** and validated inside the editor/on devices.

For store release, still set the final package/app ID, export presets and signing, store metadata/privacy details, launcher assets, and device QA. Follow the official [Godot Android export guide](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html) and [iOS export guide](https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_ios.html).

## Controls summary

- Use the player panel buttons for tapping, reaction, dodge and star-timing games.
- Use the four color buttons for Memory Grid and Target Rush.
- Mini Racers: hold the stick upward to accelerate and steer left/right around traffic; use Nitro for a burst. Desktop keyboard: A/D or left/right to steer, W/up to accelerate, Space/Shift for Nitro.
- Orb Dash: steer continuously toward the gold collectible.
- Block Battle: choose a shape then tap a valid grid cell or drag it to the board; rotate, use Smart Move, or place the highlighted position. A full row or column clears, and simultaneous clears are scored.
- Tic-Tac-Toe / Connect Four: tap the board or a Connect Four column; the game ends on a win or draw.
- Use the settings gear for saved preferences and the sound toggle to mute/unmute synthesized effects. Use GAMES to leave a round, or the results screen to rematch.

## Important limitations

This remains a development project, not a store-ready release. The browser version is deployed separately from the native Godot app. Browser changes should not be represented as native Godot changes until they are ported and runtime-tested. Full manual desktop/mobile testing and a browser-console audit are still recommended before calling the entire platform release-ready.