# Monetization integration — after gameplay QA

Do not wire live ads or billing into the core gameplay loop before the game is stable.

## Ads
- Use a maintained Godot/Android Google Mobile Ads integration compatible with the chosen Godot version.
- Use test ad IDs during development.
- Show interstitials only after completed matches or tournament results, with a completed-round threshold and cooldown; never interrupt a round or show one immediately on launching a new game.
- Skip a placement if an ad is not loaded; the offline game must continue to work.
- Determine intended audience accurately. Configure child-directed treatment and eligible ad sources if children are part of the target audience.
- Complete the privacy policy and Play Console Data safety declarations based on the actual SDK configuration.

## VIP
- Product ID proposal: `pocket_party_vip_lifetime`.
- Type: non-consumable one-time in-app purchase.
- Entitlement: remove interstitials and unlock bonus games/themes.
- Grant only on confirmed purchased state, acknowledge completed purchases, and query purchases to restore VIP after reinstall.
- Do not grant VIP for pending transactions. Test with Google Play license testers/internal or closed tracks.
- For long-term tamper resistance, consider server-side purchase verification after the product has traction.

## Not yet integrated
The current project contains no live AdMob or Google Play Billing code and does not advertise a working VIP button. This prevents accidental claims that monetization has been verified before Android builds and Play testing are available.
