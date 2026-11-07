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
  console.log('test_hebrew_bidi_interpolation: OK (dynamic values stay ordered in Hebrew and unchanged in English)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
