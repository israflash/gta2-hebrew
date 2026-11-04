# Mission brief visual matching

The Hebrew mission layer is drawn in the existing game brief area, at the same time as the original portrait. It has no panel background or border. The browser port suppresses only the original text draw for a translated active brief; the portrait, audio, mission timing, and original English fallback remain part of the game renderer.

## Findings from the original renderer

- GTA2's STY files store the game font as sprite glyphs, with per-glyph dimensions and font base/spacing data. The font is not a normal TrueType font. The standard brief renderer uses the game's brief font and draws its text from the HUD position beside the portrait. Hebrew glyphs are not present in the original font atlas, so using STY glyphs directly for Hebrew is not possible without making a new sprite atlas and character mapping.
- In the original brief renderer, `#` toggles the text remap between the normal brief palette and the highlight palette. Original mission text is gold/bronze by default; marked runs use the blue remap. The browser renderer keeps this inline distinction by mapping the source marker sequence to translated phrase runs. Where the translation record supplies an explicit `highlights` phrase, it uses that phrase rather than guessing a translated word boundary.
- The existing engine draw path owns message timing and portrait display. The HTML text is positioned from the game viewport and the native brief's x/width budget; the width is also limited to avoid the minimap. Longer text wraps in place above the lower HUD controls.

## Hebrew font and palette

The project bundles a small subset of Sevenish, a Hebrew-capable 7-pixel bitmap-style typeface, under its MIT license. The subset contains only Latin, Hebrew, and punctuation required by the brief layer (18,252 bytes), keeping page weight low. It is used only for translated mission briefs. A dark one-pixel edge shadow follows the source game's dark outline/shadow treatment. Gold and blue use sampled visual matches to the original brief colors; the Hebrew letters themselves cannot exactly match the original STY sprites.

I compared Sevenish with Pixelated Elegance and SG Fonts' Narrow Pixel in the live brief layer, at the same 1200x800 viewport, source message, 19.2px size, colors, portrait, and timing. Sevenish remained clearest overall and wrapped the long sample into three readable lines. Pixelated Elegance wrapped it into four and its thinner strokes were harder to read at the in-game size. Narrow Pixel wrapped it into two lines but its Hebrew glyphs were visibly too small and light. Only Sevenish ships; the alternatives were temporary QA fonts. I did not redraw Sevenish glyphs because neither tested replacement improved legibility in the actual game view, and manual glyph edits would need their own visual regression pass.

The final brief tracking is -0.02em, with word spacing at 0.11em. The 19.2px text stays within the original HUD region and preserves the three-line long-message sample. These small spacing changes clarify word boundaries while keeping the line width compact. Sevenish remains pixel styled, but its Hebrew forms still look more hand-drawn than the game's original block glyphs.

Hebrew briefs are right-aligned, and the native speaker portrait is mirrored to the right edge. The text width is capped to leave a visible gap before the portrait and the minimap. A long message wraps by whole words into three readable lines in the 1200x800 screenshot.

## Mission title banners

The local title catalog contains 34 translated GXT title keys, including key 1975 `GET ZITZAKI!` as `חילוץ זיטזאקי!`. A pixelated canvas renderer reproduces the original gold/orange fill, purple edge and shadow at the original centered banner position. Its canvas context now explicitly uses `direction = 'rtl'`, so punctuation follows the Unicode Bidirectional Algorithm instead of manual string reversal. The `!` appears at the left visual end of the title. The QA path also checked `?`, commas, colon, parentheses, a number, and an embedded `Yakuza`/`50`. I hooked exact title strings at the shared HUD text draw, so the original glyphs are suppressed only when they match a catalogued mission title. Both the test hook and the real Yakuza phone mission were visually checked; the live title is Hebrew and the brief portrait remains visible.

The name pass removed the remaining English dialogue forms for Yutes/Yute, Lefty, City University, and Casino. These now appear as היוטס/יוט, לפטי, אוניברסיטת סיטי, and קזינו. Vehicle labels and game targets remain in their recognizable Latin spelling.

The real Yakuza mission title was captured while its native HUD draw was active. The title key probe observed 1975 during the original banner timing; a screenshot taken after the original title timer expires correctly shows no banner. The live localized title is documented at `real-downtown-mission-title.png`.

Source references: [GXT format notes](https://github.com/danielmarschall/gta_lang_converter/blob/main/GTA2/gta2_gxt_format.md), [STY format notes](https://gtamp.com/gta2/gta2-style-sty-graphics-file-format/), [GTA2 scripting reference](https://projectcerbera.com/gta/2/tutorials/scripting), and [Sevenish font source and license](https://github.com/SauceDLX/Sevenish).

## Visual checks

Screenshots are captured at 1200x800 using one local headless Chrome instance and the original engine's brief queue. The same source GXT 1251 was compared in Sevenish, Pixelated Elegance, and Narrow Pixel. The English view is the original native renderer. See `game/qa-screenshots/font-compare-english-native.png`, `font-compare-hebrew-after.png`, `font-compare-PixelatedElegance.png`, and `font-compare-NarrowPixel.png`. The title punctuation before/after pair is `bidi-title-before.png` and `bidi-title-1.png`; additional tests are `bidi-title-2.png` through `bidi-title-4.png`. Other screenshots cover short and mixed-number messages, a long message, untranslated English fallback, portrait, and menu/pause transitions.

The wrapped Downtown screenshot confirms that long Hebrew copy remains legible beside its portrait and above the page controls without covering the minimap. One live Downtown mission brief is also captured in `real-downtown-mission.png`. `mission-title-1975.png` shows the injected title and `real-downtown-mission-title.png` shows the title during a genuine job. The translation uses a compact bitmap face and original-style colors, but letter shapes, exact STY spacing, and some menu label rendering remain browser approximations. Fullscreen behavior and live jobs in Residential/Industrial have not been verified.
