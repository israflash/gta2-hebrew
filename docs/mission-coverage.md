# Mission message coverage audit

Generated from local original game data on 2026-11-10. The source scripts reference 1179 unique face-marked GXT IDs; 1175 contain message text, while four are DEAD BRIEF placeholders referenced by script-indexing candidates. Their runtime reachability is not assumed. The 1175 text-bearing IDs come from compiled .scr commands DISPLAY_BRIEF, DISPLAY_BRIEF_NOW, DISPLAY_BRIEF_SOON, or PHONE_TEMPLATE in the three district script trees. It includes objective prompts, progression/failure prompts, and gang phone brief text; it is a broad upper bound for task-relevant language, not 1179 distinct story openings. One DISPLAY_MESSAGE reference overlaps key 1244, which is also a translated mission brief.

Context-review coverage is read from translation-review.csv, where evidence for a reviewed sequence covers its member briefs; this does not claim each row was independently retranslated. The inventory scans local source scripts statically and does not claim each conditional/phone message was seen in a live playthrough. Matching is by (district, GXT key), not by approximate English text.

| Measure | Count |
|---|---:|
| Script-referenced brief GXT IDs including placeholders | 1179 |
| Original text-bearing brief messages | 1175 |
| Translated and matched to source key | 1175 |
| Brief records covered by contextual review (sequence-level evidence may apply) | 1175 |
| Displayed and inspected through the engine's local runtime injection harness | 5 |
| Displayed and inspected during an actual mission | 1 |
| Untranslated fallback messages visually confirmed in original English | 1 |
| Pause/main-menu UI states visually inspected | 2 |
| Untranslated | 0 |
| Translation display not visually verified | 1169 |
| Non-text DEAD BRIEF placeholders (runtime reachability unverified) | 4 |
| DISPLAY_MESSAGE keys also referenced as mission brief (already translated) | 2 |

| District | Original keys | Translated | Missing |
|---|---:|---:|---:|
| Downtown | 370 | 370 | 0 |
| Residential | 310 | 310 | 0 |
| Industrial District | 495 | 495 | 0 |

## Interpretation and limits

Static translation coverage is 100%; this does not certify visual display or full gameplay acceptance. The catalog contains 1175 unique records and 1175 rows marked context-reviewed against 1175 text-bearing brief keys. The engine-native injection harness queues a real GXT key through Hud_Brief_704, but only entries recorded as displayed-and-inspected count above. The simulated display count represents engine-queue injection and screenshot inspection, not a mission script run. Visual checks used one isolated headless Chrome process. Injected checks use the local ?devdata&autostart&brief-test=... hook, which calls gta2_dev_show_brief and queues original GXT keys through Hud_Brief_704. The title test uses ?mission-title-test=1975 and validates the title canvas. The real Downtown mission check used ?devdata&autostart with no brief-test keys, then the original Yakuza phone/game flow; mission flag, GXT 1631, and title key 1975 were observed during the native title timing. The original title glyphs were suppressed and the Hebrew canvas banner was visible in the genuine mission screenshot. Keys 1600, 2306, 2026, 3727, and 1251 were injected and visually inspected across the three areas. The untranslated fallback, pause state, and main menu were also inspected. No live mission was played in Residential or Industrial District. Screenshots are local ignored QA artifacts and are not included in the public build. The script inventory also cannot prove runtime reachability of branches; conditional messages still need in-game exercise before they can be counted as seen.
