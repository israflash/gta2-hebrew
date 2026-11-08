# Mission brief visual matching

The Hebrew mission layer is drawn in the existing game brief area, at the same time as the original portrait. It has no panel background or border. The browser port suppresses only the original text draw for a translated active brief; the portrait, audio, mission timing, and original English fallback remain part of the game renderer.

## Findings from the original renderer

- GTA2's STY files store the game font as sprite glyphs, with per-glyph dimensions and font base/spacing data. The font is not a normal TrueType font. The standard brief renderer uses the game's brief font and draws its text from the HUD position beside the portrait. Hebrew glyphs are not present in the original font atlas, so using STY glyphs directly for Hebrew is not possible without making a new sprite atlas and character mapping.
- In the original brief renderer, `#` toggles the text remap between the normal brief palette and the highlight palette. Original mission text is gold/bronze by default; marked runs use the blue remap. The browser renderer keeps this inline distinction by mapping the source marker sequence to translated phrase runs. Where the translation record supplies an explicit `highlights` phrase, it uses that phrase rather than guessing a translated word boundary.
- The existing engine draw path owns message timing and portrait display. The HTML text is positioned from the game viewport and the native brief's x/width budget; the width is also limited to avoid the minimap. Longer text wraps in place above the lower HUD controls.

## Hebrew font and palette

Current shipped font stacks are:

- `ImpactfulBits.ttf` (`GTA2 Impact Pixel`) is the primary face for translated briefs, native GXT/HUD text, and Hebrew start-menu labels. It is blocky and legible at the actual game size.
- `gta2-sevenish-he.ttf` (`GTA2 Brief Pixel`) is the bundled Hebrew-capable Sevenish subset and the fallback face in those stacks. It contains Latin, Hebrew, and the punctuation needed by the text layer (18,252 bytes); the MIT license is included.
- `NotoSansHebrew-Black.ttf` (`GTA2 Noto Title`) draws the large Hebrew mission-title banner in `map.js`.

The outer website uses Bungee for decorative headings/buttons and `system-ui` for ordinary page text; those faces are not used in the game viewport. ImpactfulBits and Noto Sans Hebrew licenses are included in the font bundle. The mission brief has a dark edge shadow matching the source game's outline treatment. Gold and blue use sampled visual matches to the original brief colors; Hebrew glyphs cannot exactly match the STY sprites.

Earlier 1200×800 comparisons tested Sevenish, Pixelated Elegance, and SG Fonts' Narrow Pixel with the same source message, portrait, colors, and timing. Sevenish was clearer than the two temporary alternatives, but later in-game review selected ImpactfulBits as the primary face for its cleaner, squarer Hebrew at the rendered size. Sevenish remains only as a fallback. No Hebrew glyphs were redrawn.

Current brief text uses `clamp(24px, 3.15vh, 27px)`, 1.28 line-height, normal letter spacing, and `.12em` word spacing. The separate GXT/HUD text layer uses `-.015em` letter spacing. Both stay in the original HUD area and wrap at whole words; the three-line sample fits above the lower controls and clear of the minimap. These browser fonts and spacing remain approximations of the game's STY bitmap font.

Hebrew briefs are right-aligned, and the native speaker portrait is mirrored to the right edge. The text width is capped to leave a visible gap before the portrait and the minimap. A long message wraps by whole words into three readable lines in the 1200x800 screenshot.

## Mission title banners

The local title catalog contains 34 translated GXT title keys, including key 1975 `GET ZITZAKI!` as `חילוץ זיטזאקי!`. The Canvas renderer uses Noto Sans Hebrew Black (`GTA2 Noto Title`) with the source gold/orange gradient, purple edge, and shadow at the original centered banner position. Its context sets `direction = 'rtl'`, so punctuation follows the Unicode Bidirectional Algorithm instead of manual string reversal. The `!` appears at the left visual end. The QA path also checked `?`, commas, colon, parentheses, a number, and embedded `Yakuza`/`50`. Exact title strings are suppressed in the native draw only when they match the catalog. The real Yakuza phone mission and test title were visually checked; the brief portrait remains visible.

The name pass removed the remaining English dialogue forms for Yutes/Yute, Lefty, City University, and Casino. These now appear as היוטס/יוט, לפטי, אוניברסיטת סיטי, and קזינו. Vehicle labels and game targets remain in their recognizable Latin spelling.

The real Yakuza mission title was captured while its native HUD draw was active. The title key probe observed 1975 during the original banner timing; a screenshot taken after the original title timer expires correctly shows no banner. The live localized title is documented at `real-downtown-mission-title.png`.

Source references: [GXT format notes](https://github.com/danielmarschall/gta_lang_converter/blob/main/GTA2/gta2_gxt_format.md), [STY format notes](https://gtamp.com/gta2/gta2-style-sty-graphics-file-format/), [GTA2 scripting reference](https://projectcerbera.com/gta/2/tutorials/scripting), and [Sevenish font source and license](https://github.com/SauceDLX/Sevenish).

## Visual checks

Screenshots are captured at 1200x800 using one local headless Chrome instance and the original engine's brief queue. The same source GXT 1251 was compared in Sevenish, Pixelated Elegance, and Narrow Pixel. The English view is the original native renderer. See `game/qa-screenshots/font-compare-english-native.png`, `font-compare-hebrew-after.png`, `font-compare-PixelatedElegance.png`, and `font-compare-NarrowPixel.png`. The title punctuation before/after pair is `bidi-title-before.png` and `bidi-title-1.png`; additional tests are `bidi-title-2.png` through `bidi-title-4.png`. Other screenshots cover short and mixed-number messages, a long message, untranslated English fallback, portrait, and menu/pause transitions.

The wrapped Downtown screenshot confirms that long Hebrew copy remains legible beside its portrait and above the page controls without covering the minimap. One live Downtown mission brief is also captured in `real-downtown-mission.png`. `mission-title-1975.png` shows the injected title and `real-downtown-mission-title.png` shows it during a genuine job. At 1200×800, the original English Play submenu and the Hebrew submenu were compared: both retain the native red selected text, and Hebrew adds a small red left-pointing cursor beside the selected row so the choice is explicit. Keyboard navigation moves both indicators together; English mode has no Hebrew text layer. The local QA screenshots are in `build/qa-secondary-menu-after/` and are not part of the public package. Letterforms and exact STY spacing remain browser approximations; full-screen behavior and natural mission progress still have separate verification limits.
