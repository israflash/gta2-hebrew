#!/usr/bin/env node
const assert = require('node:assert/strict');

async function main() {
  const { gangDisplayName } = await import('../web/gang-names.js');
  const names = new Map([
    ['Zaibatsu', 'זייבאצו'],
    ['Loonies', 'לוניז'],
    ['Yakuza', 'יאקוזה'],
    ['Rednecks', 'רדנקס'],
    ['SRS Scientists', 'מדעני SRS'],
    ['Russians', 'רוסים'],
    ['Hare Krishnas', 'קרישנה'],
  ]);
  for (const [english, hebrew] of names) {
    assert.equal(gangDisplayName(english, 'he'), hebrew, `${english} Hebrew display`);
    assert.equal(gangDisplayName(english, 'en'), english, `${english} English display`);
  }
  assert.equal(gangDisplayName('Friends of Alice', 'he'), 'Friends of Alice', 'custom name is preserved');
  assert.equal(gangDisplayName('', 'he'), '', 'empty name is preserved');
  const root = require('node:path').join(__dirname, '..', 'web');
  for (const [file, marker] of [
    ['landing.js', 'gangDisplayName(c.lastGang, lang())'],
    ['shell.js', 'gangDisplayName(label, currentLang())'],
    ['shell.js', 'gangDisplayName(c.gang, currentLang())'],
    ['map.js', 'gangDisplayName(p.gang, lang())'],
  ]) {
    assert.ok(require('node:fs').readFileSync(require('node:path').join(root, file), 'utf8').includes(marker),
      `${file}: player-facing gang label must use localized display mapping`);
  }
  const mapSource = require('node:fs').readFileSync(require('node:path').join(root, 'map.js'), 'utf8');
  for (const label of [
    "'ui.map.speaker.scientists': 'מדענים'",
    "'ui.map.speaker.krishnas': 'קרישנה'",
    "'ui.map.speaker.russians': 'רוסים'",
  ]) assert.ok(mapSource.includes(label), `map gang name consistency: ${label}`);
  const catalog = JSON.parse(require('node:fs').readFileSync(require('node:path').join(root, 'gxt-gameplay.he.json'), 'utf8'));
  const russian = catalog.records.find((row) => row.key === 'ganga7');
  assert.equal(russian?.text, 'רוסים', 'pause-screen Russian gang name matches map and multiplayer labels');
  console.log(`test_gang_names: OK (${names.size} named gangs; custom names preserved)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
