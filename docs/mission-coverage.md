# Mission message coverage audit

Generated from local original game data on 2026-11-04. The source scripts reference 1158 unique face-marked GXT IDs; 1154 contain message text, while four are unused DEAD BRIEF placeholders. The 1154 text-bearing IDs come from compiled .scr commands DISPLAY_BRIEF, DISPLAY_BRIEF_NOW, DISPLAY_BRIEF_SOON, or PHONE_TEMPLATE in the three district script trees. It includes objective prompts, progression/failure prompts, and gang phone brief text; it is a broad upper bound for task-relevant language, not 1,158 distinct story openings. One DISPLAY_MESSAGE reference overlaps key 1244, which is also a translated mission brief.

The inventory scans local source scripts statically; it does not claim each conditional/phone message was seen in a live playthrough. Matching is by (district, GXT key), not by approximate English text.

| Measure | Count |
|---|---:|
| Script-referenced brief GXT IDs including placeholders | 1158 |
| Original text-bearing brief messages | 1154 |
| Translated and matched to source key | 1154 |
| Catalog rows marked context-reviewed (metadata) | 1154 |
| Independently context-reviewed in this final pass | 14 full brief messages |
| Mission titles checked against objective sequence | 34 |
| Displayed and inspected through the engine's local runtime injection harness | 5 |
| Displayed and inspected during an actual mission | 1 |
| Untranslated fallback messages visually confirmed in original English | 1 |
| Pause/main-menu UI states visually inspected | 2 |
| Untranslated | 0 |
| Translation display not visually verified | 1148 |
| Unused DEAD BRIEF placeholders | 4 |
| DISPLAY_MESSAGE keys also referenced as mission brief (already translated) | 1 |

| District | Original keys | Translated | Missing |
|---|---:|---:|---:|
| Downtown | 358 | 358 | 0 |
| Residential | 304 | 304 | 0 |
| Industrial District | 492 | 492 | 0 |

## Interpretation and limits

Static translation coverage is 100%; this does not certify visual display or full gameplay acceptance. `reviewStatus: context-reviewed` is catalog metadata and must not be read as proof of 1,154 fresh human reviews. In the final pass, 14 complete briefs were independently checked against their source meaning and speaker/context, and all 34 translated title strings were checked against their mission objective sequence. See [mission-context-review.md](mission-context-review.md) for the reviewed examples and every title.

The engine-native injection harness queues real GXT keys through `Hud_Brief_704`; injection and screenshot inspection do not count as mission runs. Visual checks used one isolated headless Chrome profile. Injected checks use the local `?devdata&autostart&brief-test=...` hook, which calls `gta2_dev_show_brief` and queues original GXT keys through the game's HUD. The genuine Downtown mission check used `?devdata&autostart` with no brief-test keys, then the original Yakuza phone/game flow; the mission flag and GXT 1631 were read from the engine's job and brief state before screenshot inspection. The five inspected injected messages were keys 1600, 2306, 2026, 3727, and 1251; key 1631 was seen during the real Downtown mission. An untranslated fallback, pause state, and main menu were also inspected. No live mission was played in Residential or Industrial District. The source inventory cannot prove every conditional branch is reachable in an ordinary playthrough. Screenshots are local QA artifacts and are not included in the public build.
