#!/usr/bin/env node
// Dynamic values in Hebrew UI copy should be isolated so room codes, counts,
// money, and English names keep their own direction and punctuation order.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'web', 'strings.js'), 'utf8');
  const strings = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  strings.registerDict({
    en: { room: 'Room {code}: {count} of 6 players.' },
    he: { room: 'חדר {code}: {count} מתוך 6 שחקנים.' },
  });
  strings.setLang('he');
  assert.equal(strings.t('room', { code: '3NKWKF', count: 2 }), 'חדר \u20683NKWKF\u2069: \u20682\u2069 מתוך 6 שחקנים.');
  assert.equal(strings.t('room', { code: 'A7B9', count: '12' }).split('\u2068').length - 1, 2,
    'every substituted value is isolated in Hebrew');
  strings.setLang('en');
  assert.equal(strings.t('room', { code: '3NKWKF', count: 2 }), 'Room 3NKWKF: 2 of 6 players.',
    'left-to-right UI text remains unchanged');

  const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'web', 'gamegxt.js'), 'utf8')
    .replace("import { lang } from './strings.js';", "const lang = () => 'he';");
  const renderer = await import(`data:text/javascript;base64,${Buffer.from(rendererSource).toString('base64')}`);
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'web', 'gxt-gameplay.he.json'), 'utf8'));
  const resolve = renderer.createGxtResolver(catalog.records);
  for (const gang of catalog.records.filter((row) => /^ganga[1-7]$/i.test(String(row.key)))) {
    assert.equal(resolve(`${gang.source} Jobs Passed: 2/5`), `משימות של ${gang.text} שהושלמו: 2/5`,
      `pause-menu gang label ${gang.key} is interpolated in Hebrew`);
  }
  assert.equal(resolve('Unknown Jobs Passed: 0/4'), 'משימות של Unknown שהושלמו: 0/4',
    'unknown dynamic values retain the original text');
  assert.equal(resolve('Toshi has left the game!'), 'השחקן Toshi יצא מהמשחק!',
    'unmapped dynamic player names retain their original value');
  assert.equal(resolve('PLAYER 0'), 'שחקן 0', 'the code-composed player-slot label is translated');
  assert.equal(resolve('PLAYER 5'), 'שחקן 5', 'the final supported player slot is translated');
  assert.equal(resolve('PLAYER 6'), null, 'unknown player-slot labels keep the English fallback');
  console.log('test_hebrew_bidi_interpolation: OK (dynamic values stay ordered in Hebrew and unchanged in English)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
