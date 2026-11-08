#!/usr/bin/env node
// Regression coverage for semantic placement of native pickup labels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const file = path.join(__dirname, '..', 'web', 'gamegxt.js');
  const source = fs.readFileSync(file, 'utf8')
    .replace("import { lang } from './strings.js';", 'const lang = () => \'he\';');
  const { createGxtResolver, hudViewportCenter, isTopHudPickupBanner, isSelectedNativeMenuText } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'web', 'gxt-gameplay.he.json'), 'utf8'));
  const resolver = createGxtResolver([
    { key: 'c00', source: 'Pistol', text: 'אקדח' },
    { key: 'c01', source: 'S-Uzi Machine Gun', text: 'תת־מקלע S-Uzi' },
    { key: 'c28', source: 'Multiplier +1', text: 'מכפיל +1' },
    { key: 'mfail', source: 'JOB FAILED!', text: 'המשימה נכשלה!' },
    ...(catalog.directRecords || []),
  ]);

  for (const label of ['Pistol', 'S-Uzi Machine Gun', 'Multiplier +1']) {
    assert.equal(resolver.isPickupLabel(label), true, `${label} must use centered pickup placement`);
  }
  assert.equal(resolver.isPickupLabel('JOB FAILED!'), false, 'ordinary GXT text keeps native coordinates');
  assert.equal(resolver.isPickupLabel('Pistol '), true, 'pickup recognition tolerates native whitespace');
  assert.equal(resolver('Pistol'), 'אקדח', 'the original translation mapping remains intact');
  assert.equal(resolver('K.F.'), 'חיסול', 'the hard-coded Kill Frenzy HUD label uses its Hebrew localization');
  assert.equal(isTopHudPickupBanner(resolver.isPickupLabel('Pistol'), 112, 740), true,
    'a real top HUD weapon banner centers in the game viewport');
  assert.equal(isTopHudPickupBanner(resolver.isPickupLabel('Pistol'), 690, 740), false,
    'the same GXT weapon label inside a bottom speaker brief keeps its native position');
  assert.equal(isTopHudPickupBanner(resolver.isPickupLabel('JOB FAILED!'), 112, 740), false,
    'unrelated GXT text never receives pickup positioning');
  assert.equal(isSelectedNativeMenuText(17, 5), true,
    'the native selected font is carried into Hebrew submenu rows');
  assert.equal(isSelectedNativeMenuText(17, 4), false,
    'ordinary submenu rows keep the unselected palette');
  assert.equal(isSelectedNativeMenuText(1, 5), false,
    'the custom Hebrew main-menu overlay keeps its existing selection handling');
  assert.equal(isSelectedNativeMenuText(-1, 5), false,
    'selected-font text outside the native menu is not recolored');
  for (const [left, width, dpr, expected] of [
    [0, 1200, 1, 600],
    [13, 1334, 1, 680],
    [20, 1920, 2, 500],
    [0, 800, 1, 400],
  ]) {
    assert.equal(hudViewportCenter(left, width, dpr), expected,
      `pickup labels must use the actual viewport center at ${width}px / DPR ${dpr}`);
  }
  console.log('test_hud_gxt_placement: OK (semantic pickup labels use the actual viewport center across sizes and DPRs)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
