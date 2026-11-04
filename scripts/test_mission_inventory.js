#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'build/mission-inventory.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
const refs = new Set(inventory.messages.map((row) => `${row.area}:${row.gxtKey}`));
const seen = new Set();
for (const record of catalog.records) {
  const key = `${record.area}:${record.gxtKey}`;
  assert.ok(refs.has(key), `not present in original mission scripts: ${key}`);
  assert.ok(!seen.has(key), `duplicate translation for ${key}`);
  seen.add(key);
  const original = inventory.messages.find((row) => row.area === record.area && row.gxtKey === record.gxtKey);
  const clean = (value) => value.replace(/^[\u2160-\u2188]+\s*/, '').replace(/#([^#]*)#/g, '$1').replace(/#/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  assert.equal(clean(record.source), clean(original.source), `catalog source differs from GXT key ${key}`);
}
assert.deepEqual(inventory.sourceRoots.map((row) => [row.area, row.script]), [
  ['Downtown', 'wil.scr'], ['Residential', 'ste.scr'], ['Industrial District', 'bil.scr'],
]);
console.log(`test_mission_inventory: OK (${seen.size} translations matched original script GXT keys; ${inventory.counts.missionBriefKeys} brief IDs inventoried)`);
