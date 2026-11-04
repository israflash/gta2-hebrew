# GTA2 Browser – Hebrew mission text

This checkout keeps GTA2's original game files and save files outside Git and the built web package. The local runner reads the ignored `game/` folder on loopback only.

## Run locally

From PowerShell, run:

```powershell
./run-local.ps1
```

Open `http://127.0.0.1:8876/`. If the GTA2 data folder is unavailable, use the existing folder picker or installer-download flow. Hebrew is the default interface language; choose English in the language control to disable the Hebrew mission layer. Untranslated text falls back to the original English. Game audio and data remain original.

## Mission message inventory

The source scanner reads the local original GXT and compiled district scripts. It indexes face-marked GXT IDs passed through `DISPLAY_BRIEF`, `DISPLAY_BRIEF_NOW`, `DISPLAY_BRIEF_SOON`, and all eight `PHONE_TEMPLATE` variants. Exact matching uses district plus GXT key, so repeated or differently formatted text does not cause a draft to disappear. It found 1,158 referenced brief IDs: 1,154 contain text and four are unused `DEAD BRIEF` placeholders. The catalog holds all 1,154 text-bearing entries across Downtown, Residential, and Industrial District.

See [mission-coverage.md](mission-coverage.md) for source coverage and runtime limits, [mission-context-review.md](mission-context-review.md) for the reviewed titles and dialogue sample, and [final-feature-audit.md](final-feature-audit.md) for the upstream feature comparison. The scan includes job, progression, failure, introductory, and gang-phone briefs; it is a comprehensive source-key inventory, not proof that every conditional branch was triggered. Keys referenced only by `DISPLAY_MESSAGE` are inventoried separately unless they also occur as mission briefs.

Edit `web/mission-translations.he.json`. Each row keeps the exact source text and GXT key, area, speaker/context, and Hebrew translation. For a translated active brief, the port suppresses the game's English text draw while keeping its portrait and timing, then places RTL HTML text at the original text coordinates. Untranslated briefs keep the original English draw. A CSS selector ties the Hebrew font and wrapping rules to that in-place text node. The secondary history can be opened from its control; modal screens hide the in-game Hebrew text layer. Original audio remains English. The original main-menu bitmap font lacks Hebrew, so the browser overlays Hebrew labels on the menu screen.

For local visual QA only, append `?devdata&autostart&brief-test=1600,2153,3727` to the local URL. After gameplay starts, this enqueues those real GXT brief IDs through `Hud_Brief_704` so the portrait, timing, native-text suppression, and Hebrew placement follow the same runtime path. This is an injected display test, not a real mission; record it as verified only after visually inspecting all three messages. The QA hook is enabled only in local dev-data mode. See [mission-runtime-validation.json](mission-runtime-validation.json) and the generated coverage report for what was actually inspected.

## Build and save compatibility

`run-local.ps1` builds the local release before serving it. The build exports one frontend menu-state value for the Hebrew label overlay; no save-state serialization code was changed. Browser save export/import was previously tested as a same-profile round trip. Cross-build compatibility with independently produced save files was not separately tested. `scripts/build_pages.py` includes the Hebrew translation JSON and font in the local static package, while its file allowlist continues to exclude GTA2 data files; the Pages package has only been built locally and has not been published.

Game files and save exports are local user data. Do not add them to the repository or copy them into a public release.
