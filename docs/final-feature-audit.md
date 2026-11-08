# Final feature audit

Audit date: 2026-11-04. The checkout's unmodified upstream base is `ad4cb1aa19eee9d764fb9747f494674b8bc128b6`, identical to `origin/main` at audit time. The Hebrew changes are layered on top. Engine changes collect HUD/menu state and suppress only catalogued translated title/brief glyphs; gameplay, mission scripts, audio, and save serialization are not intentionally modified.

“Previously tested” below points to dated checks in the original project documents. It is not a claim that the feature was re-run during this Hebrew QA pass.

| Feature | Original project support | Local Hebrew build evidence | Current conclusion |
|---|---|---|---|
| Start game and load district | Original browser port; full game package is selected/downloaded or loaded locally. | Started through `run-local.ps1`; Downtown mission active in isolated Chromium. | Re-tested in this pass for Downtown. |
| Resume / load saved status | Browser save-state flow; previous build report records reload/resume at the church. | Hebrew changes do not edit save serialization. No resume was performed in this pass. | Previously tested; not re-tested now. |
| Manual save and autosave | Church save and save-state flow documented in `browser-build-status.md`; autosave hooks remain in the original shell/engine. | No save file was created or changed during the latest visual QA. | Previously tested in source project; current-pass preservation is code-based, not a fresh save test. |
| Export / import saves | Original UI has export/import; original browser build report records both. | No import/export round trip performed in this pass. `savestate.js` and serialization code are unchanged. | Previously tested; not re-tested now. |
| Three story districts | Original scripts/data include Downtown, Residential, Industrial District. | 1,154 text-bearing brief keys match exact source IDs across all three; injected HUD messages were inspected in all three. | Static source and display injection verified; only Downtown was played as a genuine mission. |
| Mission phones and brief queue | Original engine mission scripts and phone jobs. | One genuine Downtown Yakuza phone job was accepted; engine reported mission flag and GXT key 1631. Other area messages were queued through the original brief HUD for display QA. | Downtown mission flow re-tested; other districts were injection-only. |
| Walking, driving, shooting | Original gameplay code. Historical browser report documents all three. | No gameplay simulation code was changed; no full movement/combat regression run in this pass. | Previously tested; not re-tested now. |
| Map, radar, camera, fullscreen | Original web port implements map/radar/camera/fullscreen; previous browser report documents these. | HUD/map remain visible in the mission screenshots. Fullscreen was not entered in this pass. | Partial visual check only; fullscreen and map interactions not re-tested. |
| Keyboard / controller | Keyboard and rebind UI are in the original build. Gamepad support is documented by upstream; this pass only used keyboard automation. | Keyboard was used to start/accept the Downtown job. No controller was connected. | Keyboard path partially re-tested; controller not tested. |
| English audio | Original audio path is unchanged; prior status report records speech, radio, and effects. | Audio was not evaluated by ear in this pass. No audio source or playback logic was changed. | Previously tested; English audio not re-confirmed now. |
| Multiplayer | Original port supports browser multiplayer; `docs/multiplayer.md` records two-tab sessions and known limits. | No multiplayer session was started in this pass. Translation code is independent of `web/net.js` and cooperative simulation. | Previously tested; not re-tested now. |
| Hebrew brief and title display | Not part of upstream. | Five injected brief keys photographed; one native Downtown mission brief (1631) and title (1975) photographed with the original portrait and timing. | Re-tested in the game renderer/HUD. |
| English fallback | Original untranslated GXT draw. | Earlier local runtime screenshot recorded native English fallback key 1117; not repeated after the latest text-only edits. | Previously visually tested; not re-tested now. |
| Static GitHub Pages package | Upstream has a static build script; it downloads game data in each player's browser. | Fixed asset allowlist so Hebrew JSON/font ship; built `build/pages` locally and scanned for game-data file types. | Build succeeded (50 files, 2.6 MB); no game data was packaged. Nothing was published. |

## Translation QA counts

- Source inventory snapshot (2026-11-04): 1,158 script-referenced brief IDs; 1,154 contain text and four contain `DEAD BRIEF` placeholder text. Later source review found candidate SCR references to those keys, so “unused” is not established; see the current `mission-coverage.md` for the updated inventory method.
- Key coverage: 1,154/1,154 text-bearing messages translated and matched to original GXT IDs; all 34 title IDs matched to the original GXT.
- Independent linguistic/context review in this final pass: 14 full brief messages and 34 title/objective pairs. The catalog's 1,154 `context-reviewed` flags are metadata and are not reported as 1,154 new human reviews.
- Runtime display: five injected messages visually checked across the three districts; one brief and one title observed in a genuine Downtown mission. This does not establish that all conditional branches were seen.
- Automated checks: original GXT parsing, source inventory, translation placeholders/IDs, 80 name forms across 1,154 entries, 34 title sources, and exact-key runtime fallback.

See [mission-coverage.md](mission-coverage.md) and [mission-context-review.md](mission-context-review.md) for the detailed counts and language review.
