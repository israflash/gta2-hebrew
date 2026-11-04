#!/usr/bin/env node
// Exercise the actual browser matching function against every local catalog row.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const root = path.join(__dirname, '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
  const extras = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-extras.he.json'), 'utf8'));
  const runtimeRecords = [...catalog.records, ...extras.records];
  let source = fs.readFileSync(path.join(root, 'web/missiontext.js'), 'utf8');
  source = source.replace("import { lang } from './strings.js';", "const lang = () => 'he';");
  source = source.replace('let records = [];', `let records = ${JSON.stringify(runtimeRecords)};`)
    .replace('let ready = false;', 'let ready = true;');
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  for (const row of runtimeRecords) {
    const result = mod.missionText(row.source, { gxtKey: row.gxtKey });
    assert.equal(result.translated, true, `not matched at runtime: ${row.area}/${row.gxtKey}`);
    const displayText = row.text.replace(/#([^#]*)#/g, '$1').replace(/#/g, '');
    assert.equal(result.text, displayText, `wrong runtime translation: ${row.area}/${row.gxtKey}`);
    assert.ok(!result.text.includes('#'), `GXT formatting markers leaked into displayed text: ${row.area}/${row.gxtKey}`);
    if (row.text.includes('#')) assert.ok(result.colorRuns.some((run) => run.highlighted), `GXT highlight color lost: ${row.area}/${row.gxtKey}`);
  }
  const first = catalog.records[0];
  const wrongKey = mod.missionText(first.source, { gxtKey: 'not-a-real-gxt-key' });
  assert.equal(wrongKey.translated, false, 'a source line must not bypass an unknown GXT key');
  for (const input of ['ⅲHey, Rooster! #Steal# the Pickup.', 'ⅮAn English #fallback# with 123']) {
    const normalized = mod.normalizeMissionText(input);
    assert.ok(normalized && !normalized.startsWith('ⅲ') && !normalized.startsWith('Ⅾ'));
  }
  console.log(`test_mission_runtime: OK (${runtimeRecords.length} exact GXT-key runtime matches including ${extras.records.length} supplemental active candidates; unknown keys fall back to English)`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
